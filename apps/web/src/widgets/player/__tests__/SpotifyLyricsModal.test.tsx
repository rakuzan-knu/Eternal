import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpotifyLyricsModal } from '../SpotifyLyricsModal';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';

vi.mock('@/entities/showcase/api/integrationsApi', () => ({
  integrationsApi: {
    getSpotifyLyrics: vi.fn(),
  },
}));

describe('SpotifyLyricsModal', () => {
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
    title: 'SUICIDAL-IDOL - ecstacy (super slowed)',
    artist: 'Kurate Music',
    albumArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    artistAvatar: 'https://i1.sndcdn.com/avatars-n0thhtGuGRrGRVYL-qqcIzA-t500x500.jpg',
    durationMs: 136000,
    previewUrl: null,
    spotifyUrl: 'https://soundcloud.com/kurate/suicidal-idol-ecstacy',
    source: 'soundcloud' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (integrationsApi.getSpotifyLyrics as any).mockResolvedValue({
      synced: true,
      lines: [
        { timeMs: 0, text: 'First line of the song' },
        { timeMs: 5000, text: 'Second line of the song' },
      ],
    });

    useSpotifyPlayerStore.setState({
      currentTrack: mockSpotifyTrack,
      isPlaying: true,
      progressMs: 6000,
      durationMs: 240000,
      isLyricsOpen: true,
    });
  });

  it('renders modal with Spotify green accents when currentTrack is Spotify', async () => {
    render(<SpotifyLyricsModal />);

    await waitFor(() => {
      expect(screen.getByText('First line of the song')).toBeInTheDocument();
    });

    expect(screen.getByText('Interstellar Theme')).toBeInTheDocument();
    expect(screen.getByText('Hans Zimmer')).toBeInTheDocument();

    const karaokeBadge = screen.getByText('Karaoke').parentElement;
    expect(karaokeBadge?.className).toContain('text-[#1DB954]');
  });

  it('renders modal with dynamic SoundCloud orange accents when playing from SoundCloud', async () => {
    useSpotifyPlayerStore.setState({
      currentTrack: mockSoundCloudTrack,
    });

    render(<SpotifyLyricsModal />);

    await waitFor(() => {
      expect(screen.getByText('First line of the song')).toBeInTheDocument();
    });

    expect(screen.getByText('SUICIDAL-IDOL - ecstacy (super slowed)')).toBeInTheDocument();

    const karaokeBadge = screen.getByText('Karaoke').parentElement;
    expect(karaokeBadge?.className).toContain('text-[#FF5500]');
  });

  it('displays empty state when lyrics are unavailable', async () => {
    (integrationsApi.getSpotifyLyrics as any).mockResolvedValue({
      synced: false,
      lines: [],
    });

    useSpotifyPlayerStore.setState({
      currentTrack: mockSoundCloudTrack,
    });

    render(<SpotifyLyricsModal />);

    await waitFor(() => {
      expect(screen.getByText('Lyrics are not available yet')).toBeInTheDocument();
    });
  });

  it('closes modal when clicking close button', () => {
    render(<SpotifyLyricsModal />);

    const closeBtn = screen.getByTitle('Close (Esc)');
    fireEvent.click(closeBtn);

    expect(useSpotifyPlayerStore.getState().isLyricsOpen).toBe(false);
  });
});
