import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SpotifyMobilePlayerSheet } from '../SpotifyMobilePlayerSheet';

const player = vi.hoisted(() => ({
  isMobileExpanded: true,
  setMobileExpanded: vi.fn(),
  currentTrack: {
    id: 'track',
    title: 'Test track',
    artist: 'Artist',
    albumArt: '/art.png',
    spotifyUrl: 'https://open.spotify.com/track/test',
  },
  isPlaying: false,
  progressMs: 10_000,
  durationMs: 120_000,
  isLiked: false,
  repeatMode: 0,
  isShuffled: false,
  volume: 0.5,
  isMuted: false,
  isLyricsOpen: false,
  togglePlay: vi.fn(),
  seek: vi.fn(),
  prevTrack: vi.fn(),
  nextTrack: vi.fn(),
  toggleRepeat: vi.fn(),
  toggleShuffle: vi.fn(),
  toggleLike: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  toggleLyrics: vi.fn(),
  toggleQueue: vi.fn(),
}));

vi.mock('@/shared/model/useSpotifyPlayerStore', () => ({
  useSpotifyPlayerStore: (selector: (state: typeof player) => unknown) => selector(player),
}));

describe('SpotifyMobilePlayerSheet accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    player.durationMs = 120_000;
  });

  it('exposes named native seek and volume controls without losing their actions', () => {
    render(<SpotifyMobilePlayerSheet />);
    const seek = screen.getByRole('slider', { name: 'Playback position' });
    expect(seek).toHaveAttribute('aria-valuetext', '0:10 / 2:00');
    fireEvent.change(seek, { target: { value: '30000' } });
    expect(player.seek).toHaveBeenCalledWith(30_000);
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '0.7' } });
    expect(player.setVolume).toHaveBeenCalledWith(0.7);
  });

  it('allows keyboard activation of named playback controls', async () => {
    const user = userEvent.setup();
    render(<SpotifyMobilePlayerSheet />);
    screen.getByRole('button', { name: /^Play$/ }).focus();
    await user.keyboard('{Enter}');
    expect(player.togglePlay).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Shuffle' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Like track' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Close player' })).toBeInTheDocument();
  });

  it('disables seeking until the duration is known', () => {
    player.durationMs = 0;
    render(<SpotifyMobilePlayerSheet />);
    expect(screen.getByRole('slider', { name: 'Playback position' })).toBeDisabled();
  });
});
