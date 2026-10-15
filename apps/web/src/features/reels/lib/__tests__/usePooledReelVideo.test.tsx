import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelVideoPool } from '../reelVideoPool';
import { usePooledReelVideo } from '../usePooledReelVideo';
import { ReelProgressBar } from '../../ui/ReelProgressBar';
import { ReelSubtitlesOverlay } from '../../ui/ReelSubtitlesOverlay';

let intersect!: (entries: Partial<IntersectionObserverEntry>[]) => void;
const played = vi.fn();
function Player({
  pool,
  active = true,
  src = '/first.mp4',
}: {
  pool: ReelVideoPool;
  active?: boolean;
  src?: string;
}) {
  const player = usePooledReelVideo({
    pool,
    reelId: src,
    src,
    isActive: active,
    isMuted: true,
    volume: 1,
    playbackRate: 1,
    onPlayed: played,
  });
  return (
    <>
      <div ref={player.hostRef} data-testid="video-host" />
      <span>{player.isPlaying ? 'playing' : 'paused'}</span>
      <button onClick={() => player.pause()}>Pause</button>
      <button
        onClick={() => {
          void player.play();
        }}
      >
        Play
      </button>
      {player.hasVideo && (
        <ReelProgressBar
          key={`progress-${player.videoKey}`}
          videoRef={player.videoRef}
          onSeek={player.seek}
        />
      )}
      {player.hasVideo && (
        <ReelSubtitlesOverlay
          key={`subtitles-${player.videoKey}`}
          videoRef={player.videoRef}
          cues={[
            { id: 'first', start: 0, end: 4, text: 'First line' },
            { id: 'second', start: 5, end: 9, text: 'Second line' },
          ]}
          subtitleLanguage="en"
        />
      )}
    </>
  );
}

async function visibility(ratio: number) {
  await act(async () => {
    intersect([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
  });
}

describe('usePooledReelVideo', () => {
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

  it('does not acquire or autoplay offscreen and releases below 50% visibility', async () => {
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    expect(view.container.querySelector('video')).toBeNull();
    await visibility(0.49);
    expect(view.container.querySelector('video')).toBeNull();
    await visibility(0.5);
    const video = view.container.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('/first.mp4');
    expect(screen.getByText('playing')).toBeInTheDocument();
    await visibility(0.49);
    expect(screen.getByText('paused')).toBeInTheDocument();
    expect(video.getAttribute('src')).toBeNull();
    expect(video.srcObject).toBeNull();
    expect(view.container.querySelector('video')).toBeNull();
    view.unmount();
    pool.dispose();
  });

  it('releases hidden-page sources and resumes visible cards on return', async () => {
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    const oldVideo = view.container.querySelector('video')!;
    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(oldVideo.getAttribute('src')).toBeNull();
    expect(view.container.querySelector('video')).toBeNull();
    await act(async () => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(view.container.querySelector('video')?.getAttribute('src')).toBe('/first.mp4');
    expect(screen.getByText('playing')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('does not record a view or revive playback when an offscreen play promise resolves', async () => {
    let finishPlay!: () => void;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPlay = resolve;
        }),
    );
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    await visibility(0.1);
    await act(async () => {
      finishPlay();
    });
    expect(played).not.toHaveBeenCalled();
    expect(screen.getByText('paused')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('keeps a manually paused reel paused across visibility changes', async () => {
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    fireEvent.click(screen.getByText('Pause'));
    await visibility(0);
    await visibility(1);
    expect(screen.getByText('paused')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByText('Play'));
    });
    expect(screen.getByText('playing')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('pauses an inactive reel without replaying queued play events', async () => {
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    const video = view.container.querySelector('video')!;
    view.rerender(<Player pool={pool} active={false} />);
    await act(async () => {
      fireEvent.play(video);
    });
    expect(screen.getByText('paused')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('keeps a newer play state when an older pending play completes', async () => {
    let finishOldPlay!: () => void;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishOldPlay = resolve;
        }),
    );
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    fireEvent.click(screen.getByText('Pause'));
    await act(async () => {
      fireEvent.click(screen.getByText('Play'));
    });
    expect(screen.getByText('playing')).toBeInTheDocument();
    await act(async () => {
      finishOldPlay();
    });
    expect(screen.getByText('playing')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('ignores a queued pause event when the recycled node is already playing', async () => {
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    const video = view.container.querySelector('video')!;
    Object.defineProperty(video, 'paused', { value: false, configurable: true });
    fireEvent.pause(video);
    expect(screen.getByText('playing')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('rebinds progress and subtitles when a recycled physical node changes', async () => {
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    const first = view.container.querySelector('video')!;
    Object.defineProperty(first, 'duration', { value: 10, configurable: true });
    first.currentTime = 2;
    fireEvent.timeUpdate(first);
    expect(screen.getByText('First line')).toBeInTheDocument();
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '20%' });
    await visibility(0);
    view.rerender(<Player pool={pool} src="/second.mp4" />);
    await visibility(1);
    const second = view.container.querySelector('video')!;
    expect(second).not.toBe(first);
    Object.defineProperty(second, 'duration', { value: 10, configurable: true });
    second.currentTime = 7;
    fireEvent.timeUpdate(second);
    expect(screen.getByText('Second line')).toBeInTheDocument();
    expect(screen.getByRole('progressbar').firstElementChild).toHaveStyle({ width: '70%' });
    first.currentTime = 3;
    fireEvent.timeUpdate(first);
    expect(screen.getByText('Second line')).toBeInTheDocument();
    view.unmount();
    pool.dispose();
  });

  it('clears a mounted source and ignores playback completion after unmount', async () => {
    let finishPlay!: () => void;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishPlay = resolve;
        }),
    );
    const pool = new ReelVideoPool();
    const view = render(<Player pool={pool} />);
    await visibility(1);
    const video = view.container.querySelector('video')!;
    view.unmount();
    expect(video.getAttribute('src')).toBeNull();
    await act(async () => {
      finishPlay();
    });
    expect(played).not.toHaveBeenCalled();
    pool.dispose();
  });
});
