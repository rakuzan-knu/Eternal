import { describe, expect, it } from 'vitest';
import {
  fingerprintIdentityKey,
  getPinnedFingerprint,
  importIdentityPublicKey,
  isPinnedMatch,
  pinIdentityKey,
} from '../identityKeys';
import { signEphemeralBinding, verifyEphemeralBinding } from '../callKeyExchange';

const b64 = (bytes: number[]): string => btoa(String.fromCharCode(...bytes));

describe('identity keys (TOFU pins + binding signatures)', () => {
  it('fingerprints with plain SHA-256 (known vector)', async () => {
    // base64('abc') -> SHA-256('abc')
    expect(await fingerprintIdentityKey('YWJj')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('pins roundtrip through localStorage and match case-insensitively', async () => {
    const userId = `usr-pin-${Date.now()}`;
    expect(getPinnedFingerprint(userId)).toBeNull();
    pinIdentityKey(userId, 'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD');
    expect(getPinnedFingerprint(userId)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await isPinnedMatch(userId, 'YWJj')).toBe(true);
    expect(await isPinnedMatch(userId, 'eHl6')).toBe(false);
    expect(await isPinnedMatch('nobody', 'YWJj')).toBe(false);
  });

  it('exports/imports identity publics and verifies bindings', async () => {
    const idA = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', idA.publicKey));
    const b64key = b64(Array.from(spki));
    const imported = await importIdentityPublicKey(b64key);
    expect(imported.type).toBe('public');

    const sig = await signEphemeralBinding(idA.privateKey, 'ZXBoZW1lcmFsLWtleQ==');
    expect(await verifyEphemeralBinding(imported, 'ZXBoZW1lcmFsLWtleQ==', sig)).toBe(true);
    expect(await verifyEphemeralBinding(imported, 'dGFtcGVyZWQ=', sig)).toBe(false);
  });

  it('rejects malformed identity keys and signatures', async () => {
    await expect(importIdentityPublicKey('!!!')).rejects.toThrow();
    await expect(importIdentityPublicKey(btoa('tiny'))).rejects.toThrow();
    const idA = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ]);
    // verifyEphemeralBinding never throws on garbage — returns false.
    expect(await verifyEphemeralBinding(idA.publicKey, 'eA==', '!!!')).toBe(false);
  });
});
