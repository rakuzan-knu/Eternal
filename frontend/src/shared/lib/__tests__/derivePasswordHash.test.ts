import { describe, it, expect } from 'vitest';
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
});
