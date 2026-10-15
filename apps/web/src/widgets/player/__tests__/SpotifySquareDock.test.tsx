import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotifySquareDock } from '../SpotifySquareDock';
import { SpotifyBottomDock } from '../SpotifyBottomDock';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { usePiPStackStore } from '@/shared/lib/pipStackCoordinator';

describe('SpotifySquareDock (Compact Call-Style Square Player)', () => {
  beforeEach(() => {
    usePiPStackStore.setState({ activeOrder: [] });
    useThemeStore.setState({ spotifyDockStyle: 'square' });
    useSpotifyPlayerStore.setState({
      currentTrack: {
        id: 'track-test-sq',
        title: 'Sekairotten',
        artist: 'pingspoof',
        albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
        durationMs: 121000,
        previewUrl: null,
        spotifyUrl: 'https://open.spotify.com/track/track-test-sq',
      },
      isDockVisible: true,
      isPlaying: true,
      progressMs: 64000,
      durationMs: 121000,
      volume: 0.75,
      isMuted: false,
      isQueueOpen: false,
      isGameModeOpen: false,
    });
  });

  it('renders compact square widget region with track artwork and title', () => {
    render(<SpotifySquareDock />);

    const squarePlayer = screen.getByRole('region', {
      name: /Spotify Compact Square Player/i,
    });
    expect(squarePlayer).toBeInTheDocument();

    const trackTitle = screen.getByText('Sekairotten');
    expect(trackTitle).toBeInTheDocument();
  });

  it('renders top-left expand button and expands into GameModePlayer on click', () => {
    render(<SpotifySquareDock />);

    const expandBtn = screen.getByTitle(/Expand to Fullscreen/i);
    expect(expandBtn).toBeInTheDocument();

    fireEvent.click(expandBtn);
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(true);
  });

  it('renders top-right close button and closes player dock on click', () => {
    render(<SpotifySquareDock />);

    const closeBtn = screen.getByTitle(/Close Player/i);
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(useSpotifyPlayerStore.getState().isDockVisible).toBe(false);
  });

  it('renders duration scrubber slider with elapsed and remaining timestamps', () => {
    render(<SpotifySquareDock />);

    const scrubber = screen.getByTitle(/Seek playback position/i);
    expect(scrubber).toBeInTheDocument();

    // 64000ms is 1:04, 121000ms is 2:01
    expect(screen.getByText('1:04')).toBeInTheDocument();
    expect(screen.getByText('2:01')).toBeInTheDocument();
  });

  it('renders 6 liquid glass buttons in order: Volume, Previous, Play/Pause, Next, Repeat, Queue', () => {
    render(<SpotifySquareDock />);

    const volumeBtn = screen.getByTitle(/Mute/i);
    const prevBtn = screen.getByTitle(/Previous \/ Restart/i);
    const playPauseBtn = screen.getByTitle(/Pause/i);
    const nextBtn = screen.getByTitle(/Next Track/i);
    const repeatBtn = screen.getByTitle(/Repeat off/i);
    const queueBtn = screen.getByTitle(/Playback Queue/i);

    expect(volumeBtn).toBeInTheDocument();
    expect(prevBtn).toBeInTheDocument();
    expect(playPauseBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    expect(repeatBtn).toBeInTheDocument();
    expect(queueBtn).toBeInTheDocument();
  });

  it('toggles repeat track mode with repeat button', () => {
    useSpotifyPlayerStore.setState({ repeatMode: 0 });
    render(<SpotifySquareDock />);

    const repeatBtn = screen.getByTitle(/Repeat off/i);
    expect(repeatBtn).toBeInTheDocument();

    fireEvent.click(repeatBtn);
    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(1);

    fireEvent.click(repeatBtn);
    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(2);

    fireEvent.click(repeatBtn);
    expect(useSpotifyPlayerStore.getState().repeatMode).toBe(0);
  });

  it('toggles playback with play/pause button', () => {
    render(<SpotifySquareDock />);

    const playPauseBtn = screen.getByTitle(/Pause/i);
    fireEvent.click(playPauseBtn);

    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);
  });

  it('toggles mute with volume button', () => {
    render(<SpotifySquareDock />);

    const volumeBtn = screen.getByTitle(/Mute/i);
    fireEvent.click(volumeBtn);

    expect(useSpotifyPlayerStore.getState().isMuted).toBe(true);
  });

  it('toggles queue popover with playback queue button', () => {
    render(<SpotifySquareDock />);

    const queueBtn = screen.getByTitle(/Playback Queue/i);
    fireEvent.click(queueBtn);

    expect(useSpotifyPlayerStore.getState().isQueueOpen).toBe(true);
  });

  it('SpotifyBottomDock renders SpotifySquareDock when spotifyDockStyle is square, and classic dock when bar', () => {
    useThemeStore.setState({ spotifyDockStyle: 'square' });
    const { unmount } = render(<SpotifyBottomDock />);

    expect(
      screen.getByRole('region', { name: /Spotify Compact Square Player/i }),
    ).toBeInTheDocument();

    unmount();

    useThemeStore.setState({ spotifyDockStyle: 'bar' });
    render(<SpotifyBottomDock />);

    expect(screen.getByTestId('spotify-bottom-dock')).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: /Spotify Compact Square Player/i }),
    ).not.toBeInTheDocument();
  });

  it('positions at default bottom 84px, but stacks at 278px when call PiP is already active at bottom', () => {
    usePiPStackStore.setState({ activeOrder: [] });
    const { unmount } = render(<SpotifySquareDock />);

    const squarePlayer = screen.getByRole('region', {
      name: /Spotify Compact Square Player/i,
    });
    // Alone at bottom:
    expect(squarePlayer.style.bottom).toContain('84px');

    unmount();

    // Now pretend Call PiP was already active and registered first:
    usePiPStackStore.setState({ activeOrder: ['call'] });
    render(<SpotifySquareDock />);

    const stackedPlayer = screen.getByRole('region', {
      name: /Spotify Compact Square Player/i,
    });
    // Stacked above Call PiP:
    expect(stackedPlayer.style.bottom).toContain('278px');
  });
});
