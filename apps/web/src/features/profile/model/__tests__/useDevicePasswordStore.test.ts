import { describe, it, expect, beforeEach } from 'vitest';
import { useDevicePasswordStore } from '../useDevicePasswordStore';

describe('useDevicePasswordStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useDevicePasswordStore.getState().disable();
  });

  it('starts without a password configured and locked', () => {
    expect(useDevicePasswordStore.getState().isEnabled()).toBe(false);
    expect(useDevicePasswordStore.getState().unlocked).toBe(false);
  });

  it('sets a device password and updates state to unlocked', async () => {
    await useDevicePasswordStore.getState().setPassword('SecurePass456!');
    expect(useDevicePasswordStore.getState().isEnabled()).toBe(true);
    expect(useDevicePasswordStore.getState().unlocked).toBe(true);
  });

  it('verifies correct password and unlocks', async () => {
    await useDevicePasswordStore.getState().setPassword('SecurePass456!');
    useDevicePasswordStore.setState({ unlocked: false });
    expect(useDevicePasswordStore.getState().unlocked).toBe(false);

    const verified = await useDevicePasswordStore.getState().verify('SecurePass456!');
    expect(verified).toBe(true);
    expect(useDevicePasswordStore.getState().unlocked).toBe(true);
  });

  it('fails verification on wrong password', async () => {
    await useDevicePasswordStore.getState().setPassword('SecurePass456!');
    useDevicePasswordStore.setState({ unlocked: false });

    const verified = await useDevicePasswordStore.getState().verify('WrongPass!');
    expect(verified).toBe(false);
    expect(useDevicePasswordStore.getState().unlocked).toBe(false);
  });
});
