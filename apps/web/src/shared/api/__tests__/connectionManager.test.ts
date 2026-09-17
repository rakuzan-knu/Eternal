import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectionManager } from '../connectionManager';

describe('ConnectionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    connectionManager.wake();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in ACTIVE state by default', () => {
    expect(connectionManager.getState()).toBe('ACTIVE');
    expect(connectionManager.isTabVisible()).toBe(true);
  });

  it('calculates exponential backoff delay with jitter', () => {
    const delay0 = connectionManager.calculateBackoffDelay(0, 1000, 10000);
    const delay3 = connectionManager.calculateBackoffDelay(3, 1000, 10000);

    expect(delay0).toBeGreaterThanOrEqual(500);
    expect(delay0).toBeLessThanOrEqual(1000);

    expect(delay3).toBeGreaterThanOrEqual(4000);
    expect(delay3).toBeLessThanOrEqual(8000);
  });

  it('transitions to HIBERNATING after grace period when hidden', () => {
    const stateListener = vi.fn();
    const unsubscribe = connectionManager.addStateListener(stateListener);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    connectionManager.scheduleHibernate(1000);
    expect(connectionManager.getState()).toBe('ACTIVE');

    vi.advanceTimersByTime(1000);
    expect(connectionManager.getState()).toBe('HIBERNATING');
    expect(stateListener).toHaveBeenCalledWith('HIBERNATING');

    unsubscribe();
  });

  it('wakes up and notifies listeners on wake()', () => {
    connectionManager.hibernateNow();
    expect(connectionManager.getState()).toBe('HIBERNATING');

    const wakeListener = vi.fn();
    const unsubscribe = connectionManager.addWakeListener(wakeListener);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    connectionManager.wake();
    expect(connectionManager.getState()).toBe('ACTIVE');
    expect(wakeListener).toHaveBeenCalled();

    unsubscribe();
  });

  it('transitions to DISCONNECTED on window offline event', () => {
    const stateListener = vi.fn();
    const unsubscribe = connectionManager.addStateListener(stateListener);

    window.dispatchEvent(new Event('offline'));
    expect(connectionManager.getState()).toBe('DISCONNECTED');
    expect(stateListener).toHaveBeenCalledWith('DISCONNECTED');

    unsubscribe();
  });
});
