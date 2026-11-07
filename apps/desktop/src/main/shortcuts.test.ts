import { beforeEach, describe, expect, it, vi } from 'vitest';
const shortcut = vi.hoisted(() => ({
  register: vi.fn<(accelerator: string, callback: () => void) => boolean>(() => true),
  unregister: vi.fn(),
}));
vi.mock('electron', () => ({ globalShortcut: shortcut, systemPreferences: {} }));
vi.mock('./nativePtt', () => ({
  createNativePtt: () => ({
    configure: vi.fn().mockResolvedValue(true),
    stop: vi.fn(),
    release: vi.fn(),
  }),
}));
import { createCallShortcuts } from './shortcuts';

beforeEach(() => vi.clearAllMocks());

describe('desktop call controls', () => {
  it('routes global mute to the active call and unregisters after the last scope', async () => {
    const controls = createCallShortcuts();
    controls.setActive('call', true);
    controls.setActive('mesh', true);
    const result = controls.wait('call');
    const callback = shortcut.register.mock.calls[0]?.[1];
    if (typeof callback !== 'function') throw new Error('Missing registered shortcut');
    callback();
    await expect(result).resolves.toBe('mute');
    controls.setActive('call', false);
    expect(shortcut.unregister).not.toHaveBeenCalled();
    controls.setActive('mesh', false);
    expect(shortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Shift+M');
  });

  it('settles pending requests on teardown and rejects overlapping subscriptions', async () => {
    const controls = createCallShortcuts();
    expect(() => controls.wait('call')).toThrow('No active');
    controls.setActive('call', true);
    const result = controls.wait('call');
    expect(() => controls.wait('call')).toThrow('already pending');
    controls.reset();
    await expect(result).resolves.toBe('none');
  });

  it('mutes the mesh room while an outgoing call has no action listener yet', async () => {
    const controls = createCallShortcuts();
    controls.setActive('mesh', true);
    const result = controls.wait('mesh');
    controls.setActive('call', true);
    shortcut.register.mock.calls[0]?.[1]();
    await expect(result).resolves.toBe('mute');
    controls.reset();
  });

  it('forces foreground PTT closed on suspend even without a native key press', async () => {
    const controls = createCallShortcuts();
    controls.setActive('call', true);
    await controls.configurePushToTalk('call', true, 'KeyV');
    const result = controls.wait('call');
    controls.releasePushToTalk();
    await expect(result).resolves.toBe('ptt-reset');
    controls.reset();
  });
});
