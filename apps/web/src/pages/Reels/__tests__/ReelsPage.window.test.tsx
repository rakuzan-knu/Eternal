import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelsPage } from '../ReelsPage';

const feed = vi.hoisted(() => ({
  data: {
    pages: [
      {
        data: Array.from({ length: 500 }, (_, index) => ({
          id: `reel-${index}`,
          caption: `Reel ${index}`,
          videoUrl: '/video.mp4',
          author: { username: 'author', displayName: 'Author' },
          createdAt: '2026-10-10',
        })),
      },
    ],
  },
  isLoading: false,
  isError: false,
  hasNextPage: true,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
}));
vi.mock('@/features/reels/api/reelsApi', () => ({ useReelsFeed: () => feed }));
vi.mock('@/features/reels/ui/ReelCard', () => ({
  ReelCard: ({
    reel,
    isActive,
    onRemoveReel,
  }: {
    reel: { id: string };
    isActive: boolean;
    onRemoveReel: () => void;
  }) => (
    <button data-testid="full-reel" data-active={isActive} onClick={onRemoveReel}>
      {reel.id}
    </button>
  ),
}));
vi.mock('@/features/reels/ui/ReelPlaceholder', () => ({
  ReelPlaceholder: () => <span data-testid="reel-placeholder" />,
}));
vi.mock('@/features/reels/lib/reelVideoPool', () => ({
  ReelVideoPool: class {
    dispose() {}
  },
}));

let viewportHeight: number;
let resize: ResizeObserverCallback;
let intersect: IntersectionObserverCallback;
let observed: Set<Element>;
let scrollCalls: ScrollToOptions[];
function visible(index: number) {
  const target = screen.getByTestId('reels-scroller').querySelector(`[data-index="${index}"]`)!;
  expect(observed.has(target)).toBe(true);
  act(() =>
    intersect(
      [{ target, isIntersecting: true, intersectionRatio: 1 }] as IntersectionObserverEntry[],
      {} as IntersectionObserver,
    ),
  );
}
function jump(index: number) {
  const scroller = screen.getByTestId('reels-scroller');
  scroller.scrollTop = index * viewportHeight;
  fireEvent.scroll(scroller);
  act(() => {
    vi.advanceTimersByTime(20);
  });
}
function mountedIndices() {
  return [...screen.getByTestId('reels-scroller').querySelectorAll('[data-index]')].map((element) =>
    Number(element.getAttribute('data-index')),
  );
}

describe('ReelsPage bounded snap window', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    viewportHeight = 720;
    scrollCalls = [];
    observed = new Set();
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(() => viewportHeight);
    vi.spyOn(HTMLElement.prototype, 'scrollTo').mockImplementation(function (
      this: HTMLElement,
      options: ScrollToOptions | number = {},
      y?: number,
    ) {
      const destination = typeof options === 'number' ? { left: options, top: y } : options;
      scrollCalls.push(destination);
      this.scrollTop = Number(destination.top ?? 0);
      this.dispatchEvent(new Event('scroll'));
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersect = callback;
        }
        observe(element: Element) {
          observed.add(element);
        }
        disconnect() {
          observed.clear();
        }
      },
    );
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
    }));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps at most seven wrappers for 500 reels and remounts the window after a distant jump', () => {
    const view = render(<ReelsPage />);
    expect(view.container.querySelectorAll('[data-index]').length).toBeLessThanOrEqual(7);
    expect(mountedIndices().length).toBeLessThanOrEqual(7);
    jump(350);
    expect(mountedIndices()).toEqual([347, 348, 349, 350, 351, 352, 353]);
    visible(350);
    expect(screen.getByText('reel-350')).toHaveAttribute('data-active', 'true');
    expect(screen.getAllByTestId('full-reel')).toHaveLength(3);
    expect(screen.getByTestId('reels-spacer-before')).toHaveStyle({ height: `${347 * 720}px` });
    expect(screen.getByTestId('reels-spacer-after')).toHaveStyle({ height: `${146 * 720}px` });
    expect(observed.size).toBeLessThanOrEqual(7);
  });

  it('preserves the visible reel on resize and navigates without retaining distant element refs', () => {
    render(<ReelsPage />);
    jump(350);
    visible(350);
    viewportHeight = 480;
    act(() => resize([], {} as ResizeObserver));
    expect(screen.getByTestId('reels-scroller').scrollTop).toBe(350 * 480);
    expect(mountedIndices()).toHaveLength(7);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(scrollCalls.at(-1)).toEqual({ top: 351 * 480, behavior: 'auto' });
    expect(screen.getByText('reel-350')).toHaveAttribute('data-active', 'true');
    act(() => {
      vi.advanceTimersByTime(20);
    });
    visible(351);
    expect(screen.getByText('reel-351')).toHaveAttribute('data-active', 'true');
  });

  it('loads the next page near the end and clamps the window after removing the last reel', () => {
    render(<ReelsPage />);
    jump(499);
    visible(499);
    expect(feed.fetchNextPage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('reel-499'));
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(mountedIndices().at(-1)).toBe(498);
    expect(screen.queryByText('reel-499')).toBeNull();
    expect(screen.getByTestId('reels-scroller').scrollTop).toBe(498 * 720);
  });

  it('coalesces scroll updates and cancels the pending frame on unmount', () => {
    const view = render(<ReelsPage />);
    const scroller = screen.getByTestId('reels-scroller');
    scroller.scrollTop = 100 * 720;
    fireEvent.scroll(scroller);
    scroller.scrollTop = 400 * 720;
    fireEvent.scroll(scroller);
    expect(mountedIndices()[0]).toBe(0);
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(mountedIndices()[0]).toBe(397);
    fireEvent.scroll(scroller);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('limits a wheel burst to one reel and leaves keys inside dialog controls alone', () => {
    render(<ReelsPage />);
    const scroller = screen.getByTestId('reels-scroller');
    scrollCalls.length = 0;
    fireEvent.wheel(scroller, { deltaY: 80 });
    fireEvent.wheel(scroller, { deltaY: 80 });
    expect(scrollCalls).toEqual([{ top: 720, behavior: 'auto' }]);
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const control = document.createElement('button');
    dialog.appendChild(control);
    document.body.appendChild(dialog);
    fireEvent.keyDown(control, { key: 'ArrowDown' });
    expect(scrollCalls).toHaveLength(1);
    dialog.remove();
  });
});
