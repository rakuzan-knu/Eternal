import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, fireEvent } from '@testing-library/react';
import ProceduralChatBackground from '../ProceduralChatBackground';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import React from 'react';
import { useVisualEffects } from '@/shared/model/useVisualEffects';

describe('ProceduralChatBackground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveMediaPlaybackStore.setState({ isPlaying: false, volume: 1 });
    useVisualEffects.setState({ simplified: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useVisualEffects.setState({ simplified: false });
  });

  it('uses a static lower-resolution canvas when effects are simplified', () => {
    useVisualEffects.setState({ simplified: true });
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { container } = render(<ProceduralChatBackground />);
    const canvas = container.querySelector('canvas')!;
    expect(canvas.width).toBe(400);
    expect(raf).not.toHaveBeenCalled();
    act(() => useVisualEffects.setState({ simplified: false }));
    expect(raf).toHaveBeenCalled();
    act(() => useVisualEffects.setState({ simplified: true }));
    expect(cancel).toHaveBeenCalledWith(42);
  });
  it('stops scheduling in a hidden document and resumes once when visible', () => {
    let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<ProceduralChatBackground />);
    expect(raf).toHaveBeenCalledTimes(1);
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    expect(cancel).toHaveBeenCalledWith(42);
    expect(raf).toHaveBeenCalledTimes(1);
    hidden = false;
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(document, new Event('visibilitychange'));
    expect(raf).toHaveBeenCalledTimes(2);
    unmount();
    fireEvent(document, new Event('visibilitychange'));
    expect(raf).toHaveBeenCalledTimes(2);
  });

  it.each(['neon-smoke', 'cosmic-aurora', 'synthwave-grid', 'starlight-drift', 'cyber-matrix'])(
    'keeps the %s shader visible without scheduling movement',
    (shaderId) => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockReturnValue({
          matches: true,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }),
      );
      const context = document.createElement('canvas').getContext('2d')!;
      // The shared canvas fixture omits this standard browser drawing method.
      Object.defineProperty(context, 'strokeRect', { configurable: true, value: vi.fn() });
      const fill = vi.spyOn(context, 'fillRect');
      const raf = vi.spyOn(window, 'requestAnimationFrame');
      const { container } = render(<ProceduralChatBackground shaderId={shaderId} />);

      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(fill).toHaveBeenCalled();
      expect(raf).not.toHaveBeenCalled();
    },
  );

  it('renders a static shader and redraws on resize with reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    const { container } = render(<ProceduralChatBackground shaderId="neon-smoke" />);
    const canvas = container.querySelector('canvas');
    const fill = vi.spyOn(canvas!.getContext('2d')!, 'fillRect');

    expect(canvas).toBeInTheDocument();
    expect(raf).not.toHaveBeenCalled();
    fireEvent.mouseMove(container.firstChild!, { clientX: 300, clientY: 200 });
    expect(raf).not.toHaveBeenCalled();

    Object.defineProperty(container.firstChild, 'getBoundingClientRect', {
      value: () => ({ width: 800, height: 800 }),
    });
    fireEvent(window, new Event('resize'));
    expect(fill).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });

  it('starts and cancels shader movement when the OS preference changes', () => {
    let reduced = true;
    const events = new EventTarget();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        get matches() {
          return reduced;
        },
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: events.addEventListener.bind(events),
        removeEventListener: events.removeEventListener.bind(events),
        dispatchEvent: events.dispatchEvent.bind(events),
      }),
    );
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = render(<ProceduralChatBackground shaderId="neon-smoke" />);
    expect(raf).not.toHaveBeenCalled();

    act(() => {
      reduced = false;
      events.dispatchEvent(new Event('change'));
    });
    expect(raf).toHaveBeenCalledTimes(1);

    act(() => {
      reduced = true;
      events.dispatchEvent(new Event('change'));
    });
    expect(cancel).toHaveBeenCalledWith(42);
    expect(raf).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('renders canvas for neon-smoke shader and handles mouse movement', () => {
    const { container } = render(<ProceduralChatBackground shaderId="neon-smoke" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    const wrapper = container.firstChild as HTMLElement;
    fireEvent.mouseMove(wrapper, { clientX: 100, clientY: 150 });
  });

  it('renders all shader variants (cosmic-aurora, synthwave-grid, starlight-drift, cyber-matrix) and active audio playback', () => {
    useActiveMediaPlaybackStore.setState({ isPlaying: true, volume: 0.8 });

    const shaders: Array<'cosmic-aurora' | 'synthwave-grid' | 'starlight-drift' | 'cyber-matrix'> =
      ['cosmic-aurora', 'synthwave-grid', 'starlight-drift', 'cyber-matrix'];

    for (const shader of shaders) {
      const { unmount, container } = render(
        <ProceduralChatBackground shaderId={shader} audioReactive={true} parallax3d={true} />,
      );
      expect(container.querySelector('canvas')).toBeInTheDocument();

      const wrapper = container.firstChild as HTMLElement;
      fireEvent.touchMove(wrapper, { touches: [{ clientX: 80, clientY: 90 }] });

      unmount();
    }
  });

  it('triggers resizeObserver and intersectionObserver callbacks and advances animation frames', () => {
    let resizeCb: (() => void) | null = null;
    let intersectCb: ((entries: any[]) => void) | null = null;

    window.ResizeObserver = class {
      constructor(cb: () => void) {
        resizeCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    window.IntersectionObserver = class {
      constructor(cb: (entries: any[]) => void) {
        intersectCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    let rafCb: ((time: number) => void) | null = null;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb;
      return 1;
    });

    const { unmount } = render(
      <ProceduralChatBackground shaderId="cosmic-aurora" audioReactive={true} />,
    );

    // Trigger ResizeObserver
    if (resizeCb) (resizeCb as any)();

    // Trigger animation loop while isVisible is true
    if (rafCb) (rafCb as any)(100);

    // Trigger IntersectionObserver (not intersecting)
    if (intersectCb) (intersectCb as any)([{ isIntersecting: false }]);
    if (rafCb) (rafCb as any)(200);

    // Trigger IntersectionObserver (intersecting again)
    if (intersectCb) (intersectCb as any)([{ isIntersecting: true }]);
    if (rafCb) (rafCb as any)(300);

    unmount();
  });
});
