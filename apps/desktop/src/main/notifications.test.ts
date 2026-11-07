import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  supported: vi.fn(() => true),
  badge: vi.fn(),
  created: [] as {
    emitter: EventEmitter;
    close: ReturnType<typeof vi.fn>;
    options: { silent: boolean };
  }[],
}));
vi.mock('electron', () => ({
  app: { setBadgeCount: mocks.badge },
  nativeImage: { createEmpty: () => ({ resize: vi.fn() }) },
  Notification: class extends EventEmitter {
    static isSupported = mocks.supported;
    close = vi.fn();
    show = vi.fn();
    constructor(options: { silent: boolean }) {
      super();
      mocks.created.push({ emitter: this, close: this.close, options });
    }
  },
}));
import { nativeImage } from 'electron';
import { createNativeNotifications } from './notifications';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.created.length = 0;
  mocks.supported.mockReturnValue(true);
});
afterEach(() => vi.useRealTimers());

describe('native notification lifetime', () => {
  it('coalesces tags, disables stale clicks and navigates only the active notification', () => {
    const navigate = vi.fn();
    const service = createNativeNotifications(() => undefined, navigate, nativeImage.createEmpty());
    service.show({ title: 'First', body: '', path: '/messages/old', tag: 'conversation' });
    service.show({ title: 'Latest', body: '', path: '/messages/new', tag: 'conversation' });
    mocks.created[0]?.emitter.emit('click');
    expect(navigate).not.toHaveBeenCalled();
    mocks.created[1]?.emitter.emit('click');
    expect(navigate).toHaveBeenCalledExactlyOnceWith('/messages/new');
    expect(mocks.created[1]?.options.silent).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds retained notifications even when the OS never emits close and expires click handlers', async () => {
    const navigate = vi.fn();
    const service = createNativeNotifications(() => undefined, navigate, nativeImage.createEmpty());
    for (let index = 0; index < 10; index++) {
      service.show({ title: 'Test', body: '', path: `/messages/${index}` });
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(vi.getTimerCount()).toBe(5);
    expect(mocks.created[0]?.close).toHaveBeenCalledOnce();
    mocks.created[0]?.emitter.emit('click');
    expect(navigate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60000);
    expect(vi.getTimerCount()).toBe(0);
    mocks.created.at(-1)?.emitter.emit('click');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('closes notifications and clears badges at session boundaries, without a click after logout', () => {
    const navigate = vi.fn();
    const service = createNativeNotifications(() => undefined, navigate, nativeImage.createEmpty());
    service.show({ title: 'Private', body: '', path: '/messages/private' });
    service.setBadge(3);
    service.reset();
    expect(mocks.badge).toHaveBeenLastCalledWith(0);
    expect(mocks.created[0]?.close).toHaveBeenCalledOnce();
    mocks.created[0]?.emitter.emit('click');
    expect(navigate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns false for unsupported platforms and throttles unrelated floods', () => {
    const service = createNativeNotifications(() => undefined, vi.fn(), nativeImage.createEmpty());
    mocks.supported.mockReturnValue(false);
    expect(service.show({ title: 'Test', body: '', path: '/messages' })).toBe(false);
    mocks.supported.mockReturnValue(true);
    expect(service.show({ title: 'Test', body: '', path: '/messages' })).toBe(true);
    expect(service.show({ title: 'Flood', body: '', path: '/messages' })).toBe(false);
    service.reset();
  });
});
