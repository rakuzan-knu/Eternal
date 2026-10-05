import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerCircularRippleTransition } from '../themeRippleTransition';

describe('themeRippleTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.querySelectorAll('.theme-ripple-overlay').forEach((overlay) => overlay.remove());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each([false, true])(
    'applies immediately without vibration or animation when reduced motion is requested (native=%s)',
    (hasNativeTransition) => {
      const applyTheme = vi.fn();
      const transition = vi.fn();
      const vibrate = vi.fn();
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });
      Object.defineProperty(navigator, 'vibrate', {
        configurable: true,
        writable: true,
        value: vibrate,
      });
      if (hasNativeTransition) {
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: transition,
        });
      }

      try {
        triggerCircularRippleTransition({ x: 100, y: 200 }, applyTheme);

        expect(applyTheme).toHaveBeenCalledTimes(1);
        expect(vibrate).not.toHaveBeenCalled();
        expect(transition).not.toHaveBeenCalled();
        expect(document.querySelector('.theme-ripple-overlay')).toBeNull();
        expect(vi.getTimerCount()).toBe(0);
      } finally {
        Reflect.deleteProperty(document, 'startViewTransition');
      }
    },
  );

  it('retains fallback behavior if matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const applyTheme = vi.fn();
    try {
      triggerCircularRippleTransition(null, applyTheme);
      expect(document.querySelector('.theme-ripple-overlay')).toBeInTheDocument();
      vi.advanceTimersByTime(16);
      expect(applyTheme).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
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
