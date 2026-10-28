import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ReelCard } from '../ReelCard';
import { ReelVideoPool } from '../../lib/reelVideoPool';
import { DEFAULT_SEED_REELS } from '@/entities/reel';

const mutations = vi.hoisted(() => ({
  like: { mutate: vi.fn() },
  save: { mutate: vi.fn() },
  view: { mutate: vi.fn() },
  hide: { mutate: vi.fn() },
}));
vi.mock('../../api/reelsApi', () => ({
  useToggleLikeReel: () => mutations.like,
  useToggleSaveReel: () => mutations.save,
  useRecordReelView: () => mutations.view,
  useNotInterestedReel: () => mutations.hide,
}));

let intersect!: (entries: Partial<IntersectionObserverEntry>[]) => void;
function renderCard(pool: ReelVideoPool, onRemoveReel?: (reelId: string) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ReelCard
          reel={{ ...DEFAULT_SEED_REELS[0], blurhash: null }}
          videoPool={pool}
          isActive
          isMuted
          onToggleMute={() => {}}
          onRemoveReel={onRemoveReel}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReelCard pooled playback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intersect = () => {};
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof intersect) {
          intersect = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leases the visible video and records successful playback only once', async () => {
    const pool = new ReelVideoPool();
    const view = renderCard(pool);
    expect(view.container.querySelector('video')).toBeNull();
    await act(async () => {
      intersect([{ isIntersecting: true, intersectionRatio: 1 }]);
    });
    const video = view.container.querySelector('video')!;
    expect(video.dataset.reelVideoSlot).toBeDefined();
    expect(mutations.view.mutate).toHaveBeenCalledExactlyOnceWith(DEFAULT_SEED_REELS[0].id);
    const clickTarget = screen.getByRole('button', { name: 'Pause' });
    fireEvent.click(clickTarget);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resume playback' }));
    });
    expect(mutations.view.mutate).toHaveBeenCalledOnce();
    view.unmount();
    expect(video.getAttribute('src')).toBeNull();
    pool.dispose();
  });

  it('preserves liking and seeking while using a leased node', async () => {
    const pool = new ReelVideoPool();
    const view = renderCard(pool);
    await act(async () => {
      intersect([{ isIntersecting: true, intersectionRatio: 1 }]);
    });
    const video = view.container.querySelector('video')!;
    Object.defineProperty(video, 'duration', { value: 100, configurable: true });
    const scrubber = screen.getByRole('progressbar');
    vi.spyOn(scrubber, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 200 } as DOMRect);
    fireEvent.click(scrubber, { clientX: 100 });
    expect(video.currentTime).toBe(50);
    fireEvent.keyDown(window, { key: 'l' });
    expect(mutations.like.mutate).toHaveBeenCalledWith(DEFAULT_SEED_REELS[0].id);
    await act(async () => {
      intersect([{ isIntersecting: false, intersectionRatio: 0 }]);
    });
    expect(video.getAttribute('src')).toBeNull();
    expect(view.container.querySelector('video')).toBeNull();
    view.unmount();
    pool.dispose();
  });

  it('does not acknowledge a failed save and offers a working retry', async () => {
    mutations.save.mutate
      .mockImplementationOnce((_id: string, options: { onError: () => void }) => options.onError())
      .mockImplementationOnce(
        (_id: string, options: { onSuccess: (data: { saved: boolean }) => void }) =>
          options.onSuccess({ saved: true }),
      );
    const pool = new ReelVideoPool();
    const view = renderCard(pool);
    const saveButton = screen.getAllByRole('button', { name: 'Save to favorites' })[0];
    expect(saveButton).toHaveTextContent('0');
    fireEvent.click(saveButton);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not update saved videos');
    expect(screen.queryByText('Saved to favorites')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved to favorites');
    view.unmount();
    pool.dispose();
  });

  it('retains a reel after a failed preference update and removes it only after a successful retry', async () => {
    mutations.hide.mutate
      .mockImplementationOnce((_id: string, options: { onError: () => void }) => options.onError())
      .mockImplementationOnce((_id: string, options: { onSuccess: () => void }) =>
        options.onSuccess(),
      );
    const pool = new ReelVideoPool();
    const onRemoveReel = vi.fn();
    const view = renderCard(pool, onRemoveReel);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'Not Interested' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not update your preference');
    expect(onRemoveReel).not.toHaveBeenCalled();
    expect(screen.queryByText('Video hidden')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRemoveReel).toHaveBeenCalledExactlyOnceWith(DEFAULT_SEED_REELS[0].id);
    view.unmount();
    pool.dispose();
  });
});
