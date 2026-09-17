import { describe, it, expect } from 'vitest';
import vectors from '../vectors/v1.json';

/**
 * Golden KAT vectors for message-layer E2EE (repo vectors/ convention,
 * adapted: browser WebCrypto has no Rust counterpart, so enforcement is
 * single-side here).
 *
 * - aesGcm256CrossImpl: ciphertext produced by node:crypto (OpenSSL);
 *   WebCrypto must decrypt it AND reproduce it byte-identically (GCM is
 *   deterministic). Guards algorithm/IV/tag-layout regressions.
 * - ecdhP256Agreement: fixed keypairs; both directions must derive the
 *   stored shared secret.
 * - envelopeV1: fixed golden envelope; must parse per M3 and decrypt to
 *   the stored plaintext with the A-side derived key.
 *
 * NEVER hand-edit v1.json — regenerate via gen-e2ee-vectors.mjs.
 */

const hasSubtle = typeof window !== 'undefined' && Boolean(window.crypto?.subtle);

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(u8, (b) => b.toString(16).padStart(2, '0')).join('');
}

describe.runIf(hasSubtle)('E2EE golden vectors (v1)', () => {
  it('matches vectors/v1.json version contract', () => {
    expect(vectors.version).toBe(1);
  });

  it('decrypts and reproduces the OpenSSL AES-256-GCM anchor', async () => {
    const v = vectors.aesGcm256CrossImpl;
    const subtle = window.crypto.subtle;
    const key = await subtle.importKey('raw', hexToBytes(v.keyHex), { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
    const combined = new Uint8Array([...hexToBytes(v.ctHex), ...hexToBytes(v.tagHex)]);

    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: hexToBytes(v.ivHex) }, key, combined);
    expect(new TextDecoder().decode(plain)).toBe(v.plaintext);

    const reEnc = await subtle.encrypt(
      { name: 'AES-GCM', iv: hexToBytes(v.ivHex) },
      key,
      new TextEncoder().encode(v.plaintext),
    );
    expect(bytesToHex(reEnc)).toBe(v.ctHex + v.tagHex);
  });

  it('derives the stored ECDH shared secret in both directions', async () => {
    const v = vectors.ecdhP256Agreement;
    const subtle = window.crypto.subtle;
    const importPub = (hex: string) =>
      subtle.importKey('spki', hexToBytes(hex), { name: 'ECDH', namedCurve: 'P-256' }, true, []);
    const importPriv = (jwk: JsonWebKey) =>
      subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, [
        'deriveKey',
        'deriveBits',
      ]);
    const deriveHex = async (priv: CryptoKey, pub: CryptoKey) => {
      const key = await subtle.deriveKey(
        { name: 'ECDH', public: pub },
        priv,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );
      return bytesToHex(await subtle.exportKey('raw', key));
    };

    const [privA, pubA, privB, pubB] = await Promise.all([
      importPriv(v.partyA.privateJwk as JsonWebKey),
      importPub(v.partyA.publicSpkiHex),
      importPriv(v.partyB.privateJwk as JsonWebKey),
      importPub(v.partyB.publicSpkiHex),
    ]);
    await expect(deriveHex(privA, pubB)).resolves.toBe(v.sharedSecretHex);
    await expect(deriveHex(privB, pubA)).resolves.toBe(v.sharedSecretHex);
  });

  it('parses and decrypts the golden v1 envelope', async () => {
    const v = vectors.envelopeV1;
    const subtle = window.crypto.subtle;
    const parsed: unknown = JSON.parse(v.envelope);
    expect(parsed).toMatchObject({ e2ee: true, v: 1 });
    expect(typeof (parsed as { iv: unknown }).iv).toBe('string');
    expect(typeof (parsed as { ct: unknown }).ct).toBe('string');

    const agreement = vectors.ecdhP256Agreement;
    const privA = await subtle.importKey(
      'jwk',
      agreement.partyA.privateJwk as JsonWebKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits'],
    );
    const pubB = await subtle.importKey(
      'spki',
      hexToBytes(agreement.partyB.publicSpkiHex),
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      [],
    );
    const shared = await subtle.deriveKey(
      { name: 'ECDH', public: pubB },
      privA,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );
    const { iv, ct } = parsed as { iv: string; ct: string };
    const b64ToBytes = (b64: string): Uint8Array<ArrayBuffer> =>
      Uint8Array.from(window.atob(b64), (c) => c.charCodeAt(0));
    const plain = await subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(iv) },
      shared,
      b64ToBytes(ct),
    );
    expect(new TextDecoder().decode(plain)).toBe(v.plaintext);
  });
});
