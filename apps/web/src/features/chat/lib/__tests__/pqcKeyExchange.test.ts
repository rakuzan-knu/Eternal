import { describe, it, expect } from 'vitest';
import {
  generateHybridKeypair,
  encapsulateHybrid,
  derivePQCCallKey,
  polyMul,
  ML_KEM_PK_BYTES,
  ML_KEM_CIPHERTEXT_BYTES,
  ML_KEM_N,
  ML_KEM_Q,
} from '../e2ee/pqcKeyExchange';

describe('Post-Quantum Cryptography Hybrid Key Exchange (ML-KEM-768)', () => {
  it('performs polynomial ring multiplication over R_q = Z_q[X]/(X^256 + 1)', () => {
    const a = new Int16Array(ML_KEM_N);
    const b = new Int16Array(ML_KEM_N);
    a[0] = 3;
    b[0] = 5;
    const res = polyMul(a, b);
    expect(res[0]).toBe(15);
    expect(res[1]).toBe(0);

    // Test X^256 = -1 mod q
    const c = new Int16Array(ML_KEM_N);
    const d = new Int16Array(ML_KEM_N);
    c[200] = 2;
    d[100] = 4; // 200 + 100 = 300 = 256 + 44 -> -8 mod q
    const res2 = polyMul(c, d);
    expect(res2[44]).toBe((-8 + ML_KEM_Q) % ML_KEM_Q);
  });

  it('generates compliant ML-KEM-768 hybrid keypairs with exact wire dimensions', async () => {
    const keypair = await generateHybridKeypair();

    expect(keypair.pqcPublicKey.length).toBe(ML_KEM_PK_BYTES); // 1184 bytes
    expect(keypair.classicalPublicKey.length).toBe(32); // 32 bytes (X25519/ECDH)
    expect(keypair.fingerprint).toMatch(/^ML-KEM-768:[0-9A-F:]+$/);
  });

  it('encapsulates hybrid shared secret returning valid ciphertext format', async () => {
    const aliceKeypair = await generateHybridKeypair();

    const bobEncaps = await encapsulateHybrid(
      aliceKeypair.pqcPublicKey,
      aliceKeypair.classicalPublicKey,
    );

    expect(bobEncaps.pqcCiphertext.length).toBe(ML_KEM_CIPHERTEXT_BYTES); // 1088 bytes
    expect(bobEncaps.classicalPublicKey.length).toBe(32);
    expect(bobEncaps.sharedSecret.length).toBe(32); // 256-bit hybrid shared secret
  });

  it('derives a quantum-resistant WebCrypto AES-GCM key with PQC fingerprint and SAS emojis', async () => {
    const keypair = await generateHybridKeypair();
    const encaps = await encapsulateHybrid(keypair.pqcPublicKey, keypair.classicalPublicKey);

    const callKeyInfo = await derivePQCCallKey('call-test-123', encaps.sharedSecret);

    expect(callKeyInfo.isPostQuantumProtected).toBe(true);
    expect(callKeyInfo.kemAlgorithm).toBe('ML-KEM-768');
    expect(callKeyInfo.dsaAlgorithm).toBe('ML-DSA-65');
    expect(callKeyInfo.fingerprint).toMatch(/^PQC-MLKEM768:[0-9A-F:]+$/);
    expect(callKeyInfo.sasCode).toMatch(/^\d{3}-\d{3}$/);
    expect(callKeyInfo.sasEmojis.split(' ').length).toBe(4);
    expect(callKeyInfo.key.algorithm.name).toBe('AES-GCM');
  });
});
