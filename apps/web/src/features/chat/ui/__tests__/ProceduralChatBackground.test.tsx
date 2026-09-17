import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import ProceduralChatBackground from '../ProceduralChatBackground';
import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import React from 'react';

describe('ProceduralChatBackground', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useActiveMediaPlaybackStore.setState({ isPlaying: false, volume: 1 });
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
