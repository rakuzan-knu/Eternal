import { describe, it, expect } from 'vitest';
import { ZKPIdentityManager, modExp, hashToModulo } from '../webrtc/zkpIdentity';

describe('ZKPIdentityManager', () => {
  it('correctly calculates modular exponentiation', () => {
    const res = modExp(2n, 10n, 1000n);
    expect(res).toBe(24n); // 1024 % 1000 = 24
  });

  it('hashes data into modulo correctly', async () => {
    const val = await hashToModulo('test-data', 100n);
    expect(val).toBeGreaterThanOrEqual(0n);
    expect(val).toBeLessThan(100n);
  });

  it('derives consistent credentials for a given user', async () => {
    const cred1 = await ZKPIdentityManager.deriveCredential('user-123', 'salt-abc');
    const cred2 = await ZKPIdentityManager.deriveCredential('user-123', 'salt-abc');
    expect(cred1.secretKey).toBe(cred2.secretKey);
    expect(cred1.publicKey).toBe(cred2.publicKey);
    expect(cred1.reputation).toBe(cred2.reputation);
  });

  it('generates a valid Schnorr Zero-Knowledge proof and verifies it successfully', async () => {
    const credential = await ZKPIdentityManager.deriveCredential('alice-verified', 'eternal-seed');
    const proof = await ZKPIdentityManager.generateProof(credential, 30, 'ShadowAgent');

    expect(proof.proofType).toBe('schnorr_membership');
    expect(proof.anonymousAlias).toBe('ShadowAgent');
    expect(proof.commitment).toBeTruthy();
    expect(proof.challenge).toBeTruthy();
    expect(proof.response).toBeTruthy();

    const verification = await ZKPIdentityManager.verifyProof(proof, credential.publicKey);
    expect(verification.valid).toBe(true);
    expect(verification.reason).toBeUndefined();
  });

  it('rejects tampered or forged zero-knowledge proofs', async () => {
    const credential = await ZKPIdentityManager.deriveCredential('alice-verified', 'eternal-seed');
    const proof = await ZKPIdentityManager.generateProof(credential, 30);

    // Tamper with response
    const tamperedProof = {
      ...proof,
      response: (BigInt('0x' + proof.response) + 1n).toString(16),
    };

    const verification = await ZKPIdentityManager.verifyProof(tamperedProof, credential.publicKey);
    expect(verification.valid).toBe(false);
  });
});
