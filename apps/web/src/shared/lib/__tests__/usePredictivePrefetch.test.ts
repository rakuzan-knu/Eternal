import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePredictivePrefetch, predecodeImage } from '../usePredictivePrefetch';

describe('usePredictivePrefetch', () => {
  let mockIntersectionCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null;
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        mockIntersectionCallback = callback;
      }
      observe = observeMock;
      unobserve = vi.fn();
      disconnect = disconnectMock;
    }

    (
      global as unknown as { IntersectionObserver: typeof MockIntersectionObserver }
    ).IntersectionObserver = MockIntersectionObserver;
  });

  it('observes sentinel node when attached', () => {
    const fetchNextPage = vi.fn();
    const { result } = renderHook(() =>
      usePredictivePrefetch({
        hasNextPage: true,
        fetchNextPage,
      }),
    );

    const dummyEl = document.createElement('div');
    act(() => {
      result.current.sentinelRef(dummyEl);
    });

    expect(observeMock).toHaveBeenCalledWith(dummyEl);
  });

  it('triggers fetchNextPage and pre-decodes images when sentinel intersects', () => {
    const fetchNextPage = vi.fn();
    const getUpcomingMediaUrls = vi.fn().mockReturnValue(['https://cdn.example.com/p1.webp']);

    const { result } = renderHook(() =>
      usePredictivePrefetch({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
        getUpcomingMediaUrls,
      }),
    );

    const dummyEl = document.createElement('div');
    act(() => {
      result.current.sentinelRef(dummyEl);
    });

    // Simulate 600px lookahead intersection entry
    act(() => {
      mockIntersectionCallback?.([
        {
          isIntersecting: true,
          target: dummyEl,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(getUpcomingMediaUrls).toHaveBeenCalledTimes(1);
  });

  it('does not trigger fetchNextPage when already fetching or no next page', () => {
    const fetchNextPage = vi.fn();

    const { result } = renderHook(() =>
      usePredictivePrefetch({
        hasNextPage: false,
        isFetchingNextPage: true,
        fetchNextPage,
      }),
    );

    const dummyEl = document.createElement('div');
    act(() => {
      result.current.sentinelRef(dummyEl);
    });

    act(() => {
      mockIntersectionCallback?.([
        {
          isIntersecting: true,
          target: dummyEl,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it('disconnects previous observer on unmount', () => {
    const fetchNextPage = vi.fn();
    const { result, unmount } = renderHook(() =>
      usePredictivePrefetch({
        hasNextPage: true,
        fetchNextPage,
      }),
    );

    const dummyEl = document.createElement('div');
    act(() => {
      result.current.sentinelRef(dummyEl);
    });

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });

  it('predecodeImage completes without error', async () => {
    const originalImage = global.Image;
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      decoding = 'auto';
      decode = vi.fn().mockResolvedValue(undefined);
      private _src = '';
      set src(v: string) {
        this._src = v;
        setTimeout(() => this.onload?.(), 10);
      }
      get src() {
        return this._src;
      }
    } as unknown as typeof Image;

    try {
      await expect(predecodeImage('https://cdn.example.com/photo.webp')).resolves.toBeUndefined();
    } finally {
      global.Image = originalImage;
    }
  });
});
