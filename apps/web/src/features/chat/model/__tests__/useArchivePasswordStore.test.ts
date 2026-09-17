import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useArchivePasswordStore } from '../useArchivePasswordStore';

describe('useArchivePasswordStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useArchivePasswordStore.getState().resetPassword();
  });

  it('starts with null password and fails verification', async () => {
    const verified = await useArchivePasswordStore.getState().verify('anything');
    expect(verified).toBe(false);
  });

  it('sets, verifies, and resets archive password', async () => {
    await useArchivePasswordStore.getState().setPassword('MySecret123!');
    expect(useArchivePasswordStore.getState().passwordHash).not.toBeNull();

    const isCorrect = await useArchivePasswordStore.getState().verify('MySecret123!');
    expect(isCorrect).toBe(true);

    const isWrong = await useArchivePasswordStore.getState().verify('WrongPass!');
    expect(isWrong).toBe(false);

    useArchivePasswordStore.getState().resetPassword();
    expect(useArchivePasswordStore.getState().passwordHash).toBeNull();
  });

  it('migrates legacy v0 plaintext JSON verifier on rehydrate', async () => {
    const legacy = {
      salt: '0102030405060708090a0b0c0d0e0f10',
      hash: 'testhash123',
      algo: 'PBKDF2' as const,
    };
    localStorage.setItem('eternal-archive-password', JSON.stringify(legacy));

    useArchivePasswordStore.getState().rehydrate();
    expect(useArchivePasswordStore.getState().passwordHash).toEqual(legacy);
    expect(localStorage.getItem('eternal-archive-password')).toBeNull();
    expect(localStorage.getItem('eternal-archive-auth-v2')).not.toBeNull();
  });

  it('migrates legacy v1 base64 verifier on rehydrate', async () => {
    const legacy = {
      salt: '0102030405060708090a0b0c0d0e0f10',
      hash: 'testhash123',
      algo: 'PBKDF2' as const,
    };
    const json = JSON.stringify(legacy);
    const jsonBytes = new TextEncoder().encode(json);
    let hex = '';
    for (let i = 0; i < jsonBytes.length; i += 1) {
      const masked = jsonBytes[i] ^ (0x5c ^ (i % 11));
      hex += masked.toString(16).padStart(2, '0');
    }
    const b64 = btoa(hex);
    localStorage.setItem('eternal-archive-auth-v1', b64);

    useArchivePasswordStore.getState().rehydrate();
    expect(useArchivePasswordStore.getState().passwordHash).toEqual(legacy);
    expect(localStorage.getItem('eternal-archive-auth-v1')).toBeNull();
  });

  it('handles corrupted localStorage and storage setItem exceptions', () => {
    localStorage.setItem('eternal-archive-auth-v2', 'enc:v2:corrupted-data!!!');
    useArchivePasswordStore.getState().rehydrate();
    expect(useArchivePasswordStore.getState().passwordHash).toBeNull();

    // Invalid legacy v1 token payload
    localStorage.setItem('eternal-archive-auth-v1', btoa('0011223344'));
    useArchivePasswordStore.getState().rehydrate();
    expect(useArchivePasswordStore.getState().passwordHash).toBeNull();

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => useArchivePasswordStore.getState().setPassword('NewPass123!')).not.toThrow();
    expect(() => useArchivePasswordStore.getState().resetPassword()).not.toThrow();
    setItemSpy.mockRestore();

    // Storage getItem exception in loadStored
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => useArchivePasswordStore.getState().rehydrate()).not.toThrow();
    getItemSpy.mockRestore();
  });

  it('handles AES-GCM async storage encryption and decryption across rehydrations', async () => {
    await useArchivePasswordStore.getState().setPassword('SecurePass456!');

    const storedValue = localStorage.getItem('eternal-archive-auth-v2');
    expect(storedValue).toBeTruthy();

    // Reset memory state and rehydrate from AES-GCM stored ciphertext
    useArchivePasswordStore.setState({ passwordHash: null });
    useArchivePasswordStore.getState().rehydrate();

    const verified = await useArchivePasswordStore.getState().verify('SecurePass456!');
    expect(verified).toBe(true);
    expect(useArchivePasswordStore.getState().passwordHash).not.toBeNull();
  });
});
