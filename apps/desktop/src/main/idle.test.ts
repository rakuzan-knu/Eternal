import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSystemIdleState: vi.fn(() => 'active') }));
vi.mock('electron', () => ({ powerMonitor: Object.assign(new EventEmitter(), mocks) }));
import { powerMonitor } from 'electron';
import { createIdleMonitor } from './idle';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('system idle state', () => {
  it('uses OS inactivity and lock/suspend events, then cleans up listeners/timers', async () => {
    vi.useFakeTimers();
    const change = vi.fn();
    const idle = createIdleMonitor(change);
    expect(change).toHaveBeenLastCalledWith('active');
    expect(mocks.getSystemIdleState).toHaveBeenCalledWith(300);
    mocks.getSystemIdleState.mockReturnValue('idle');
    await vi.advanceTimersByTimeAsync(15000);
    expect(change).toHaveBeenLastCalledWith('idle');
    powerMonitor.emit('lock-screen');
    expect(idle.getState()).toBe('locked');
    mocks.getSystemIdleState.mockReturnValue('active');
    powerMonitor.emit('unlock-screen');
    expect(idle.getState()).toBe('active');
    powerMonitor.emit('suspend');
    expect(idle.getState()).toBe('locked');
    powerMonitor.emit('resume');
    expect(idle.getState()).toBe('active');
    idle.dispose();
    change.mockClear();
    powerMonitor.emit('lock-screen');
    await vi.advanceTimersByTimeAsync(30000);
    expect(change).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
