import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SimulcastSubscriptionManager,
  type SimulcastSubscriptionEvent,
} from '../simulcastSubscriptionManager';

describe('SimulcastSubscriptionManager', () => {
  let manager: SimulcastSubscriptionManager;
  let observerCallback: (entries: Partial<IntersectionObserverEntry>[]) => void;
  let observeMock: ReturnType<typeof vi.fn>;
  let unobserveMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();

    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
        observerCallback = callback;
      }
      observe = observeMock;
      unobserve = unobserveMock;
      disconnect = disconnectMock;
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    manager = new SimulcastSubscriptionManager();
  });

  afterEach(() => {
    manager.reset();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('observes element with IntersectionObserver', () => {
    const el = document.createElement('div');
    manager.observe('user-1', el);

    expect(observeMock).toHaveBeenCalledWith(el);
  });

  it('downgrades to low layer when tile is offscreen or occluded', async () => {
    const el = document.createElement('div');
    manager.observe('user-2', el);

    const resultHolder: { event: SimulcastSubscriptionEvent | null } = { event: null };
    manager.onLayerChange((evt) => {
      resultHolder.event = evt;
    });

    // Simulate tile scrolling out of view (intersectionRatio < 0.15)
    observerCallback([
      {
        target: el,
        isIntersecting: false,
        intersectionRatio: 0.05,
      },
    ]);

    // Before debounce (200ms)
    expect(manager.getLayer('user-2')).toBe('high');
    expect(resultHolder.event).toBeNull();

    // Advance past 200ms debounce
    await vi.advanceTimersByTimeAsync(210);

    expect(manager.getLayer('user-2')).toBe('low');
    expect(resultHolder.event?.targetUserId).toBe('user-2');
    expect(resultHolder.event?.layer).toBe('low');
  });

  it('promotes back to high layer when tile scrolls into viewport', async () => {
    const el = document.createElement('div');
    manager.observe('user-3', el);

    // First scroll out
    observerCallback([{ target: el, isIntersecting: false, intersectionRatio: 0 }]);
    await vi.advanceTimersByTimeAsync(210);
    expect(manager.getLayer('user-3')).toBe('low');

    // Scroll back in
    const promotedHolder: { event: SimulcastSubscriptionEvent | null } = { event: null };
    manager.onLayerChange((evt) => {
      promotedHolder.event = evt;
    });

    observerCallback([{ target: el, isIntersecting: true, intersectionRatio: 0.95 }]);
    await vi.advanceTimersByTimeAsync(210);

    expect(manager.getLayer('user-3')).toBe('high');
    expect(promotedHolder.event?.layer).toBe('high');
  });

  it('unobserves element and cleans up registered listeners', () => {
    const el = document.createElement('div');
    manager.observe('user-4', el);
    manager.unobserve(el);

    expect(unobserveMock).toHaveBeenCalledWith(el);
  });
});
