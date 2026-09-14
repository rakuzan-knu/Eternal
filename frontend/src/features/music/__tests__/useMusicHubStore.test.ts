import { describe, it, expect, beforeEach } from 'vitest';
import { useMusicHubStore, STARTER_LIKED_TRACKS, detectGenre } from '../model/useMusicHubStore';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

describe('useMusicHubStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useMusicHubStore.setState({
      likedTracks: [...STARTER_LIKED_TRACKS],
      playlists: [],
      selectedPlaylistId: null,
      isLibraryExpanded: true,
      libraryFilter: 'all',
      librarySearchQuery: '',
      librarySort: 'recent',
      isNowPlayingPanelOpen: true,
    });
  });

  it('initializes with empty liked tracks and populated playlists', () => {
    const { likedTracks } = useMusicHubStore.getState();
    expect(likedTracks).toEqual([]);
  });

  it('toggles liking and unliking a track', () => {
    const testTrack: SpotifyTrack = {
      id: 'sc-test-999',
      title: 'Test Song',
      artist: 'Test Artist',
      albumArt: '',
      durationMs: 120000,
      previewUrl: null,
      spotifyUrl: '',
      source: 'soundcloud',
    };

    // Like
    useMusicHubStore.getState().toggleLikeTrack(testTrack);
    expect(useMusicHubStore.getState().isTrackLiked('sc-test-999')).toBe(true);
    expect(useMusicHubStore.getState().likedTracks[0].id).toBe('sc-test-999');

    // Unlike
    useMusicHubStore.getState().toggleLikeTrack(testTrack);
    expect(useMusicHubStore.getState().isTrackLiked('sc-test-999')).toBe(false);
  });

  it('creates, modifies, and deletes a playlist', () => {
    const newPl = useMusicHubStore.getState().createPlaylist('My Synthwave Mix', 'Chill waves');
    expect(newPl.title).toBe('My Synthwave Mix');
    expect(useMusicHubStore.getState().playlists.length).toBe(1);
    expect(useMusicHubStore.getState().selectedPlaylistId).toBe(newPl.id);

    // Add track to playlist
    const sampleTrack: SpotifyTrack = {
      id: 'sc-2195706963',
      title: 'mr popular',
      artist: 'predayed',
      albumArt: '',
      durationMs: 92070,
      previewUrl: null,
      spotifyUrl: '',
      source: 'soundcloud',
    };
    useMusicHubStore.getState().addTrackToPlaylist(newPl.id, sampleTrack);
    expect(useMusicHubStore.getState().playlists[0].tracks.length).toBe(1);
    expect(useMusicHubStore.getState().playlists[0].tracks[0].id).toBe(sampleTrack.id);

    // Remove track from playlist
    useMusicHubStore.getState().removeTrackFromPlaylist(newPl.id, sampleTrack.id);
    expect(useMusicHubStore.getState().playlists[0].tracks.length).toBe(0);

    // Delete playlist
    useMusicHubStore.getState().deletePlaylist(newPl.id);
    expect(useMusicHubStore.getState().playlists.length).toBe(0);
  });

  it('toggles library expanded and now playing panel states', () => {
    useMusicHubStore.getState().toggleLibraryExpanded();
    expect(useMusicHubStore.getState().isLibraryExpanded).toBe(false);

    useMusicHubStore.getState().toggleLibraryExpanded();
    expect(useMusicHubStore.getState().isLibraryExpanded).toBe(true);

    useMusicHubStore.getState().toggleNowPlayingPanel();
    expect(useMusicHubStore.getState().isNowPlayingPanelOpen).toBe(false);
  });

  it('saves and unsaves curated catalog playlists to library', () => {
    const testPlaylistId = 'playlist-phonk-drift';
    expect(useMusicHubStore.getState().isPlaylistSaved(testPlaylistId)).toBe(false);

    // Save
    useMusicHubStore.getState().toggleSavePlaylist(testPlaylistId);
    expect(useMusicHubStore.getState().isPlaylistSaved(testPlaylistId)).toBe(true);
    expect(useMusicHubStore.getState().savedPlaylistIds).toContain(testPlaylistId);

    // Unsave
    useMusicHubStore.getState().toggleSavePlaylist(testPlaylistId);
    expect(useMusicHubStore.getState().isPlaylistSaved(testPlaylistId)).toBe(false);
    expect(useMusicHubStore.getState().savedPlaylistIds).not.toContain(testPlaylistId);
  });

  it('manages music folders and moves playlists into them', () => {
    const folder = useMusicHubStore.getState().createMusicFolder('Workout Beats');
    expect(folder.name).toBe('Workout Beats');
    expect(useMusicHubStore.getState().musicFolders).toHaveLength(1);

    useMusicHubStore.getState().movePlaylistToFolder(folder.id, 'playlist-cyberpunk');
    expect(useMusicHubStore.getState().musicFolders[0].playlistIds).toContain('playlist-cyberpunk');

    useMusicHubStore.getState().removePlaylistFromFolder(folder.id, 'playlist-cyberpunk');
    expect(useMusicHubStore.getState().musicFolders[0].playlistIds).not.toContain(
      'playlist-cyberpunk',
    );

    // Test rename
    useMusicHubStore.getState().renameMusicFolder(folder.id, 'Chill Beats');
    expect(useMusicHubStore.getState().musicFolders[0].name).toBe('Chill Beats');

    // Test delete
    useMusicHubStore.getState().deleteMusicFolder(folder.id);
    expect(useMusicHubStore.getState().musicFolders).toHaveLength(0);
  });

  it('correctly classifies genres and tracks recently played history', () => {
    const rockTrack: SpotifyTrack = {
      id: 'sc-rock-1',
      title: 'In The End',
      artist: 'Linkin Park',
      albumArt: '',
      durationMs: 216000,
      previewUrl: null,
      spotifyUrl: '',
      source: 'soundcloud',
    };

    expect(detectGenre(rockTrack)).toBe('Rock');

    useMusicHubStore.getState().recordRecentlyPlayed({
      id: rockTrack.id,
      type: 'track',
      title: rockTrack.title,
      artist: rockTrack.artist,
      genre: 'Rock',
      track: rockTrack,
    });

    const state = useMusicHubStore.getState();
    expect(state.recentlyPlayed).toHaveLength(1);
    expect(state.recentlyPlayed[0].id).toBe('sc-rock-1');
    expect(state.lastActiveGenre).toBe('Rock');
    expect(state.lastActiveSeed).toBe('In The End');
  });

  it('pins, unpins, and toggles pin state of library items', () => {
    const store = useMusicHubStore.getState();
    expect(store.isItemPinned('liked-songs')).toBe(false);

    // Pin liked songs
    store.pinItem('liked-songs');
    expect(useMusicHubStore.getState().isItemPinned('liked-songs')).toBe(true);
    expect(useMusicHubStore.getState().pinnedItemIds).toContain('liked-songs');

    // Toggle unpin
    store.togglePinItem('liked-songs');
    expect(useMusicHubStore.getState().isItemPinned('liked-songs')).toBe(false);
    expect(useMusicHubStore.getState().pinnedItemIds).not.toContain('liked-songs');

    // Toggle pin on playlist
    store.togglePinItem('custom-pl-1');
    expect(useMusicHubStore.getState().isItemPinned('custom-pl-1')).toBe(true);

    // Explicit unpin
    store.unpinItem('custom-pl-1');
    expect(useMusicHubStore.getState().isItemPinned('custom-pl-1')).toBe(false);
  });
});
