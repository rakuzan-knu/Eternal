import { describe, expect, it } from 'vitest';
import {
  deriveCallSessionKey,
  exportEphemeralPublicKey,
  generateEphemeralKeypair,
} from '../../e2ee/callKeyExchange';
import { getOrImportCryptoKey, processFrame } from '../workers/e2eeTransform.worker';

type Frame = { data: ArrayBuffer };

const makeFrame = (header: number[], payload: number[]): Frame => {
  const bytes = new Uint8Array([...header, ...payload]);
  return { data: bytes.buffer as ArrayBuffer };
};

const E2EE_TAG = 0xe2;
const LEGACY_TAG = 0x7e;

async function sessionPair() {
  const alice = await generateEphemeralKeypair();
  const bob = await generateEphemeralKeypair();
  const alicePub = await exportEphemeralPublicKey(alice.publicKey);
  const bobPub = await exportEphemeralPublicKey(bob.publicKey);
  const a = await deriveCallSessionKey(alice.privateKey, bobPub, 'call-test-1');
  const b = await deriveCallSessionKey(bob.privateKey, alicePub, 'call-test-1');
  return { a: a.key, b: b.key };
}

describe('e2ee worker frame roundtrip (ECDH session keys)', () => {
  it('encrypts with 0xe2 tag and decrypts back across parties', async () => {
    const { a, b } = await sessionPair();
    const header = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const payload = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const frame = makeFrame(header, payload);

    await processFrame(frame as never, 'encrypt', a, { index: 0 });
    const enc = new Uint8Array(frame.data);
    expect(enc[enc.length - 1]).toBe(E2EE_TAG);
    expect(enc.length).toBeGreaterThan(header.length + payload.length);

    await processFrame(frame as never, 'decrypt', b, { index: 0 });
    expect(Array.from(new Uint8Array(frame.data))).toEqual([...header, ...payload]);
  });

  it('uses a fresh random IV per frame', async () => {
    const { a } = await sessionPair();
    const f1 = makeFrame(new Array(10).fill(7), [1, 2, 3, 4, 5]);
    const f2 = makeFrame(new Array(10).fill(7), [1, 2, 3, 4, 5]);
    await processFrame(f1 as never, 'encrypt', a, { index: 0 });
    await processFrame(f2 as never, 'encrypt', a, { index: 0 });
    expect(Array.from(new Uint8Array(f1.data))).not.toEqual(Array.from(new Uint8Array(f2.data)));
  });

  it('still decrypts legacy 0x7e-tagged frames (mixed-version calls)', async () => {
    const { a, b } = await sessionPair();
    const frame = makeFrame(new Array(10).fill(1), [9, 9, 9, 9, 9]);
    await processFrame(frame as never, 'encrypt', a, { index: 0 });
    const enc = new Uint8Array(frame.data);
    enc[enc.length - 1] = LEGACY_TAG; // simulate an old worker sender
    await processFrame(frame as never, 'decrypt', b, { index: 0 });
    expect(Array.from(new Uint8Array(frame.data)).slice(0, 15)).toEqual([
      ...new Array(10).fill(1),
      9,
      9,
      9,
      9,
      9,
    ]);
  });

  it('drops frames that fail to decrypt with the wrong key', async () => {
    const { a } = await sessionPair();
    const mallory = await generateEphemeralKeypair();
    const frame = makeFrame(new Array(10).fill(2), [5, 6, 7, 8]);
    await processFrame(frame as never, 'encrypt', a, { index: 0 });
    const encrypted = Array.from(new Uint8Array(frame.data));
    await processFrame(frame as never, 'decrypt', mallory.privateKey as unknown as CryptoKey, {
      index: 0,
    });
    // Decryption with a non-AES key throws -> frame left untouched (still ciphertext).
    expect(Array.from(new Uint8Array(frame.data))).toEqual(encrypted);
  });

  it('getOrImportCryptoKey prefers a live key object over raw bytes', async () => {
    const { a } = await sessionPair();
    const viaLive = await getOrImportCryptoKey(a);
    expect(viaLive).toBe(a);
  });
});
