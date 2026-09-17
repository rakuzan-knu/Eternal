import { describe, it, expect } from 'vitest';
import { generateNonExtractableCallKeyPair, deriveNonExtractableSharedKey } from '../frameCrypto';

describe('Non-Extractable WebCrypto Keys (XSS Defense)', () => {
  it('generates an ECDH keypair with extractable: false', async () => {
    const keyPair = await generateNonExtractableCallKeyPair();

    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();

    // Verify private key is marked non-extractable
    expect(keyPair.privateKey.extractable).toBe(false);
    expect(keyPair.privateKey.algorithm.name).toBe('ECDH');
  });

  it('rejects attempts to export the private key with an error', async () => {
    const keyPair = await generateNonExtractableCallKeyPair();

    // Any attempt to extract private key must fail
    await expect(crypto.subtle.exportKey('pkcs8', keyPair.privateKey)).rejects.toThrow();
    await expect(crypto.subtle.exportKey('jwk', keyPair.privateKey)).rejects.toThrow();
  });

  it('successfully derives an unextractable symmetric AES-GCM session key', async () => {
    const aliceKeys = await generateNonExtractableCallKeyPair();
    const bobKeys = await generateNonExtractableCallKeyPair();

    // Alice derives shared key using Bob's public key
    const aliceShared = await deriveNonExtractableSharedKey(
      aliceKeys.privateKey,
      bobKeys.publicKey,
    );

    // Bob derives shared key using Alice's public key
    const bobShared = await deriveNonExtractableSharedKey(bobKeys.privateKey, aliceKeys.publicKey);

    expect(aliceShared.extractable).toBe(false);
    expect(bobShared.extractable).toBe(false);
    expect(aliceShared.algorithm.name).toBe('AES-GCM');

    // Attempting to export session key must also fail
    await expect(crypto.subtle.exportKey('raw', aliceShared)).rejects.toThrow();

    // Verify the derived keys can encrypt and decrypt data symmetrically
    const iv = new Uint8Array(12);
    iv[0] = 1;
    const plaintext = new TextEncoder().encode('Confidential E2EE Call Frame');

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aliceShared, plaintext);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, bobShared, ciphertext);

    expect(new TextDecoder().decode(decrypted)).toBe('Confidential E2EE Call Frame');
  });
});
