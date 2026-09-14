import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpotifyQueuePopover } from '../SpotifyQueuePopover';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';

describe('SpotifyQueuePopover', () => {
  const mockSpotifyTrack = {
    id: 'track-1',
    title: 'Interstellar Theme',
    artist: 'Hans Zimmer',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    durationMs: 240000,
    previewUrl: null,
    spotifyUrl: 'https://open.spotify.com/track/1',
    source: 'spotify' as const,
  };

  const mockSoundCloudTrack = {
    id: 'sc-1553270944',
    title: 'Under Your Spell',
    artist: 'Snow Strippers',
    albumArt: 'https://i1.sndcdn.com/artworks-pQKwFPNySXH4X6cs-4PsYcQ-t500x500.jpg',
    artistAvatar: 'https://i1.sndcdn.com/avatars-n0thhtGuGRrGRVYL-qqcIzA-t500x500.jpg',
    durationMs: 218000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/snowstrippers/under-your-spell-1',
    source: 'soundcloud' as const,
  };

  beforeEach(() => {
    useSpotifyPlayerStore.setState({
      currentTrack: mockSpotifyTrack,
      isPlaying: true,
      progressMs: 15000,
      durationMs: 240000,
      isQueueOpen: true,
      queue: [
        {
          id: 'sc-2',
          title: 'Love Potions',
          artist: 'BJ Lips',
          albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
          durationMs: 180000,
          previewUrl: null,
          spotifyUrl: 'https://soundcloud.com/track-2',
          source: 'soundcloud' as const,
        },
      ],
      history: [],
      isLoadingQueue: false,
    });
  });

  it('renders queue header and current track with Spotify green accents when currentTrack is Spotify', () => {
    render(<SpotifyQueuePopover />);

    const popover = screen.getByTestId('spotify-queue-popover');
    expect(popover).toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
    expect(screen.getByText('Interstellar Theme')).toBeInTheDocument();

    // Live equalizer bars should use green bg
    const equalizerBars = popover.querySelectorAll(
      'span.animate-\\[liveEqualizer_0\\.9s_ease-in-out_infinite\\]',
    );
    expect(equalizerBars.length).toBeGreaterThan(0);
    expect(equalizerBars[0].className).toContain('bg-[#1DB954]');
  });

  it('renders queue with dynamic SoundCloud orange accents when playing from SoundCloud', () => {
    useSpotifyPlayerStore.setState({
      currentTrack: mockSoundCloudTrack,
    });

    render(<SpotifyQueuePopover />);

    const popover = screen.getByTestId('spotify-queue-popover');
    expect(popover).toBeInTheDocument();
    expect(screen.getByText('Under Your Spell')).toBeInTheDocument();
    expect(screen.getByText('Snow Strippers')).toBeInTheDocument();

    // Equalizer bars must be orange (#FF5500)
    const equalizerBars = popover.querySelectorAll(
      'span.animate-\\[liveEqualizer_0\\.9s_ease-in-out_infinite\\]',
    );
    expect(equalizerBars.length).toBeGreaterThan(0);
    expect(equalizerBars[0].className).toContain('bg-[#FF5500]');
  });

  it('closes smoothly when clicking outside the popover', () => {
    render(
      <div>
        <div data-testid="outside-area">Outside</div>
        <SpotifyQueuePopover />
      </div>,
    );

    expect(useSpotifyPlayerStore.getState().isQueueOpen).toBe(true);

    const outside = screen.getByTestId('outside-area');
    fireEvent.pointerDown(outside);

    expect(useSpotifyPlayerStore.getState().isQueueOpen).toBe(false);
  });

  it('does NOT close when clicking inside the popover', () => {
    render(<SpotifyQueuePopover />);

    expect(useSpotifyPlayerStore.getState().isQueueOpen).toBe(true);

    const popover = screen.getByTestId('spotify-queue-popover');
    fireEvent.pointerDown(popover);

    expect(useSpotifyPlayerStore.getState().isQueueOpen).toBe(true);
  });

  it('does NOT close when clicking a queue toggle button', () => {
    render(
      <div>
        <button type="button" data-queue-toggle="true" data-testid="toggle-btn">
          Toggle
        </button>
        <SpotifyQueuePopover />
      </div>,
    );

    const toggleBtn = screen.getByTestId('toggle-btn');
    fireEvent.pointerDown(toggleBtn);

    // Should not close on pointerdown on toggle button
    expect(useSpotifyPlayerStore.getState().isQueueOpen).toBe(true);
  });

  it('falls back to artistAvatar or default image on image load error', () => {
    useSpotifyPlayerStore.setState({
      currentTrack: mockSoundCloudTrack,
    });

    render(<SpotifyQueuePopover />);

    const img = screen.getByAltText('Under Your Spell') as HTMLImageElement;
    expect(img.src).toContain('artworks-pQKwFPNySXH4X6cs-4PsYcQ-t500x500.jpg');

    // Simulate 404 error
    fireEvent.error(img);

    // img src should have changed to artistAvatar
    expect(img.src).toContain('avatars-n0thhtGuGRrGRVYL-qqcIzA-t500x500.jpg');
  });
});
