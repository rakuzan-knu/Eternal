import { describe, it, expect, vi } from 'vitest';
import { derivePassword, verifyPassword } from '../derivePasswordHash';

describe('derivePasswordHash', () => {
  it('derives password with salt, hash and algo', async () => {
    const derived = await derivePassword('SuperSecretPassword123!');
    expect(derived.salt).toBeDefined();
    expect(derived.hash).toBeDefined();
    expect(derived.algo).toMatch(/PBKDF2|SHA-256/);
  });

  it('verifies correct password returns true', async () => {
    const derived = await derivePassword('MySecretPass@1');
    const isValid = await verifyPassword('MySecretPass@1', derived);
    expect(isValid).toBe(true);
  });

  it('verifies incorrect password returns false', async () => {
    const derived = await derivePassword('MySecretPass@1');
    const isValid = await verifyPassword('WrongPassword123!', derived);
    expect(isValid).toBe(false);
  });

  it('verifies password with different length returns false', async () => {
    const derived = await derivePassword('Short');
    const isValid = await verifyPassword('MuchLongerPasswordThatWillNotMatch', derived);
    expect(isValid).toBe(false);
  });

  it('falls back to SHA-256 when PBKDF2 throws', async () => {
    const originalImportKey = crypto.subtle.importKey;
    const importKeySpy = vi
      .spyOn(crypto.subtle, 'importKey')
      .mockImplementation((format, keyData, algo) => {
        if (algo === 'PBKDF2') {
          return Promise.reject(new Error('PBKDF2 not supported in this runtime'));
        }
        return originalImportKey.call(crypto.subtle, format, keyData, algo, false, ['deriveBits']);
      });

    const derived = await derivePassword('FallbackPass123');
    expect(derived.algo).toBe('SHA-256');
    expect(derived.hash).toBeDefined();

    const isValid = await verifyPassword('FallbackPass123', derived);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword('WrongFallbackPass', derived);
    expect(isInvalid).toBe(false);

    importKeySpy.mockRestore();
  });

  it('throws when crypto.subtle is unavailable', async () => {
    const originalSubtle = crypto.subtle;
    Object.defineProperty(crypto, 'subtle', {
      value: undefined,
      configurable: true,
    });

    await expect(derivePassword('TestPass')).rejects.toThrow('Web Crypto subtle API unavailable');

    Object.defineProperty(crypto, 'subtle', {
      value: originalSubtle,
      configurable: true,
    });
  });
});
