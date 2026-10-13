import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoPlayer } from '../VideoPlayer';

describe('feed video resource ownership', () => {
  let intersect: IntersectionObserverCallback;
  let hidden = false;
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    hidden = false;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const reveal = (ratio: number) =>
    act(() =>
      intersect(
        [{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );

  it('does not autoplay or acquire a source until half the card is visible', () => {
    const { container } = render(<VideoPlayer src="/one.mp4" />);
    const video = container.querySelector('video')!;
    expect(video.autoplay).toBe(false);
    expect(video.getAttribute('src')).toBeNull();
    reveal(0.5);
    expect(video.getAttribute('src')).toBe('/one.mp4');
    expect(video.play).toHaveBeenCalled();
    reveal(0.49);
    expect(video.getAttribute('src')).toBeNull();
    expect(video.srcObject).toBeNull();
    expect(video.load).toHaveBeenCalled();
  });

  it('releases hidden, inactive and unmounted videos without revoking borrowed URLs', () => {
    const { container, rerender, unmount } = render(<VideoPlayer src="blob:borrowed" />);
    const video = container.querySelector('video')!;
    reveal(1);
    hidden = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(video.getAttribute('src')).toBeNull();
    hidden = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(video.getAttribute('src')).toBe('blob:borrowed');
    rerender(<VideoPlayer src="/two.mp4" active={false} />);
    expect(video.getAttribute('src')).toBeNull();
    rerender(<VideoPlayer src="/two.mp4" />);
    reveal(1);
    unmount();
    expect(video.getAttribute('src')).toBeNull();
  });

  it('a manual click cannot override the half-visible resource boundary', () => {
    const { container } = render(<VideoPlayer src="/one.mp4" />);
    const video = container.querySelector('video')!;
    reveal(0.49);
    fireEvent.click(video);
    expect(video.getAttribute('src')).toBeNull();
    expect(video.play).not.toHaveBeenCalled();
    reveal(0.5);
    expect(video.play).toHaveBeenCalledOnce();
  });
});
