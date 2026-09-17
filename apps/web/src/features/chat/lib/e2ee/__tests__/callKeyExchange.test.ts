import { describe, expect, it } from 'vitest';
import {
  deriveCallSessionKey,
  exportEphemeralPublicKey,
  generateEphemeralKeypair,
  importEphemeralPublicKey,
  signEphemeralBinding,
  verifyEphemeralBinding,
} from '../callKeyExchange';

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const unhex = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};

describe('ECDH call key exchange', () => {
  it('RFC 5869 HKDF-SHA-256 Test Case 1 anchors our HKDF wiring', async () => {
    // Independent anchor: if WebCrypto HKDF is ever miswired, this fails first.
    const ikm = new Uint8Array(22).fill(0x0b);
    const salt = unhex('000102030405060708090a0b0c');
    const info = unhex('f0f1f2f3f4f5f6f7f8f9');
    const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
    const okm = new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: salt as unknown as BufferSource,
          info: info as unknown as BufferSource,
        },
        key,
        336,
      ),
    );
    expect(hex(okm)).toBe(
      '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
    );
  });

  it('both parties derive identical session keys, fingerprints and SAS', async () => {
    const alice = await generateEphemeralKeypair();
    const bob = await generateEphemeralKeypair();
    expect(alice.privateKey.extractable).toBe(false);

    const alicePub = await exportEphemeralPublicKey(alice.publicKey);
    const bobPub = await exportEphemeralPublicKey(bob.publicKey);

    const a = await deriveCallSessionKey(alice.privateKey, bobPub, 'call-123');
    const b = await deriveCallSessionKey(bob.privateKey, alicePub, 'call-123');

    expect(a.key.algorithm.name).toBe('AES-GCM');
    expect(a.key.extractable).toBe(false);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.sasCode).toBe(b.sasCode);
    expect(a.sasEmojis).toBe(b.sasEmojis);
    expect(a.sasCode).toMatch(/^\d{3}-\d{3}$/);
    expect(a.sasEmojis.split(' ')).toHaveLength(4);
  });

  it('different calls and tampered peers give different keys', async () => {
    const alice = await generateEphemeralKeypair();
    const bob = await generateEphemeralKeypair();
    const mallory = await generateEphemeralKeypair();
    const bobPub = await exportEphemeralPublicKey(bob.publicKey);
    const malloryPub = await exportEphemeralPublicKey(mallory.publicKey);

    const legit = await deriveCallSessionKey(alice.privateKey, bobPub, 'call-123');
    const wrongPeer = await deriveCallSessionKey(alice.privateKey, malloryPub, 'call-123');
    const otherCall = await deriveCallSessionKey(alice.privateKey, bobPub, 'call-456');

    expect(wrongPeer.fingerprint).not.toBe(legit.fingerprint);
    expect(otherCall.fingerprint).not.toBe(legit.fingerprint);
  });

  it('rejects invalid inputs without leaking', async () => {
    const alice = await generateEphemeralKeypair();
    await expect(importEphemeralPublicKey('!!!not-base64!!!')).rejects.toThrow();
    await expect(importEphemeralPublicKey('')).rejects.toThrow();
    await expect(importEphemeralPublicKey(btoa('short'))).rejects.toThrow();
    await expect(
      deriveCallSessionKey(alice.privateKey, await exportEphemeralPublicKey(alice.publicKey), ''),
    ).rejects.toThrow();
  });

  it('ephemeral export/import roundtrip preserves the key', async () => {
    const pair = await generateEphemeralKeypair();
    const b64 = await exportEphemeralPublicKey(pair.publicKey);
    const back = await importEphemeralPublicKey(b64);
    expect(back.type).toBe('public');
    expect(back.algorithm.name).toBe('ECDH');
  });

  it('ECDSA binding signature verifies only with the right identity key', async () => {
    const idA = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const idB = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const eph = await generateEphemeralKeypair();
    const ephPub = await exportEphemeralPublicKey(eph.publicKey);

    const sig = await signEphemeralBinding(idA.privateKey, ephPub);
    expect(await verifyEphemeralBinding(idA.publicKey, ephPub, sig)).toBe(true);
    expect(await verifyEphemeralBinding(idB.publicKey, ephPub, sig)).toBe(false);
    expect(await verifyEphemeralBinding(idA.publicKey, ephPub + 'A', sig)).toBe(false);
  });
});
