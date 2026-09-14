import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotifyGameModePlayer } from '../SpotifyGameModePlayer';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

describe('SpotifyGameModePlayer (Apple Music Liquid Style)', () => {
  const mockTrack = {
    id: 'track-interstellar-1',
    title: 'No Time for Caution',
    artist: 'Hans Zimmer',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    durationMs: 246000,
    previewUrl: null,
    spotifyUrl: 'https://open.spotify.com/track/track-interstellar-1',
  };

  beforeEach(() => {
    useSpotifyPlayerStore.setState({
      currentTrack: mockTrack,
      isPlaying: true,
      progressMs: 51000,
      durationMs: 246000,
      volume: 0.8,
      isMuted: false,
      isGameModeOpen: true,
      isLiked: false,
      isLyricsOpen: false,
      isQueueOpen: false,
      queue: [],
      history: [],
    });
  });

  it('renders fullscreen Apple Music player with center album art, title, and artist', () => {
    render(<SpotifyGameModePlayer />);

    const player = screen.getByTestId('spotify-game-mode-player');
    expect(player).toBeInTheDocument();

    expect(screen.getByText('No Time for Caution')).toBeInTheDocument();
    expect(screen.getByText('Hans Zimmer')).toBeInTheDocument();
    expect(screen.getByText('Game Mode')).toBeInTheDocument();
    expect(screen.queryByText(/Lossless/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Spotify Web Playback/i)).not.toBeInTheDocument();
    expect(screen.getByTitle('Lyrics (Karaoke)')).toBeInTheDocument();
    expect(screen.getByTitle('Playback queue')).toBeInTheDocument();
  });

  it('closes game mode when clicking the close button', () => {
    render(<SpotifyGameModePlayer />);

    const closeBtn = screen.getByTitle('Exit Game Mode (Esc)');
    fireEvent.click(closeBtn);

    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);
  });

  it('closes game mode when pressing Escape key', () => {
    render(<SpotifyGameModePlayer />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);
  });

  it('toggles play/pause when clicking the large hero play/pause button and preserves progress time', () => {
    render(<SpotifyGameModePlayer />);

    // Initially progress is 51000ms -> "0:51"
    expect(screen.getByText('0:51')).toBeInTheDocument();

    const pauseBtn = screen.getByTitle('Pause');
    fireEvent.click(pauseBtn);

    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);
    expect(useSpotifyPlayerStore.getState().progressMs).toBe(51000);
    expect(screen.getByText('0:51')).toBeInTheDocument();
    expect(screen.queryByText('0:00')).not.toBeInTheDocument();
  });

  it('does not render when isGameModeOpen is false', () => {
    useSpotifyPlayerStore.setState({ isGameModeOpen: false });
    render(<SpotifyGameModePlayer />);

    expect(screen.queryByTestId('spotify-game-mode-player')).not.toBeInTheDocument();
  });

  it('adds game-mode-active class and sets scrollbarGutter auto when opened, and cleans up on unmount', () => {
    const { unmount } = render(<SpotifyGameModePlayer />);

    expect(document.documentElement.classList.contains('game-mode-active')).toBe(true);
    expect(document.body.classList.contains('game-mode-active')).toBe(true);
    expect(document.documentElement.style.scrollbarGutter).toBe('auto');
    expect(document.documentElement.style.overflow).toBe('hidden');

    unmount();

    expect(document.documentElement.classList.contains('game-mode-active')).toBe(false);
    expect(document.body.classList.contains('game-mode-active')).toBe(false);
  });
});
