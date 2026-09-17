import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MusicTrackDetailView } from '../ui/MusicTrackDetailView';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';

const { mockPlayTrack, mockTogglePlay } = vi.hoisted(() => ({
  mockPlayTrack: vi.fn(),
  mockTogglePlay: vi.fn(),
}));

vi.mock('@/shared/model/useSpotifyPlayerStore', () => {
  const state = {
    currentTrack: null,
    isPlaying: false,
    playTrack: mockPlayTrack,
    togglePlay: mockTogglePlay,
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    queue: [],
  };
  return {
    useSpotifyPlayerStore: Object.assign(
      (selector?: any) => (typeof selector === 'function' ? selector(state) : state),
      {
        getState: () => state,
      },
    ),
  };
});

vi.mock('@/entities/showcase/api/integrationsApi', () => ({
  integrationsApi: {
    getSpotifyLyrics: vi.fn(),
    getSpotifyQueue: vi.fn(),
    getSoundCloudRelated: vi.fn(),
    searchSoundCloudCatalog: vi.fn(),
    searchSpotifyCatalog: vi.fn(),
    getSoundCloudTrack: vi.fn(),
    addLikedTrack: vi.fn().mockResolvedValue({ success: true }),
    removeLikedTrack: vi.fn().mockResolvedValue({ success: true }),
    getLikedTracks: vi.fn().mockResolvedValue([]),
    syncLikedTracks: vi.fn().mockResolvedValue([]),
  },
}));

describe('MusicTrackDetailView', () => {
  const sampleTrack = {
    id: 'sc-12345',
    title: 'Neon Drift',
    artist: 'Cyber Artist',
    album: 'Cyber EP',
    albumArt: 'https://example.com/neon.jpg',
    durationMs: 215000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/cyber/neon-drift',
    source: 'soundcloud' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useMusicHubStore.setState({
      cachedTracks: { [sampleTrack.id]: sampleTrack },
      likedTracks: [],
      catalogPlaylists: [
        {
          id: 'playlist-1',
          title: 'Synthwave Hits',
          coverUrl: '',
          description: '',
          creator: 'MusicHub',
          createdAt: '2026-01-01T00:00:00Z',
          tracks: [
            sampleTrack,
            {
              id: 'sc-12346',
              title: 'Retro Highway',
              artist: 'Cyber Artist',
              album: 'Cyber EP',
              albumArt: '',
              durationMs: 180000,
              previewUrl: null,
              spotifyUrl: '',
              source: 'soundcloud' as const,
            },
            {
              id: 'sc-12347',
              title: 'Midnight City Lights',
              artist: 'Night Drive',
              album: 'City',
              albumArt: '',
              durationMs: 200000,
              previewUrl: null,
              spotifyUrl: '',
              source: 'soundcloud' as const,
            },
          ],
        },
      ],
    });

    (integrationsApi.getSpotifyLyrics as any).mockResolvedValue({
      hasLyrics: false,
      lines: [],
    });

    (integrationsApi.getSpotifyQueue as any).mockResolvedValue({
      tracks: [
        {
          id: 'sp-rec-1',
          title: 'Future Echoes',
          artist: 'Waveform',
          albumArt: '',
          durationMs: 190000,
          spotifyUrl: 'https://open.spotify.com/track/sp-rec-1',
        },
      ],
    });

    (integrationsApi.getSoundCloudRelated as any).mockResolvedValue([
      {
        id: 'sc-rec-1',
        title: 'Synth Odyssey',
        artist: 'Cyber Artist',
        albumArt: '',
        durationMs: 190000,
        streamUrl: '/stream/rec1',
        source: 'soundcloud',
      },
    ]);

    (integrationsApi.searchSoundCloudCatalog as any).mockResolvedValue([
      {
        id: 'sc-rec-2',
        title: 'Cyber Odyssey',
        artist: 'Cyber Artist',
        albumArt: '',
        durationMs: 190000,
        streamUrl: '/stream/rec2',
        source: 'soundcloud',
      },
    ]);
  });

  it('renders track hero header with badge, title, artist, duration, and play button', async () => {
    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-12345" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Song')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Neon Drift' })).toBeInTheDocument();
    expect(screen.getAllByText('Cyber Artist').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument();
  });

  it('toggles like when Heart button is clicked', async () => {
    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-12345" />
      </MemoryRouter>,
    );

    const likeBtn = screen.getByRole('button', { name: /add to liked/i });
    expect(likeBtn).toBeInTheDocument();

    fireEvent.click(likeBtn);
    expect(useMusicHubStore.getState().isTrackLiked('sc-12345')).toBe(true);
  });

  it('plays track when hero Play button is clicked', async () => {
    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-12345" />
      </MemoryRouter>,
    );

    const playBtn = screen.getByRole('button', { name: /^play$/i });
    fireEvent.click(playBtn);
    expect(mockPlayTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sc-12345', title: 'Neon Drift' }),
      undefined,
      expect.any(String),
    );
  });

  it('renders fallback for SoundCloud track lyrics when not available', async () => {
    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-12345" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Lyrics are not available for this track yet')).toBeInTheDocument();
    });
  });

  it('renders author section and recommendations', async () => {
    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-12345" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Artist')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Popular tracks:')).toBeInTheDocument();

    // Verify SoundCloud recommendations load
    await waitFor(() => {
      expect(screen.getByText('Synth Odyssey')).toBeInTheDocument();
    });
  });

  it('opens 3-dots menu on hero button click', async () => {
    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-12345" />
      </MemoryRouter>,
    );

    const dotsBtn = screen.getByRole('button', {
      name: /more actions for neon drift/i,
    });
    expect(dotsBtn).toBeInTheDocument();

    fireEvent.click(dotsBtn);

    // Verify TrackActionMenu buttons appear
    expect(screen.getByText('Add to Playlist')).toBeInTheDocument();
    expect(screen.getByText('Add to Queue')).toBeInTheDocument();
    expect(screen.getByText('View Credits')).toBeInTheDocument();
  });

  it('transitions from async loading state without Rules of Hooks violations', async () => {
    (integrationsApi.getSoundCloudTrack as any).mockResolvedValueOnce({
      id: '999999',
      title: 'Async Loaded Jam',
      artist: 'Cloud Producer',
      albumArt: 'https://example.com/jam.jpg',
      durationMs: 240000,
      spotifyUrl: 'https://soundcloud.com/jam',
      streamUrl: '/stream/999999',
    });

    render(
      <MemoryRouter>
        <MusicTrackDetailView trackId="sc-999999" />
      </MemoryRouter>,
    );

    // Track should load and render without throwing "Rendered more hooks than during previous render"
    await waitFor(() => {
      expect(screen.getAllByText('Async Loaded Jam').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Cloud Producer').length).toBeGreaterThan(0);
    });
  });
});
