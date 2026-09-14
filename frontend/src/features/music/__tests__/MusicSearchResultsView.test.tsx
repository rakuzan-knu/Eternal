import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MusicSearchResultsView } from '../ui/MusicSearchResultsView';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { MemoryRouter } from 'react-router-dom';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

const mockPlayTrack = vi.fn();
const mockTogglePlay = vi.fn();

vi.mock('@/shared/model/useSpotifyPlayerStore', () => ({
  useSpotifyPlayerStore: (selector: any) =>
    selector({
      currentTrack: null,
      isPlaying: false,
      playTrack: mockPlayTrack,
      togglePlay: mockTogglePlay,
      toggleShuffle: vi.fn(),
      isShuffled: false,
    }),
}));

vi.mock('@/shared/model/useSpotifyDockOffset', () => ({
  useSpotifyDockOffset: () => ({
    dockOffset: 0,
    composerPaddingBottom: 8,
    isDockActive: false,
    isDockMinimized: false,
  }),
}));

vi.mock('@/entities/showcase/api/integrationsApi', () => ({
  integrationsApi: {
    searchSoundCloudCatalog: vi.fn(),
    searchSpotifyCatalog: vi.fn(),
    searchSoundCloudPlaylists: vi.fn(),
    searchSpotifyPlaylists: vi.fn(),
    getSpotifyPlaylist: vi.fn(),
    getSoundCloudPlaylist: vi.fn(),
  },
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
  }),
}));

describe('MusicSearchResultsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMusicHubStore.setState({
      selectedPlaylistId: null,
      likedTracks: [],
      playlists: [],
      customPlaylists: [],
    });

    (integrationsApi.searchSoundCloudCatalog as any).mockResolvedValue([
      {
        id: 'sc-1',
        title: 'VYZEE (UP UP UP, WE CAN GO LOCO)',
        artist: 'GO LOCO',
        album: 'VYZEE LOCO',
        albumArt: 'https://example.com/cover1.jpg',
        durationMs: 176000,
        streamUrl: '/stream/sc-1',
        source: 'soundcloud',
      },
    ]);

    (integrationsApi.searchSpotifyCatalog as any).mockResolvedValue([
      {
        id: 'sp-1',
        title: 'VYZEE',
        artist: 'SOPHIE',
        album: 'PRODUCT',
        albumArt: 'https://example.com/cover2.jpg',
        duration_ms: 202000,
        spotifyUrl: 'https://spotify.com/track/sp-1',
        source: 'spotify',
      },
    ]);
    (integrationsApi.searchSoundCloudPlaylists as any).mockResolvedValue([
      {
        id: 'sc-pl-1',
        title: 'VYZEE SoundCloud Playlist',
        description: 'SoundCloud vibes',
        coverUrl: 'https://example.com/sc-cover.jpg',
        creator: 'SoundCloud DJ',
        trackCount: 15,
        source: 'soundcloud',
      },
    ]);

    (integrationsApi.searchSpotifyPlaylists as any).mockResolvedValue([
      {
        id: 'sp-pl-1',
        title: 'VYZEE Spotify Playlist',
        description: 'Spotify mix',
        coverUrl: 'https://example.com/sp-cover.jpg',
        creator: 'Spotify Curator',
        trackCount: 25,
        source: 'spotify',
      },
    ]);
  });

  it('renders category filter pills (All, Songs, Playlists)', async () => {
    renderWithRouter(<MusicSearchResultsView query="VYZEE" source="all" />);

    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^songs$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^playlists$/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('VYZEE (UP UP UP, WE CAN GO LOCO)')).toBeInTheDocument();
    });
  });

  it('renders both songs and playlists with proper subtitles in "All" filter', async () => {
    renderWithRouter(<MusicSearchResultsView query="VYZEE" source="all" />);

    await waitFor(() => {
      expect(screen.getByText('VYZEE (UP UP UP, WE CAN GO LOCO)')).toBeInTheDocument();
    });

    // Check proper "Song • GO LOCO" subtitle under track
    const songLabels = screen.getAllByText('Song');
    expect(songLabels.length).toBeGreaterThan(0);

    // Check matching playlist rendered under "Playlists" with "Playlist • [Creator]"
    expect(screen.getByText('VYZEE - Up, Up, Up - Slowed')).toBeInTheDocument();
    const playlistLabels = screen.getAllByText(/Playlist •/i);
    expect(playlistLabels.length).toBeGreaterThan(0);
  });

  it('renders platform brand icons on tracks and playlists ONLY when source is "all"', async () => {
    renderWithRouter(<MusicSearchResultsView query="VYZEE" source="all" />);

    await waitFor(() => {
      expect(screen.getByText('VYZEE (UP UP UP, WE CAN GO LOCO)')).toBeInTheDocument();
    });

    // In "All", platform badges for SoundCloud and Spotify should be present
    const soundcloudBadges = screen.getAllByTitle('SoundCloud');
    const spotifyBadges = screen.getAllByTitle('Spotify');
    expect(soundcloudBadges.length).toBeGreaterThan(0);
    expect(spotifyBadges.length).toBeGreaterThan(0);
  });

  it('strictly excludes opposite platform results and hides brand icons when filtered to soundcloud or spotify', async () => {
    // 1. When filtered to soundcloud:
    const { unmount } = renderWithRouter(
      <MusicSearchResultsView query="VYZEE" source="soundcloud" />,
    );

    await waitFor(() => {
      expect(screen.getByText('VYZEE (UP UP UP, WE CAN GO LOCO)')).toBeInTheDocument();
    });

    // Spotify track must NOT appear
    expect(screen.queryByText('SOPHIE')).not.toBeInTheDocument();
    // Brand badges should NOT be rendered when source is specifically 'soundcloud'
    expect(screen.queryByTitle('SoundCloud')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Spotify')).not.toBeInTheDocument();

    unmount();

    // 2. When filtered to spotify:
    renderWithRouter(<MusicSearchResultsView query="VYZEE" source="spotify" />);

    await waitFor(() => {
      expect(screen.getByText('VYZEE')).toBeInTheDocument();
    });

    // SoundCloud track must NOT appear
    expect(screen.queryByText('GO LOCO')).not.toBeInTheDocument();
    // Brand badges should NOT be rendered when source is specifically 'spotify'
    expect(screen.queryByTitle('SoundCloud')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Spotify')).not.toBeInTheDocument();
  });

  it('switches to "Songs" filter and toggles columns visibility via dropdown', async () => {
    renderWithRouter(<MusicSearchResultsView query="VYZEE" source="all" />);

    await waitFor(() => {
      expect(screen.getByText('VYZEE (UP UP UP, WE CAN GO LOCO)')).toBeInTheDocument();
    });

    // Switch to "Songs"
    fireEvent.click(screen.getByRole('button', { name: /^songs$/i }));

    // Verify table headers are rendered
    expect(screen.getByText('Title')).toBeInTheDocument();

    // Open columns settings dropdown
    const columnsBtn = screen.getByRole('button', { name: /configure columns/i });
    fireEvent.click(columnsBtn);

    const columnsMenu = screen.getByText('Columns').parentElement!;
    expect(columnsMenu).toBeInTheDocument();

    // Toggle Album column off inside columns menu
    const albumToggle = within(columnsMenu).getByText('Album');
    fireEvent.click(albumToggle);

    // Album column is now hidden in the table
    expect(screen.queryByRole('columnheader', { name: /album/i })).not.toBeInTheDocument();
  });

  it('switches to "Playlists" filter and starts playback via hover Play button', async () => {
    renderWithRouter(<MusicSearchResultsView query="VYZEE" source="all" />);

    // Switch to "Playlists"
    fireEvent.click(screen.getByRole('button', { name: /^playlists$/i }));

    await waitFor(() => {
      expect(screen.getByText('VYZEE - Up, Up, Up - Slowed')).toBeInTheDocument();
    });

    // Play button on playlist card
    const playBtn = screen.getByRole('button', {
      name: /play playlist "vyzee - up, up, up - slowed"/i,
    });
    expect(playBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(mockPlayTrack).toHaveBeenCalled();
  });
});
