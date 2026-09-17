/**
 * ECDH call key exchange (SFrame session keys done right).
 *
 * Replaces `deriveCallCryptoKey` (SHA-256 of the server-known callId — see
 * docs/security/E2EE_IMPLEMENTATION_AUDIT.md F1). Here each party generates
 * an ephemeral ECDH P-256 keypair per call, exchanges SPKI publics over the
 * existing call signaling, and derives an AES-256-GCM session key via
 * ECDH + HKDF-SHA256. The server relays only public keys and can never
 * compute the session key.
 *
 * Key schedule:
 *   sharedBits = ECDH(localEphemeralPriv, remoteEphemeralPub)   [32 bytes]
 *   session    = HKDF-SHA256(sharedBits, salt="e2ee-call-v1:"+callId,
 *                            info="e2ee-media-frame-v1", L=32)
 * SAS/fingerprint render from the HKDF output, so both sides display
 * identical values iff the exchange agreed — compare them out-of-band to
 * detect MITM (or verify the optional ECDSA binding signature instead).
 *
 * Platform: uses globalThis.crypto.subtle (browsers + Node 20+, hence
 * unit-testable in vitest). No DOM. No dependencies.
 */

import { SAS_EMOJI_TABLE } from './frameCrypto';

export interface CallSessionKeyInfo {
  /** Non-extractable AES-256-GCM key for frame encrypt/decrypt. */
  key: CryptoKey;
  fingerprint: string;
  sasCode: string;
  sasEmojis: string;
}

export const E2EE_HKDF_SALT_PREFIX = 'e2ee-call-v1:';
export const E2EE_HKDF_INFO = 'e2ee-media-frame-v1';

function subtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto subtle is unavailable in this runtime');
  return subtle;
}

function getRandomValues<T extends ArrayBufferView>(array: T): T {
  return globalThis.crypto.getRandomValues(array);
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa exists in browsers; Node 20+ also exposes it globally.
  if (typeof btoa === 'function') return btoa(binary);
  throw new Error('base64 encoding is unavailable in this runtime');
}

function base64Decode(b64: string): Uint8Array {
  const clean = b64.trim();
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0 || clean.length === 0) {
    throw new Error('ephemeral key is not valid base64');
  }
  let binary: string;
  if (typeof atob === 'function') {
    binary = atob(clean);
  } else {
    throw new Error('base64 decoding is unavailable in this runtime');
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Ephemeral ECDH P-256 keypair. Private key is non-extractable. */
export async function generateEphemeralKeypair(): Promise<CryptoKeyPair> {
  return subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveKey',
    'deriveBits',
  ]);
}

/** SPKI DER, base64 — the exact bytes that travel inside call signaling. */
export async function exportEphemeralPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await subtle().exportKey('spki', publicKey);
  return base64Encode(new Uint8Array(spki));
}

/** Rejects malformed/oversized blobs before they reach WebCrypto. */
export async function importEphemeralPublicKey(b64: string): Promise<CryptoKey> {
  const raw = base64Decode(b64);
  // P-256 SPKI DER is 91 bytes; allow slack for encoding variants, never megabytes.
  if (raw.length < 32 || raw.length > 2048) {
    throw new Error('ephemeral key has invalid length');
  }
  return subtle().importKey(
    'spki',
    raw as unknown as BufferSource,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );
}

function sasFromBytes(bytes: Uint8Array): {
  sasCode: string;
  sasEmojis: string;
  fingerprint: string;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const num1 = (view.getUint16(0) % 900) + 100;
  const num2 = (view.getUint16(2) % 900) + 100;
  const sasCode = `${num1}-${num2}`;
  const e1 = SAS_EMOJI_TABLE[view.getUint8(4) % SAS_EMOJI_TABLE.length];
  const e2 = SAS_EMOJI_TABLE[view.getUint8(5) % SAS_EMOJI_TABLE.length];
  const e3 = SAS_EMOJI_TABLE[view.getUint8(6) % SAS_EMOJI_TABLE.length];
  const e4 = SAS_EMOJI_TABLE[view.getUint8(7) % SAS_EMOJI_TABLE.length];
  const sasEmojis = `${e1} ${e2} ${e3} ${e4}`;
  const hex = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase();
  return { sasCode, sasEmojis, fingerprint: `SHA256:${hex}` };
}

/**
 * Derives the call session key. Both parties MUST pass the same callId —
 * it binds the session to the call (different calls never share keys even
 * if ephemerals were ever reused).
 */
export async function deriveCallSessionKey(
  localPrivateKey: CryptoKey,
  remotePublicKeyB64: string,
  callId: string,
): Promise<CallSessionKeyInfo> {
  if (!callId || typeof callId !== 'string')
    throw new Error('callId is required for key derivation');
  const remotePublicKey = await importEphemeralPublicKey(remotePublicKeyB64);

  const sharedBits = await subtle().deriveBits(
    { name: 'ECDH', public: remotePublicKey },
    localPrivateKey,
    256,
  );
  const salt = new TextEncoder().encode(`${E2EE_HKDF_SALT_PREFIX}${callId}`);
  const info = new TextEncoder().encode(E2EE_HKDF_INFO);
  const hkdfKey = await subtle().importKey('raw', sharedBits, { name: 'HKDF' }, false, [
    'deriveBits',
  ]);
  const sessionBits = new Uint8Array(
    await subtle().deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: salt as unknown as BufferSource,
        info: info as unknown as BufferSource,
      },
      hkdfKey,
      256,
    ),
  );

  const key = await subtle().importKey(
    'raw',
    sessionBits as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
  const { sasCode, sasEmojis, fingerprint } = sasFromBytes(sessionBits);
  // Best-effort memory hygiene: shared secret copies cannot be wiped inside
  // WebCrypto, but our own copies can.
  sessionBits.fill(0);
  new Uint8Array(sharedBits).fill(0);
  return { key, fingerprint, sasCode, sasEmojis };
}

/** 16 random bytes, base64 — drop-in salt rotation helper (NOT a key). */
export function generateCallSalt(): string {
  return base64Encode(getRandomValues(new Uint8Array(16)));
}

/**
 * Optional MITM hardening: bind an ephemeral key to a long-term identity
 * (e.g. a key from the backend E2EE directory) with ECDSA P-256/SHA-256.
 */
export async function signEphemeralBinding(
  identityPrivateKey: CryptoKey,
  ephemeralPublicKeyB64: string,
): Promise<string> {
  const data = new TextEncoder().encode(`e2ee-bind-v1:${ephemeralPublicKeyB64}`);
  const sig = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, identityPrivateKey, data);
  return base64Encode(new Uint8Array(sig));
}

export async function verifyEphemeralBinding(
  identityPublicKey: CryptoKey,
  ephemeralPublicKeyB64: string,
  signatureB64: string,
): Promise<boolean> {
  try {
    const data = new TextEncoder().encode(`e2ee-bind-v1:${ephemeralPublicKeyB64}`);
    const sig = base64Decode(signatureB64);
    return await subtle().verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      identityPublicKey,
      sig as unknown as BufferSource,
      data,
    );
  } catch {
    return false;
  }
}
