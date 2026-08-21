import { describe, it, expect, beforeEach } from 'vitest';
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
});
