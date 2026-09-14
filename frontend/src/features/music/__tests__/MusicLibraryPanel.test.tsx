import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MusicLibraryPanel } from '../ui/MusicLibraryPanel';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { MemoryRouter } from 'react-router-dom';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

vi.mock('@/shared/model/useSpotifyPlayerStore', () => ({
  useSpotifyPlayerStore: (selector: any) =>
    selector({
      currentTrack: null,
      isPlaying: false,
      playTrack: vi.fn(),
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

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-1', username: 'testuser', displayName: 'Test User' },
    isLoading: false,
  }),
}));

describe('MusicLibraryPanel', () => {
  beforeEach(() => {
    useMusicHubStore.setState({
      selectedPlaylistId: null,
      isLibraryExpanded: true,
      libraryFilter: 'all',
      librarySearchQuery: '',
      librarySort: 'recent',
      likedTracks: [],
      savedPlaylistIds: [],
      customPlaylists: [],
    });
  });

  it('renders "Your Library" header and empty state when library has no items', () => {
    renderWithRouter(<MusicLibraryPanel />);
    expect(screen.getByText('Your Library')).toBeInTheDocument();
    expect(screen.getByText('Your library is empty')).toBeInTheDocument();
    expect(screen.queryByText('Liked Songs')).not.toBeInTheDocument();
  });

  it('renders "Liked Songs" only when user has liked tracks', () => {
    useMusicHubStore.setState({
      likedTracks: [
        {
          id: 'track-1',
          title: 'Liked Song 1',
          artist: 'Artist',
          albumArt: '',
          durationMs: 180000,
          previewUrl: null,
          spotifyUrl: '',
          source: 'soundcloud',
        },
      ],
    });

    renderWithRouter(<MusicLibraryPanel />);
    expect(screen.getByText('Liked Songs')).toBeInTheDocument();
  });

  it('opens create dropdown menu on "Create" button click', () => {
    renderWithRouter(<MusicLibraryPanel />);
    const createBtn = screen.getByText('Create');
    fireEvent.click(createBtn);
    expect(screen.getByText('Playlist')).toBeInTheDocument();
    expect(screen.getByText('Folder')).toBeInTheDocument();
    expect(screen.getByText('Create a playlist with songs')).toBeInTheDocument();
    expect(screen.getByText('Organize your playlists')).toBeInTheDocument();
  });

  it('selects "Liked Songs" on click when tracks exist', () => {
    useMusicHubStore.setState({
      likedTracks: [
        {
          id: 'track-1',
          title: 'Liked Song 1',
          artist: 'Artist',
          albumArt: '',
          durationMs: 180000,
          previewUrl: null,
          spotifyUrl: '',
          source: 'soundcloud',
        },
      ],
    });

    renderWithRouter(<MusicLibraryPanel />);
    const likedSongs = screen.getByText('Liked Songs');
    fireEvent.click(likedSongs);
    expect(useMusicHubStore.getState().selectedPlaylistId).toBe('liked-songs');
  });

  it('toggles isLibraryExpanded when book button is clicked', () => {
    renderWithRouter(<MusicLibraryPanel />);
    expect(useMusicHubStore.getState().isLibraryExpanded).toBe(true);

    const bookBtn = screen.getByLabelText(/Collapse (Your Library|library section)/i);
    fireEvent.click(bookBtn);
    expect(useMusicHubStore.getState().isLibraryExpanded).toBe(false);

    const expandBookBtn = screen.getByLabelText(/Expand (Your Library|library section)/i);
    fireEvent.click(expandBookBtn);
    expect(useMusicHubStore.getState().isLibraryExpanded).toBe(true);
  });

  it('toggles isLibraryFullWidth when top-right expand button is clicked', () => {
    renderWithRouter(<MusicLibraryPanel />);
    expect(useMusicHubStore.getState().isLibraryFullWidth).toBe(false);

    const expandFullBtn = screen.getByLabelText(/Expand (Your Library|library panel)/i);
    fireEvent.click(expandFullBtn);
    expect(useMusicHubStore.getState().isLibraryFullWidth).toBe(true);

    const restoreBtn = screen.getByLabelText(/Collapse (Your Library|library panel)/i);
    fireEvent.click(restoreBtn);
    expect(useMusicHubStore.getState().isLibraryFullWidth).toBe(false);
  });

  it('opens context menu on blank area right-click and creates a playlist on click', () => {
    renderWithRouter(<MusicLibraryPanel />);
    const aside = screen.getByRole('complementary');
    fireEvent.contextMenu(aside, { clientX: 200, clientY: 200 });

    expect(screen.getByText('Create a playlist')).toBeInTheDocument();
    expect(screen.getByText('Create folder')).toBeInTheDocument();

    const createPlaylistOption = screen.getByText('Create a playlist');
    fireEvent.click(createPlaylistOption);

    // Context menu should close and a new playlist should be created
    expect(screen.queryByText('Create a playlist')).not.toBeInTheDocument();
    expect(useMusicHubStore.getState().customPlaylists.length).toBe(1);
  });

  it('smoothly expands search input on icon click, filters library items, and collapses on outside click', async () => {
    useMusicHubStore.setState({
      playlists: [
        {
          id: 'pl-1',
          title: 'Ferrari Peak',
          tracks: [
            {
              id: 'trk-1',
              title: 'Highway Star',
              artist: 'Deep Purple',
              album: 'Machine Head',
              albumArt: '',
              durationMs: 200000,
              previewUrl: null,
              spotifyUrl: '',
              source: 'spotify',
            },
          ],
          creator: 'Kirito Agh',
          createdAt: '2026-01-01',
        },
        {
          id: 'pl-2',
          title: 'Chill Vibes',
          tracks: [],
          creator: 'Subvinc',
          createdAt: '2026-01-02',
        },
      ],
    });

    renderWithRouter(<MusicLibraryPanel />);
    expect(screen.getByText('Ferrari Peak')).toBeInTheDocument();
    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();

    // Click search icon button
    const searchBtn = screen.getByLabelText('Search in library');
    fireEvent.click(searchBtn);

    // Input appears
    const input = screen.getByPlaceholderText('Search in Your Library...');
    expect(input).toBeInTheDocument();

    // Search for a track inside a playlist
    fireEvent.change(input, { target: { value: 'Highway' } });
    expect(screen.getByText('Ferrari Peak')).toBeInTheDocument();
    expect(screen.queryByText('Chill Vibes')).not.toBeInTheDocument();

    // Search for non-existent text
    fireEvent.change(input, { target: { value: 'NonExistentXYZ' } });
    expect(screen.getByText('No results found')).toBeInTheDocument();

    // Click outside search container -> collapses search
    fireEvent.mouseDown(document.body);
    await vi.waitFor(() => {
      expect(screen.queryByPlaceholderText('Search in Your Library...')).not.toBeInTheDocument();
    });
  });

  it('switches between the 4 presentation view modes (compact, list, grid-covers, grid-cards) and persists in localStorage', () => {
    localStorage.clear();
    useMusicHubStore.setState({
      playlists: [
        {
          id: 'pl-1',
          title: 'Rock Classics',
          tracks: [],
          creator: 'Eternal',
          createdAt: '2026-01-01',
        },
      ],
    });

    renderWithRouter(<MusicLibraryPanel />);

    // Open Sort & View menu
    const sortViewBtn = screen.getByText('Recents');
    fireEvent.click(sortViewBtn);

    expect(screen.getByText('Sort by')).toBeInTheDocument();
    expect(screen.getByText('View')).toBeInTheDocument();

    // Switch to "Compact" (compact mode)
    const compactBtn = screen.getByTitle('Compact');
    fireEvent.click(compactBtn);
    expect(useMusicHubStore.getState().libraryViewMode).toBe('compact');

    // Check localStorage persistence
    const saved = JSON.parse(localStorage.getItem('spotify_library_prefs_user-1') || '{}');
    expect(saved.viewMode).toBe('compact');

    // Switch to "Card Grid" (grid-cards)
    const gridCardsBtn = screen.getByTitle('Card Grid');
    fireEvent.click(gridCardsBtn);
    expect(useMusicHubStore.getState().libraryViewMode).toBe('grid-cards');

    const saved2 = JSON.parse(localStorage.getItem('spotify_library_prefs_user-1') || '{}');
    expect(saved2.viewMode).toBe('grid-cards');
  });

  it('renders collapsed sidebar aligned correctly with expand button and circular create button', () => {
    useMusicHubStore.setState({
      isLibraryExpanded: false,
      playlists: [
        {
          id: 'pl-1',
          title: 'Rock Classics',
          tracks: [],
          creator: 'Eternal',
          createdAt: '2026-01-01',
        },
      ],
    });

    renderWithRouter(<MusicLibraryPanel />);

    // In collapsed mode, expand button exists with correct label
    expect(screen.getByLabelText(/Expand (Your Library|library section)/i)).toBeInTheDocument();

    // Circular create button exists
    expect(screen.getByLabelText('Create')).toBeInTheDocument();

    // Maximize button does not exist in collapsed mode
    expect(screen.queryByLabelText(/Expand (Your Library|library panel)/i)).not.toBeInTheDocument();
  });

  it('opens Pin playlist context menu on right clicking "Liked Songs" and pins it', () => {
    useMusicHubStore.setState({
      likedTracks: [
        {
          id: 'track-1',
          title: 'Liked Song 1',
          artist: 'Artist',
          albumArt: '',
          durationMs: 180000,
          previewUrl: null,
          spotifyUrl: '',
          source: 'soundcloud',
        },
      ],
      pinnedItemIds: [],
    });

    renderWithRouter(<MusicLibraryPanel />);

    const likedSongs = screen.getByText('Liked Songs');
    // Initially not pinned
    expect(useMusicHubStore.getState().isItemPinned('liked-songs')).toBe(false);

    // Right-click opens context menu with strictly "Pin playlist"
    fireEvent.contextMenu(likedSongs);
    const pinBtn = screen.getByText('Pin playlist');
    expect(pinBtn).toBeInTheDocument();

    // Click "Pin playlist"
    fireEvent.click(pinBtn);
    expect(useMusicHubStore.getState().isItemPinned('liked-songs')).toBe(true);

    // Right-click again shows "Unpin playlist"
    fireEvent.contextMenu(likedSongs);
    const unpinBtn = screen.getByText('Unpin playlist');
    expect(unpinBtn).toBeInTheDocument();

    // Click "Unpin playlist"
    fireEvent.click(unpinBtn);
    expect(useMusicHubStore.getState().isItemPinned('liked-songs')).toBe(false);
  });

  it('opens slide-in folder view when a folder is clicked and returns back', async () => {
    useMusicHubStore.setState({
      musicFolders: [
        {
          id: 'fld-test',
          name: 'Electronic Gems',
          playlistIds: [],
          createdAt: new Date().toISOString(),
        },
      ],
      isLibraryExpanded: true,
      libraryViewMode: 'list',
    });

    renderWithRouter(<MusicLibraryPanel />);
    const folderItem = screen.getByText('Electronic Gems');
    expect(folderItem).toBeInTheDocument();

    fireEvent.click(folderItem);

    // Slide-in panel should now display the folder empty state
    expect(screen.getByText('This folder is empty')).toBeInTheDocument();

    // Click back button
    const backBtn = screen.getByLabelText('Back');
    fireEvent.click(backBtn);

    // Should return to library list
    await waitFor(() => {
      expect(screen.queryByText('This folder is empty')).not.toBeInTheDocument();
    });
  });

  it('shows Rename and Delete in folder context menu and deletes folder', () => {
    useMusicHubStore.setState({
      musicFolders: [
        {
          id: 'fld-del',
          name: 'To Be Deleted',
          playlistIds: [],
          createdAt: new Date().toISOString(),
        },
      ],
      isLibraryExpanded: true,
      libraryViewMode: 'list',
    });

    renderWithRouter(<MusicLibraryPanel />);
    const folderItem = screen.getByText('To Be Deleted');
    fireEvent.contextMenu(folderItem);

    expect(screen.getByText('Rename')).toBeInTheDocument();
    const deleteBtn = screen.getByText('Delete folder');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    // Confirmation modal should appear
    expect(screen.getByText(/delete folder\?/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    expect(useMusicHubStore.getState().musicFolders).toHaveLength(0);
  });
});
