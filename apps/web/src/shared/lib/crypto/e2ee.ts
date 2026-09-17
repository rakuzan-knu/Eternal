/**
 * Client-Side End-to-End Encryption (E2EE) Module
 *
 * Implemented with the standard Web Cryptography API (window.crypto.subtle):
 * - Key Exchange: ECDH (P-256 / prime256v1)
 * - Message Encryption: AES-GCM (256-bit) with unique cryptographically random IV per message
 *
 * The backend never has access to the private keys and only sees the ciphertext payload,
 * ensuring 100% confidentiality and zero server-side decryption overhead.
 */

import { WeakRefCache } from '@/shared/lib/v8/weakRefCache';

export interface E2eeV1Payload {
  e2ee: true;
  v: 1;
  iv: string; // Base64 12-byte IV
  ct: string; // Base64 ciphertext
}

/**
 * Authenticated associated data bound into every v2/v3 message. The values
 * ride the envelope in plaintext (so the receiver can reconstruct the AAD)
 * but are COVERED by AES-GCM: flipping any of them fails decryption.
 * - conversationId/senderId pin the message to its dialog and author
 *   (kills surreptitious forwarding between dialogs).
 * - senderDevice scopes replay tracking per sending device (two devices of
 *   one user run independent counters).
 * - seq is the sender's per-conversation monotonic counter (gap/replay).
 */
export interface MessageAad {
  readonly conversationId: string;
  readonly senderId: string;
  readonly senderDevice: string;
  readonly seq: number;
}

export interface E2eeV2Payload {
  e2ee: true;
  v: 2;
  iv: string;
  ct: string;
  /** Sender device id whose identity key the shared secret uses. */
  from: string;
  aad: MessageAad;
}

export interface WrappedContentKey {
  /** Base64 12-byte wrap IV. */
  iv: string;
  /** Base64 AES-GCM(sharedSecret, contentKey) with wrap binding as AAD. */
  k: string;
}

/**
 * Hybrid multi-device envelope: ONE content ciphertext plus a per-device
 * wrapped content key. Every addressed device (peer devices + the sender's
 * own, for history reads) unwraps with its own ECDH shared secret.
 */
export interface E2eeV3Payload {
  e2ee: true;
  v: 3;
  iv: string;
  ct: string;
  from: string;
  keys: Record<string, WrappedContentKey>;
  aad: MessageAad;
}

export interface DeviceKeyRef {
  readonly deviceId: string;
  readonly publicKeySpki: string;
}

/** Wire ceiling for detection; the backend enforces 8192 on the way in. */
export const E2EE_MAX_ENVELOPE_CHARS = 16384;

const STORAGE_KEY_PRIV = 'e2ee_private_key_jwk';
const STORAGE_KEY_PUB = 'e2ee_public_key_spki';

const IDB_NAME = 'e2ee-msg-identity';
const IDB_STORE = 'keys';
const IDB_RECORD = 'identity-v1';

/** In-memory fallback for runtimes without IndexedDB (SSR, jsdom tests, rare private modes). */
const memoryKeyStore = new Map<string, CryptoKeyPair>();

function openIdentityDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this runtime'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function idbLoad(db: IDBDatabase): Promise<CryptoKeyPair | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_RECORD);
    req.onsuccess = () => resolve(req.result as CryptoKeyPair | undefined);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
  });
}

function idbSave(db: IDBDatabase, pair: CryptoKeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(pair, IDB_RECORD);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** SHA-256 hex of UTF-8 text (replay-store message fingerprints). */
export async function sha256HexText(text: string): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Canonical AAD encoding. IDs are uuid/opaque strings without ':'; validated on parse. */
export function encodeMessageAad(version: 2 | 3, aad: MessageAad): string {
  return `e2ee-msg:${version}:${aad.conversationId}:${aad.senderId}:${aad.senderDevice}:${aad.seq}`;
}

/** AAD binding for a wrapped content key: sender device -> recipient device. */
function encodeWrapAad(from: string, recipientDeviceId: string): string {
  return `e2ee-wrap:3:${from}:${recipientDeviceId}`;
}

function isNonEmptyString(value: unknown, maxLen: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen;
}

function isB64Field(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 16384;
}

/**
 * Base64 field decoding to EXACTLY byteLength bytes. WebCrypto AES-GCM
 * readers require 12-byte IVs — enforcing at parse time maps malformed
 * envelopes to the locked label instead of rendering raw JSON as text.
 */
function isB64Bytes(value: unknown, byteLength: number): value is string {
  if (!isB64Field(value)) return false;
  try {
    return base64ToArrayBuffer(value).byteLength === byteLength;
  } catch {
    return false;
  }
}

function parseAad(value: unknown): MessageAad {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Malformed E2EE payload: bad aad');
  }
  const aad = value as Record<string, unknown>;
  if (
    !isNonEmptyString(aad.conversationId, 256) ||
    !isNonEmptyString(aad.senderId, 256) ||
    !isNonEmptyString(aad.senderDevice, 128) ||
    !Number.isInteger(aad.seq) ||
    (aad.seq as number) < 0 ||
    (aad.seq as number) > 2 ** 31 - 1
  ) {
    throw new Error('Malformed E2EE payload: bad aad fields');
  }
  return {
    conversationId: aad.conversationId,
    senderId: aad.senderId,
    senderDevice: aad.senderDevice,
    seq: aad.seq as number,
  };
}

export type ParsedEnvelope =
  | { v: 1; iv: string; ct: string }
  | { v: 2; iv: string; ct: string; from: string; aad: MessageAad }
  | {
      v: 3;
      iv: string;
      ct: string;
      from: string;
      keys: Record<string, WrappedContentKey>;
      aad: MessageAad;
    };

/** Strict structural parse of any envelope version. Throws on malformed input. */
export function parseEnvelope(body: string): ParsedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('Malformed E2EE payload: not JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Malformed E2EE payload: not an object');
  }
  const payload = parsed as Record<string, unknown>;
  if (payload.e2ee !== true || !isB64Bytes(payload.iv, 12) || !isB64Field(payload.ct)) {
    throw new Error('Malformed E2EE payload');
  }
  const iv = payload.iv;
  const ct = payload.ct;
  if (payload.v === 1) return { v: 1, iv, ct };
  if (payload.v === 2) {
    if (!isNonEmptyString(payload.from, 128)) throw new Error('Malformed E2EE v2 payload');
    return { v: 2, iv, ct, from: payload.from, aad: parseAad(payload.aad) };
  }
  if (payload.v === 3) {
    if (!isNonEmptyString(payload.from, 128)) throw new Error('Malformed E2EE v3 payload');
    if (!payload.keys || typeof payload.keys !== 'object' || Array.isArray(payload.keys)) {
      throw new Error('Malformed E2EE v3 payload: bad keys');
    }
    const keys = payload.keys as Record<string, unknown>;
    const names = Object.keys(keys);
    if (names.length === 0 || names.length > 10) {
      throw new Error('Malformed E2EE v3 payload: keys out of range');
    }
    const clean: Record<string, WrappedContentKey> = {};
    for (const name of names) {
      if (!isNonEmptyString(name, 128)) throw new Error('Malformed E2EE v3 payload: bad key id');
      const entry = keys[name] as Record<string, unknown>;
      if (!entry || !isB64Bytes(entry.iv, 12) || !isB64Field(entry.k)) {
        throw new Error('Malformed E2EE v3 payload: bad wrap');
      }
      clean[name] = { iv: entry.iv, k: entry.k };
    }
    return { v: 3, iv, ct, from: payload.from, keys: clean, aad: parseAad(payload.aad) };
  }
  throw new Error('Malformed E2EE payload: unknown version');
}

export class E2eeCryptoManager {
  private keyPair: CryptoKeyPair | null = null;
  private publicSpkiBase64: string | null = null;
  private readonly sharedKeyCache = new WeakRefCache<string, CryptoKey>('e2ee-shared-keys', 32);

  /**
   * Initializes or restores the client E2EE ECDH keypair.
   *
   * Storage ladder (first hit wins):
   *  1. In-memory instance (already initialized).
   *  2. IndexedDB, non-extractable (the steady state — XSS cannot export it).
   *  3. Legacy localStorage JWK (extractable): re-imported as NON-extractable
   *     (identity preserved, no rotation), then the localStorage copy is
   *     wiped to close the exfiltration window (M1 migration).
   *  4. Fresh non-extractable generation.
   * Runtimes without IndexedDB (SSR/tests) fall back to process memory and
   * warn once — keys then live only for the session.
   */
  async init(): Promise<{ publicKeySpki: string }> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      throw new Error('Web Cryptography API is not available in this environment');
    }
    if (this.keyPair && this.publicSpkiBase64) {
      return { publicKeySpki: this.publicSpkiBase64 };
    }

    const memoryHit = memoryKeyStore.get(IDB_RECORD);
    if (memoryHit) {
      this.keyPair = memoryHit;
      this.publicSpkiBase64 = await this.exportSpki(memoryHit.publicKey);
      return { publicKeySpki: this.publicSpkiBase64 };
    }

    try {
      const db = await openIdentityDb();
      try {
        const stored = await idbLoad(db);
        if (stored?.publicKey && stored?.privateKey) {
          this.keyPair = stored;
          this.publicSpkiBase64 = await this.exportSpki(stored.publicKey);
          return { publicKeySpki: this.publicSpkiBase64 };
        }
      } finally {
        db.close();
      }
    } catch {
      // No IndexedDB — continue down the ladder.
    }

    const migrated = await this.migrateLegacyLocalStorage();
    if (migrated) return migrated;

    const fresh = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey', 'deriveBits'],
    );
    await this.persistPair(fresh);
    this.keyPair = fresh;
    this.publicSpkiBase64 = await this.exportSpki(fresh.publicKey);
    return { publicKeySpki: this.publicSpkiBase64 };
  }

  private async exportSpki(publicKey: CryptoKey): Promise<string> {
    const exportedSpki = await window.crypto.subtle.exportKey('spki', publicKey);
    return arrayBufferToBase64(exportedSpki);
  }

  private async persistPair(pair: CryptoKeyPair): Promise<void> {
    try {
      const db = await openIdentityDb();
      try {
        await idbSave(db, pair);
        return;
      } finally {
        db.close();
      }
    } catch {
      if (!memoryKeyStore.has(IDB_RECORD)) {
        console.warn('[e2ee] IndexedDB unavailable — identity key lives in memory only');
      }
      memoryKeyStore.set(IDB_RECORD, pair);
    }
  }

  /**
   * M1 migration: legacy extractable JWK in localStorage is re-imported as
   * non-extractable (same identity, no rotation, peers unaffected), then the
   * localStorage private copy is destroyed. Returns null when no legacy key.
   */
  private async migrateLegacyLocalStorage(): Promise<{ publicKeySpki: string } | null> {
    let storedPriv: string | null = null;
    try {
      storedPriv = localStorage.getItem(STORAGE_KEY_PRIV);
    } catch {
      return null;
    }
    if (!storedPriv) return null;
    try {
      const jwk = JSON.parse(storedPriv) as JsonWebKey;
      const privateKey = await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false, // non-extractable from here on — closes the exfiltration hole
        ['deriveKey', 'deriveBits'],
      );
      // Rebuild the public half from x/y only (never trusts stored SPKI).
      const { d: _d, dp: _dp, dq: _dq, q: _q, qi: _qi, ...publicJwk } = jwk;
      const publicKey = await window.crypto.subtle.importKey(
        'jwk',
        { ...publicJwk, key_ops: [] },
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        [],
      );
      const pair = { privateKey, publicKey };
      await this.persistPair(pair);
      this.keyPair = pair;
      this.publicSpkiBase64 = await this.exportSpki(publicKey);
      try {
        localStorage.removeItem(STORAGE_KEY_PRIV);
        localStorage.removeItem(STORAGE_KEY_PUB);
      } catch {
        // Removal is best-effort; the key material itself already moved.
      }
      return { publicKeySpki: this.publicSpkiBase64 };
    } catch {
      // Corrupt legacy copy: fall through to fresh generation (rotates identity).
      return null;
    }
  }

  getPublicKeySpki(): string | null {
    return this.publicSpkiBase64;
  }

  /**
   * Derives or retrieves a cached AES-GCM shared symmetric key for a peer's public key.
   */
  async getSharedKey(peerPublicKeySpki: string): Promise<CryptoKey> {
    if (!this.keyPair) {
      await this.init();
    }

    const cached = this.sharedKeyCache.get(peerPublicKeySpki);
    if (cached) {
      return cached;
    }

    const peerKeyBuffer = base64ToArrayBuffer(peerPublicKeySpki);
    const importedPeerKey = await window.crypto.subtle.importKey(
      'spki',
      peerKeyBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    );

    const sharedKey = await window.crypto.subtle.deriveKey(
      { name: 'ECDH', public: importedPeerKey },
      this.keyPair!.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );

    this.sharedKeyCache.set(peerPublicKeySpki, sharedKey);
    return sharedKey;
  }

  /**
   * Encrypts plaintext using the derived AES-GCM shared key.
   */
  async encrypt(plaintext: string, sharedKey: CryptoKey): Promise<string> {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      enc.encode(plaintext),
    );

    const payload: E2eeV1Payload = {
      e2ee: true,
      v: 1,
      iv: arrayBufferToBase64(iv.buffer),
      ct: arrayBufferToBase64(cipherBuffer),
    };

    return JSON.stringify(payload);
  }

  /**
   * Decrypts an encrypted payload JSON string using the derived AES-GCM shared key.
   */
  async decrypt(encryptedJson: string, sharedKey: CryptoKey): Promise<string> {
    const parsed = parseEnvelope(encryptedJson);
    if (parsed.v !== 1) throw new Error('Expected a v1 E2EE payload');

    const iv = new Uint8Array(base64ToArrayBuffer(parsed.iv));
    const ciphertext = base64ToArrayBuffer(parsed.ct);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      ciphertext,
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  }

  private randomIv(): Uint8Array<ArrayBuffer> {
    return window.crypto.getRandomValues(new Uint8Array(12));
  }

  /**
   * Encrypts for ONE recipient device with dialog binding (v2). The shared
   * secret must already be the ECDH agreement of the sender identity with
   * the recipient device key referenced by `from` semantics on the read side.
   */
  async encryptV2(
    plaintext: string,
    sharedKey: CryptoKey,
    from: string,
    aad: MessageAad,
  ): Promise<string> {
    const aadBytes = new TextEncoder().encode(encodeMessageAad(2, aad));
    const iv = this.randomIv();
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aadBytes },
      sharedKey,
      new TextEncoder().encode(plaintext),
    );
    const payload: E2eeV2Payload = {
      e2ee: true,
      v: 2,
      iv: arrayBufferToBase64(iv.buffer),
      ct: arrayBufferToBase64(cipherBuffer),
      from,
      aad: { ...aad },
    };
    return JSON.stringify(payload);
  }

  /**
   * Decrypts a v2 envelope. The aad claims MUST match the receiver's own
   * context — a transplanted envelope (wrong dialog/author) fails here,
   * loudly, instead of misattributing plaintext.
   */
  async decryptV2(
    envelopeJson: string,
    sharedKey: CryptoKey,
    expected: { conversationId: string; senderId: string },
  ): Promise<{ text: string; aad: MessageAad }> {
    const parsed = parseEnvelope(envelopeJson);
    if (parsed.v !== 2) throw new Error('Expected a v2 E2EE payload');
    if (
      parsed.aad.conversationId !== expected.conversationId ||
      parsed.aad.senderId !== expected.senderId
    ) {
      throw new Error('E2EE dialog binding mismatch (possible transplant)');
    }
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(base64ToArrayBuffer(parsed.iv)),
        additionalData: new TextEncoder().encode(encodeMessageAad(2, parsed.aad)),
      },
      sharedKey,
      base64ToArrayBuffer(parsed.ct),
    );
    return { text: new TextDecoder().decode(decryptedBuffer), aad: parsed.aad };
  }

  /**
   * Hybrid multi-device encrypt (v3): one content ciphertext plus a
   * per-device wrapped content key. Recipients are peer device keys; the
   * sender's own device is wrapped automatically (history reads) and named
   * in `from`. Wrap AAD binds sender->recipient so wraps cannot be
   * transplanted between devices.
   */
  async encryptV3(
    plaintext: string,
    recipients: DeviceKeyRef[],
    opts: {
      from: string;
      ownPublicSpki: string;
      conversationId: string;
      senderId: string;
      seq: number;
    },
  ): Promise<string> {
    if (!this.keyPair) await this.init();
    const aad: MessageAad = {
      conversationId: opts.conversationId,
      senderId: opts.senderId,
      senderDevice: opts.from,
      seq: opts.seq,
    };
    const aadBytes = new TextEncoder().encode(encodeMessageAad(3, aad));
    const rawContentKey = window.crypto.getRandomValues(new Uint8Array(32));
    const contentKey = await window.crypto.subtle.importKey(
      'raw',
      rawContentKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt'],
    );
    const iv = this.randomIv();
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: aadBytes },
      contentKey,
      new TextEncoder().encode(plaintext),
    );

    // Self first: on device-id collision (exotic runtimes sharing an
    // ephemeral id) our own wrap must win, or history reads break.
    const targets: DeviceKeyRef[] = [
      { deviceId: opts.from, publicKeySpki: opts.ownPublicSpki },
      ...recipients,
    ];
    const keys: Record<string, WrappedContentKey> = {};
    for (const target of targets) {
      if (!target.deviceId || !target.publicKeySpki || keys[target.deviceId]) continue;
      const shared = await this.getSharedKey(target.publicKeySpki);
      const wrapIv = this.randomIv();
      const wrapped = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: wrapIv,
          additionalData: new TextEncoder().encode(encodeWrapAad(opts.from, target.deviceId)),
        },
        shared,
        rawContentKey,
      );
      keys[target.deviceId] = {
        iv: arrayBufferToBase64(wrapIv.buffer),
        k: arrayBufferToBase64(wrapped),
      };
    }
    if (!keys[opts.from]) throw new Error('E2EE v3 self-wrap failed');
    const payload: E2eeV3Payload = {
      e2ee: true,
      v: 3,
      iv: arrayBufferToBase64(iv.buffer),
      ct: arrayBufferToBase64(cipherBuffer),
      from: opts.from,
      keys,
      aad,
    };
    return JSON.stringify(payload);
  }

  /**
   * Hybrid multi-device decrypt (v3). Sender device keys arrive as arguments
   * (directory data, verified upstream); the private half is always local.
   */
  async decryptV3(
    envelopeJson: string,
    senderDevices: DeviceKeyRef[],
    opts: { ownDeviceId: string; conversationId: string; senderId: string },
  ): Promise<{ text: string; aad: MessageAad }> {
    if (!this.keyPair) await this.init();
    const parsed = parseEnvelope(envelopeJson);
    if (parsed.v !== 3) throw new Error('Expected a v3 E2EE payload');
    if (
      parsed.aad.conversationId !== opts.conversationId ||
      parsed.aad.senderId !== opts.senderId
    ) {
      throw new Error('E2EE dialog binding mismatch (possible transplant)');
    }
    const entry = parsed.keys[opts.ownDeviceId];
    if (!entry) throw new Error('E2EE v3 has no content-key wrap for this device');
    const sender = senderDevices.find((d) => d.deviceId === parsed.from);
    if (!sender) throw new Error('E2EE v3 sender device is unknown');
    const shared = await this.getSharedKey(sender.publicKeySpki);
    let rawContentKey: ArrayBuffer;
    try {
      rawContentKey = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(base64ToArrayBuffer(entry.iv)),
          additionalData: new TextEncoder().encode(encodeWrapAad(parsed.from, opts.ownDeviceId)),
        },
        shared,
        base64ToArrayBuffer(entry.k),
      );
    } catch {
      throw new Error('E2EE v3 content-key unwrap failed');
    }
    const contentKey = await window.crypto.subtle.importKey(
      'raw',
      rawContentKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(base64ToArrayBuffer(parsed.iv)),
        additionalData: new TextEncoder().encode(encodeMessageAad(3, parsed.aad)),
      },
      contentKey,
      base64ToArrayBuffer(parsed.ct),
    );
    return { text: new TextDecoder().decode(decryptedBuffer), aad: parsed.aad };
  }

  /**
   * Checks if a message body is a well-formed E2EE envelope (any version).
   * Parses instead of substring-sniffing (M3): a plaintext body merely
   * containing '"e2ee":true' must NOT mislabel.
   */
  isEncrypted(body?: string | null): boolean {
    if (!body || typeof body !== 'string') return false;
    const trimmed = body.trim();
    if (trimmed.length === 0 || trimmed[0] !== '{' || trimmed.length > E2EE_MAX_ENVELOPE_CHARS) {
      return false;
    }
    try {
      parseEnvelope(trimmed);
      return true;
    } catch {
      return false;
    }
  }
}

export const e2eeManager = new E2eeCryptoManager();
