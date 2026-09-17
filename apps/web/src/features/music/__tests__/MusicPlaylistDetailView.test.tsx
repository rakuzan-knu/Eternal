import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MusicPlaylistDetailView } from '../ui/MusicPlaylistDetailView';
import { useMusicHubStore } from '../model/useMusicHubStore';

vi.mock('@/shared/model/useSpotifyPlayerStore', () => {
  const state = {
    currentTrack: null,
    isPlaying: false,
    playTrack: vi.fn(),
    togglePlay: vi.fn(),
    toggleShuffle: vi.fn(),
    isShuffled: false,
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

vi.mock('@/shared/model/useSpotifyDockOffset', () => ({
  useSpotifyDockOffset: () => ({
    dockOffset: 0,
    composerPaddingBottom: 8,
    isDockActive: false,
    isDockMinimized: false,
  }),
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
  }),
}));

vi.mock('@/entities/showcase/api/integrationsApi', () => ({
  integrationsApi: {
    getSoundCloudPlaylist: vi.fn(),
    getSpotifyPlaylist: vi.fn(),
    searchSoundCloudCatalog: vi.fn().mockResolvedValue([]),
    searchSpotifyCatalog: vi.fn().mockResolvedValue([]),
  },
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MusicPlaylistDetailView', () => {
  beforeEach(() => {
    useMusicHubStore.setState({
      selectedPlaylistId: 'mr-popular',
      likedTracks: [
        {
          id: 'sc-test-1',
          title: 'Phonk Killer',
          artist: 'Kordhell',
          album: 'Phonk Vol 1',
          albumArt: '',
          durationMs: 140000,
          previewUrl: null,
          spotifyUrl: '',
          source: 'soundcloud',
        },
      ],
      savedPlaylistIds: ['mr-popular'],
      customPlaylists: [],
    });
  });

  it('renders playlist title and tracks without download button', () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    // Verify playlist title is rendered
    expect(screen.getByText('mr popular')).toBeInTheDocument();

    // Verify Download button is completely removed
    expect(screen.queryByLabelText('Download')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Download')).not.toBeInTheDocument();

    // Verify "Invite Collaborators" is NOT shown on catalog/foreign playlist
    expect(screen.queryByLabelText(/invite collaborators/i)).not.toBeInTheDocument();
  });

  it('shows "Invite Collaborators" only on self-created playlist, never on foreign or catalog playlist', () => {
    // 1. Foreign / catalog playlist (mr-popular)
    const { unmount } = render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });
    expect(screen.queryByLabelText(/invite collaborators/i)).not.toBeInTheDocument();
    unmount();

    // 2. Self-created playlist
    useMusicHubStore.setState({
      selectedPlaylistId: 'user-custom-pl',
      customPlaylists: [
        {
          id: 'user-custom-pl',
          title: 'My Own Playlist',
          description: 'Created by user',
          coverUrl: '',
          creator: 'Test User',
          creatorId: 'user-1',
          createdAt: new Date().toISOString(),
          tracks: [],
          isPrivate: false,
          collaborators: [],
        },
      ],
    });

    render(<MusicPlaylistDetailView playlistId="user-custom-pl" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getAllByLabelText(/invite collaborators/i).length).toBeGreaterThan(0);
  });

  it('supports real-time search filtering in playlist and outside click to collapse', async () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    // Open search
    const searchBtn = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchBtn);

    const input = screen.getByPlaceholderText('Search in playlist...');
    expect(input).toBeInTheDocument();

    // Filter by non-existent query
    fireEvent.change(input, { target: { value: 'NonExistentTrackXYZ' } });
    expect(screen.getByText(/no tracks found matching your query/i)).toBeInTheDocument();

    // Click outside to collapse search
    fireEvent.mouseDown(document.body);
    await vi.waitFor(() => {
      expect(screen.queryByPlaceholderText('Search in playlist...')).not.toBeInTheDocument();
    });
  });

  it('toggles Sort & View menu, supports repeat click to close', () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    const sortBtn = screen.getByRole('button', { name: /sort (and|&) view/i });
    expect(sortBtn).toBeInTheDocument();

    // 1st click opens menu
    fireEvent.click(sortBtn);
    expect(screen.getByText('Sort by')).toBeInTheDocument();
    expect(screen.getByText(/View as/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /compact/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^list$/i })).toBeInTheDocument();

    // 2nd click on the same button toggles it closed (Point 6)
    fireEvent.click(sortBtn);
    expect(screen.queryByText('Sort by')).not.toBeInTheDocument();
  });

  it('switches between List and Compact view modes (hides covers, shows separate Artist column)', () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    // Initially in List mode: separate "Artist" header does not exist
    expect(screen.queryByRole('columnheader', { name: /artist/i })).not.toBeInTheDocument();

    // Open menu and select Compact mode
    const sortBtn = screen.getByRole('button', { name: /sort (and|&) view/i });
    fireEvent.click(sortBtn);

    const compactBtn = screen.getByRole('button', { name: /compact/i });
    fireEvent.click(compactBtn);

    // Now in Compact mode (matching Screenshot 5):
    // Dedicated "Artist" header exists
    expect(screen.getByRole('columnheader', { name: /artist/i })).toBeInTheDocument();

    // Switch back to List mode
    fireEvent.click(sortBtn);
    const listBtn = screen.getByRole('button', { name: /^list$/i });
    fireEvent.click(listBtn);

    expect(screen.queryByRole('columnheader', { name: /artist/i })).not.toBeInTheDocument();
  });

  it('sorts tracks when sort options or column headers are clicked', () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    // Open sort menu and select sort by Title ("Title")
    const sortBtn = screen.getByRole('button', { name: /sort (and|&) view/i });
    fireEvent.click(sortBtn);

    const titleSortOption = screen.getByRole('button', { name: /^title$/i });
    fireEvent.click(titleSortOption);

    // The top button now smoothly displays "Title"
    expect(screen.getByRole('button', { name: /sort (and|&) view/i })).toHaveTextContent('Title');

    // Click column header "Album" to sort by album
    const albumHeader = screen.getByRole('columnheader', { name: /album/i });
    fireEvent.click(albumHeader);
    expect(screen.getByRole('button', { name: /sort (and|&) view/i })).toHaveTextContent('Album');
  });

  it('toggles 3-dots action menu with repeat click to close', () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    const moreBtn = screen.getByRole('button', { name: /more information/i });
    expect(moreBtn).toBeInTheDocument();

    // 1st click opens menu
    fireEvent.click(moreBtn);
    expect(screen.getByText('Add to Queue')).toBeInTheDocument();

    // 2nd click closes menu
    fireEvent.click(moreBtn);
    expect(screen.queryByText('Add to Queue')).not.toBeInTheDocument();
  });

  it('locks background wheel scroll when menu is open', () => {
    render(<MusicPlaylistDetailView playlistId="mr-popular" />, {
      wrapper: createWrapper(),
    });

    const moreBtn = screen.getByRole('button', { name: /more information/i });
    fireEvent.click(moreBtn);

    const wheelEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true });
    window.dispatchEvent(wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(true);

    // Close menu -> wheel is no longer prevented
    fireEvent.click(moreBtn);
    const normalWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true });
    window.dispatchEvent(normalWheel);
    expect(normalWheel.defaultPrevented).toBe(false);
  });

  it('renders liked songs collection correctly', () => {
    render(<MusicPlaylistDetailView playlistId="liked-songs" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Liked Songs')).toBeInTheDocument();
    expect(screen.getByText('Phonk Killer')).toBeInTheDocument();
  });

  it('updates playlist title and details in real time when store customPlaylists is modified', () => {
    useMusicHubStore.setState({
      selectedPlaylistId: 'custom-1',
      customPlaylists: [
        {
          id: 'custom-1',
          title: 'Initial Title',
          description: 'Initial Description',
          coverUrl: 'https://initial.jpg',
          creator: 'Kirito Agh',
          createdAt: new Date().toISOString(),
          tracks: [],
          isPrivate: false,
        },
      ],
    });

    render(<MusicPlaylistDetailView playlistId="custom-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Initial Title')).toBeInTheDocument();

    // Now update playlist in store (as if edit modal saved changes)
    act(() => {
      useMusicHubStore.getState().updatePlaylistDetails('custom-1', {
        title: 'Ferrari Peak Updated',
        description: 'Super cool playlist',
        coverUrl: 'https://example.com/ferrari.jpg',
      });
    });

    expect(screen.getByText('Ferrari Peak Updated')).toBeInTheDocument();
    expect(screen.getByText('Super cool playlist')).toBeInTheDocument();
    expect(screen.queryByText('Initial Title')).not.toBeInTheDocument();
  });

  it('loads and renders remote SoundCloud playlist details when given sc-pl- ID', async () => {
    const { integrationsApi } = await import('@/entities/showcase/api/integrationsApi');
    (integrationsApi.getSoundCloudPlaylist as any).mockResolvedValue({
      id: 'sc-pl-2234466335',
      title: 'larp playlist / miami larp',
      description: 'larp songs collection',
      coverUrl: 'https://example.com/larp-cover.jpg',
      creator: 'blessed',
      creatorUsername: 'blessed_user',
      trackCount: 5,
      tracks: [
        {
          id: 'sc-track-1',
          title: 'Miami Larp Anthem',
          artist: 'blessed',
          albumArt: 'https://example.com/larp-cover.jpg',
          durationMs: 180000,
          streamUrl: '/stream/sc-track-1',
        },
      ],
    });

    render(<MusicPlaylistDetailView playlistId="sc-pl-2234466335" />, {
      wrapper: createWrapper(),
    });

    // Verify remote playlist title and creator are fetched and displayed
    await screen.findByRole('heading', { name: /larp playlist \/ miami larp/i });
    expect(screen.getByText('Miami Larp Anthem')).toBeInTheDocument();
    expect(screen.getAllByText('blessed').length).toBeGreaterThan(0);
  });
});
