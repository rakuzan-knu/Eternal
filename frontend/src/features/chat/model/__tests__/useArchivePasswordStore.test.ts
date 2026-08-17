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
});
