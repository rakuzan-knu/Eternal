import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';

const hook = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn() }));
const events = new EventEmitter();
vi.mock('electron', () => ({ systemPreferences: { isTrustedAccessibilityClient: () => true } }));
vi.mock('uiohook-napi', () => ({
  uIOhook: {
    on: events.on.bind(events),
    removeListener: events.removeListener.bind(events),
    ...hook,
  },
  UiohookKey: { V: 47, Space: 57, A: 30 },
}));
import { createNativePtt } from './nativePtt';

beforeEach(() => {
  vi.clearAllMocks();
  events.removeAllListeners();
  vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
  vi.stubEnv('DISPLAY', ':0');
  vi.stubEnv('XDG_SESSION_TYPE', 'x11');
  vi.stubEnv('WAYLAND_DISPLAY', '');
  vi.stubEnv('SNAP', '');
  vi.stubEnv('FLATPAK_ID', '');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('native push-to-talk', () => {
  it.each(['SNAP', 'FLATPAK_ID'])('keeps native input hooks off under %s', async (key) => {
    vi.stubEnv(key, 'eternal');
    vi.stubEnv('DISPLAY', ':0');
    const controller = createNativePtt(() => false, vi.fn());
    expect(await controller.configure(true, 'KeyV')).toBe(false);
    expect(hook.start).not.toHaveBeenCalled();
  });
  it.each([
    ['DISPLAY', ''],
    ['XDG_SESSION_TYPE', 'wayland'],
    ['WAYLAND_DISPLAY', 'wayland-0'],
  ])('does not start native input hooks in an unsupported session: %s=%s', async (key, value) => {
    vi.stubEnv(key, value);
    const controller = createNativePtt(() => false, vi.fn());
    expect(await controller.configure(true, 'KeyV')).toBe(false);
    expect(hook.start).not.toHaveBeenCalled();
  });
  it('handles global press, ignores repeats and modifiers, and always handles release', async () => {
    let focused = false;
    const change = vi.fn();
    const controller = createNativePtt(() => focused, change);
    expect(await controller.configure(true, 'KeyV')).toBe(true);
    events.emit('keydown', { keycode: 47, ctrlKey: true });
    expect(change).not.toHaveBeenCalled();
    events.emit('keydown', { keycode: 47 });
    events.emit('keydown', { keycode: 47 });
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    focused = true;
    events.emit('keyup', { keycode: 47 });
    expect(change).toHaveBeenLastCalledWith(false);
    events.emit('keydown', { keycode: 47 });
    expect(change).toHaveBeenCalledTimes(2);
    controller.stop();
    expect(hook.stop).toHaveBeenCalledOnce();
    expect(events.listenerCount('keydown')).toBe(0);
  });

  it('releases the microphone on stop and does not start unsupported key codes', async () => {
    const change = vi.fn();
    const controller = createNativePtt(() => false, change);
    await controller.configure(true, 'Space');
    events.emit('keydown', { keycode: 57 });
    controller.stop();
    expect(change.mock.calls).toEqual([[true], [false]]);
    expect(await controller.configure(true, 'Unknown')).toBe(false);
    expect(hook.start).toHaveBeenCalledOnce();
  });

  it('cancels a pending native-module load when the renderer disappears', async () => {
    const controller = createNativePtt(() => false, vi.fn());
    const starting = controller.configure(true, 'KeyV');
    controller.stop();
    expect(await starting).toBe(false);
    expect(hook.start).not.toHaveBeenCalled();
  });
});
