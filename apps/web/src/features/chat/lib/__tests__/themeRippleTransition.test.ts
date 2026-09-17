import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerCircularRippleTransition } from '../themeRippleTransition';

describe('themeRippleTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles startViewTransition API when available on document', async () => {
    const applyTheme = vi.fn();
    const animateMock = vi.fn();
    document.documentElement.animate = animateMock;

    let callbackFn: () => void = () => {};
    (document as any).startViewTransition = vi.fn().mockImplementation((cb: () => void) => {
      callbackFn = cb;
      return {
        ready: Promise.resolve(),
      };
    });

    triggerCircularRippleTransition({ x: 100, y: 200 }, applyTheme);

    callbackFn();
    expect(applyTheme).toHaveBeenCalled();

    await Promise.resolve();
    expect(animateMock).toHaveBeenCalled();

    delete (document as any).startViewTransition;
  });

  it('handles startViewTransition rejection gracefully', async () => {
    const applyTheme = vi.fn();
    let callbackFn: () => void = () => {};
    (document as any).startViewTransition = vi.fn().mockImplementation((cb: () => void) => {
      callbackFn = cb;
      return {
        ready: Promise.reject(new Error('Transition aborted')),
      };
    });

    triggerCircularRippleTransition({ x: 100, y: 200 }, applyTheme);
    callbackFn();

    try {
      await Promise.reject(new Error('dummy'));
    } catch {
      // drain
    }

    delete (document as any).startViewTransition;
  });

  it('creates fallback DOM overlay ripple animation and cleans up', () => {
    const applyTheme = vi.fn();

    // Trigger haptic vibrate if present
    Object.assign(navigator, { vibrate: vi.fn() });

    triggerCircularRippleTransition(null, applyTheme);

    const overlay = document.querySelector('.theme-ripple-overlay');
    expect(overlay).toBeInTheDocument();

    // Run rAF
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(applyTheme).toHaveBeenCalled();

    // Run removal timeouts (500ms + 600ms)
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(document.querySelector('.theme-ripple-overlay')).not.toBeInTheDocument();
  });

  it('safely catches error if navigator.vibrate throws', () => {
    Object.assign(navigator, {
      vibrate: vi.fn(() => {
        throw new Error('Vibration disabled');
      }),
    });
    const applyTheme = vi.fn();
    expect(() => triggerCircularRippleTransition(null, applyTheme)).not.toThrow();
  });

  it('calls applyTheme directly when in non-browser environment', () => {
    const originalDocument = globalThis.document;
    try {
      (globalThis as unknown as { document: Document | undefined }).document = undefined;
      const applyTheme = vi.fn();
      triggerCircularRippleTransition(null, applyTheme);
      expect(applyTheme).toHaveBeenCalled();
    } finally {
      (globalThis as unknown as { document: Document | undefined }).document = originalDocument;
    }
  });
});

function act(cb: () => void) {
  cb();
}
