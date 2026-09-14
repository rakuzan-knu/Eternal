import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SpotifyBottomDock } from '../SpotifyBottomDock';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

describe('SpotifyBottomDock - Minimization & UX', () => {
  beforeEach(() => {
    useSpotifyPlayerStore.setState({
      currentTrack: {
        id: 'track-test-1',
        title: 'Queen St',
        artist: 'twentythree',
        albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
        durationMs: 128000,
        previewUrl: null,
        spotifyUrl: 'https://open.spotify.com/track/track-test-1',
      },
      isDockVisible: true,
      isDockMinimized: false,
      isPlaying: true,
      progressMs: 52000,
      durationMs: 128000,
      volume: 0.8,
      isMuted: false,
    });
  });

  it('renders full dock with minimize and close buttons in top-right cluster', () => {
    render(<SpotifyBottomDock />);

    const dock = screen.getByTestId('spotify-bottom-dock');
    expect(dock).toBeInTheDocument();

    const minimizeBtn = screen.getByTitle('Minimize player');
    expect(minimizeBtn).toBeInTheDocument();

    const closeBtn = screen.getByTitle('Close player');
    expect(closeBtn).toBeInTheDocument();

    expect(screen.getAllByText('Queen St').length).toBeGreaterThan(0);
  });

  it('smoothly minimizes into compact bottom pill on clicking minimize button', () => {
    render(<SpotifyBottomDock />);

    const minimizeBtn = screen.getByTitle('Minimize player');
    fireEvent.click(minimizeBtn);

    expect(useSpotifyPlayerStore.getState().isDockMinimized).toBe(true);

    const minimizedPill = screen.getByTestId('spotify-dock-minimized');
    expect(minimizedPill).toBeInTheDocument();

    // Verify track title in minimized marquee text
    expect(within(minimizedPill).getByText(/Queen St/)).toBeInTheDocument();
  });

  it('restores full dock when clicking the minimized pill without interrupting playback', () => {
    useSpotifyPlayerStore.setState({ isDockMinimized: true });
    render(<SpotifyBottomDock />);

    const minimizedPill = screen.getByTestId('spotify-dock-minimized');
    expect(minimizedPill).toBeInTheDocument();

    fireEvent.click(minimizedPill);

    expect(useSpotifyPlayerStore.getState().isDockMinimized).toBe(false);
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);
    expect(useSpotifyPlayerStore.getState().progressMs).toBe(52000);

    const fullDock = screen.getByTestId('spotify-bottom-dock');
    expect(fullDock).toBeInTheDocument();
  });

  it('renders queue popover with at most 10 upcoming and 5 recent tracks with correct alignment', () => {
    // Generate 15 upcoming tracks and 8 history tracks to test strict capping
    const mockUpcoming = Array.from({ length: 15 }, (_, i) => ({
      id: `up-track-${i + 1}`,
      title: `Upcoming Song ${i + 1}`,
      artist: 'Artist',
      albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
      durationMs: 180000,
      previewUrl: null,
      spotifyUrl: `https://open.spotify.com/track/up-${i + 1}`,
    }));

    const mockHistory = Array.from({ length: 8 }, (_, i) => ({
      id: `hist-track-${i + 1}`,
      title: `History Song ${i + 1}`,
      artist: 'Artist',
      albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
      durationMs: 180000,
      previewUrl: null,
      spotifyUrl: `https://open.spotify.com/track/hist-${i + 1}`,
    }));

    useSpotifyPlayerStore.setState({
      queue: mockUpcoming,
      history: mockHistory,
      isQueueOpen: true,
    });

    render(<SpotifyBottomDock />);

    const popover = screen.getByTestId('spotify-queue-popover');
    expect(popover).toBeInTheDocument();

    // Verify max 10 upcoming songs rendered
    expect(within(popover).getByText('Upcoming Song 1')).toBeInTheDocument();
    expect(within(popover).getByText('Upcoming Song 10')).toBeInTheDocument();
    expect(within(popover).queryByText('Upcoming Song 11')).not.toBeInTheDocument();

    // Verify header indicates 10 of 15
    expect(within(popover).getByText(/Next up \(10 of 15\)/)).toBeInTheDocument();

    // Verify popover is horizontally centered over the queue icon
    expect(popover.className).toContain('left-1/2');
    expect(popover.className).toContain('-translate-x-1/2');

    // Verify max 5 recent songs rendered
    expect(within(popover).getByText('History Song 1')).toBeInTheDocument();
    expect(within(popover).getByText('History Song 5')).toBeInTheDocument();
    expect(within(popover).queryByText('History Song 6')).not.toBeInTheDocument();
    expect(within(popover).getByText(/Recently Played \(5\)/)).toBeInTheDocument();
  });

  it('triggers refresh when clicking refresh button in queue popover header', () => {
    const loadInfiniteSpy = vi.fn();
    useSpotifyPlayerStore.setState({
      queue: [],
      isQueueOpen: true,
      loadInfiniteAudioQueue: loadInfiniteSpy,
    });

    render(<SpotifyBottomDock />);

    const popover = screen.getByTestId('spotify-queue-popover');
    expect(popover).toBeInTheDocument();

    const refreshBtn = screen.getByTitle('Refresh recommendations (next 10)');
    fireEvent.click(refreshBtn);

    expect(loadInfiniteSpy).toHaveBeenCalledWith(true);
  });

  it('toggles game mode when clicking gamepad button in dock', () => {
    render(<SpotifyBottomDock />);

    const gameModeBtn = screen.getByTestId('spotify-game-mode-button');
    expect(gameModeBtn).toBeInTheDocument();

    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);
    fireEvent.click(gameModeBtn);
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(true);

    fireEvent.click(gameModeBtn);
    expect(useSpotifyPlayerStore.getState().isGameModeOpen).toBe(false);
  });

  it('keeps elapsed time position intact on pause without resetting to 0:00', () => {
    render(<SpotifyBottomDock />);

    // Initially progress is 52000ms -> "0:52"
    expect(screen.getByText('0:52')).toBeInTheDocument();

    const pauseBtn = screen.getByTitle('Pause');
    fireEvent.click(pauseBtn);

    // Player is paused, but time should still be "0:52"
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);
    expect(useSpotifyPlayerStore.getState().progressMs).toBe(52000);
    expect(screen.getByText('0:52')).toBeInTheDocument();
    expect(screen.queryByText('0:00')).not.toBeInTheDocument();
  });

  it('preserves dock visibility and paused timecode across page reloads', () => {
    // Simulate rehydration from localStorage
    const savedState = {
      state: {
        currentTrack: {
          id: 'sc-12345',
          title: 'Sunset Vibes',
          artist: 'Ambient Sound',
          albumArt: '',
          durationMs: 180000,
          previewUrl: null,
          spotifyUrl: 'https://soundcloud.com/test',
          source: 'soundcloud',
        },
        isDockVisible: true,
        isDockMinimized: false,
        isPlaying: true, // was playing before reload
        progressMs: 73000, // 1:13
        durationMs: 180000,
      },
      version: 0,
    };

    localStorage.setItem('spotify-player-storage-v2', JSON.stringify(savedState));

    // Trigger rehydration
    useSpotifyPlayerStore.persist.rehydrate();

    const state = useSpotifyPlayerStore.getState();
    expect(state.isDockVisible).toBe(true);
    expect(state.isPlaying).toBe(false); // strictly paused on reload!
    expect(state.progressMs).toBe(73000); // 1:13 preserved!
    expect(state.currentTrack?.title).toBe('Sunset Vibes');
  });
});
