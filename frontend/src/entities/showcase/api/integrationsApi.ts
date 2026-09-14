import { apiClient } from '@/shared/api/httpClient';

export const integrationsApi = {
  preview: async (
    platform: string,
    handle: string,
    options?: {
      featuredGame?: string;
      pinnedRepo?: string;
      wowChar?: string;
      wowRealm?: string;
    },
  ) => {
    const params = new URLSearchParams({ handle, ...(options || {}) });
    const response = await apiClient.get(`/integrations/${platform}/preview?${params.toString()}`);
    return response.data;
  },

  link: async (
    platform: string,
    handle: string,
    details?: Record<string, any>,
    options?: Record<string, any>,
  ) => {
    const response = await apiClient.post(`/integrations/${platform}/link`, {
      handle,
      details,
      options,
    });
    return response.data;
  },

  unlink: async (platform: string) => {
    const response = await apiClient.delete(`/integrations/${platform}/unlink`);
    return response.data;
  },

  getSpotifyLibrary: async () => {
    const response = await apiClient.get('/integrations/spotify/library');
    return response.data;
  },

  searchSpotifyCatalog: async (query: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await apiClient.get(`/integrations/spotify/search?${params.toString()}`);
    return response.data;
  },

  searchSpotifyPlaylists: async (query: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await apiClient.get(
      `/integrations/spotify/search/playlists?${params.toString()}`,
    );
    return response.data;
  },

  getSpotifyPlaylist: async (playlistId: string) => {
    const cleanId = playlistId
      .replace(/^sp-pl-/, '')
      .replace(/^spotify:playlist:/, '')
      .replace(/^pl-/, '')
      .trim();
    const response = await apiClient.get(
      `/integrations/spotify/playlists/${encodeURIComponent(cleanId)}`,
    );
    return response.data;
  },

  likeSpotifyTrack: async (trackId: string, like: boolean) => {
    const response = await apiClient.post(
      `/integrations/spotify/like/${encodeURIComponent(trackId)}`,
      {
        like,
      },
    );
    return response.data;
  },

  checkSpotifyTrackLiked: async (trackId: string): Promise<{ isLiked: boolean }> => {
    const response = await apiClient.get<{ isLiked: boolean }>(
      `/integrations/spotify/like/${encodeURIComponent(trackId)}`,
    );
    return response.data;
  },

  setSpotifyRepeatMode: async (
    state: 'track' | 'context' | 'off',
    deviceId?: string,
  ): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>('/integrations/spotify/repeat', {
      state,
      deviceId,
    });
    return response.data;
  },

  setSpotifyShuffle: async (state: boolean, deviceId?: string): Promise<{ success: boolean }> => {
    const response = await apiClient.put<{ success: boolean }>('/integrations/spotify/shuffle', {
      state,
      deviceId,
    });
    return response.data;
  },

  getSpotifyLyrics: async (title: string, artist: string, durationMs?: number) => {
    const params = new URLSearchParams({ title, artist });
    if (durationMs) params.set('duration', durationMs.toString());
    const response = await apiClient.get(`/integrations/spotify/lyrics?${params.toString()}`);
    return response.data;
  },

  getSpotifyUserToken: async (): Promise<{ accessToken: string | null; expiresIn: number }> => {
    const response = await apiClient.get('/integrations/spotify/token');
    return response.data;
  },

  playSpotifyTrackOnDevice: async (
    deviceId: string,
    trackId: string,
    positionMs?: number,
  ): Promise<{
    success: boolean;
    error?: string;
    permissionsMissing?: boolean;
  }> => {
    const response = await apiClient.post('/integrations/spotify/play', {
      deviceId,
      trackId,
      positionMs: positionMs || 0,
    });
    return response.data;
  },

  getSpotifyQueue: async (
    trackId?: string,
    artist?: string,
    title?: string,
    offset: number = 0,
    historyIds?: string[],
  ): Promise<{
    source: 'playlist' | 'infinite-audio';
    tracks: {
      id: string;
      title: string;
      artist: string;
      album?: string;
      albumArt: string;
      durationMs: number;
      previewUrl?: string | null;
      spotifyUrl?: string;
      source?: 'spotify' | 'soundcloud';
      streamUrl?: string;
    }[];
    hasMore: boolean;
  }> => {
    const params = new URLSearchParams();
    if (trackId) params.set('trackId', trackId);
    if (artist) params.set('artist', artist);
    if (title) params.set('title', title);
    if (offset > 0) params.set('offset', offset.toString());
    if (historyIds && historyIds.length > 0) params.set('historyIds', historyIds.join(','));
    const response = await apiClient.get(`/integrations/spotify/queue?${params.toString()}`);
    return response.data;
  },

  searchSoundCloudCatalog: async (query: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await apiClient.get(`/integrations/soundcloud/search?${params.toString()}`);
    return response.data;
  },

  searchSoundCloudPlaylists: async (query: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    const response = await apiClient.get(
      `/integrations/soundcloud/search/playlists?${params.toString()}`,
    );
    return response.data;
  },

  getSoundCloudTrack: async (trackId: string) => {
    const cleanId = trackId
      .replace(/^sc-/, '')
      .replace(/^soundcloud-/, '')
      .trim();
    const response = await apiClient.get(
      `/integrations/soundcloud/tracks/${encodeURIComponent(cleanId)}`,
    );
    return response.data;
  },

  getSoundCloudPlaylist: async (playlistId: string) => {
    const cleanId = playlistId
      .replace(/^sc-/, '')
      .replace(/^playlist-/, '')
      .replace(/^pl-/, '')
      .trim();
    const response = await apiClient.get(
      `/integrations/soundcloud/playlists/${encodeURIComponent(cleanId)}`,
    );
    return response.data;
  },

  getSoundCloudStream: async (
    trackId: string,
    bypassCache = false,
  ): Promise<{ streamUrl: string; isHls: boolean; mimeType: string } | null> => {
    const response = await apiClient.get(
      `/integrations/soundcloud/stream/${encodeURIComponent(trackId)}?bypassCache=${bypassCache}`,
    );
    return response.data;
  },

  getSoundCloudRelated: async (trackId: string, excludeIds: string[] = [], limit = 10) => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(excludeIds.length > 0 ? { excludeIds: excludeIds.join(',') } : {}),
    });
    const response = await apiClient.get(
      `/integrations/soundcloud/related/${encodeURIComponent(trackId)}?${params.toString()}`,
    );
    return response.data;
  },

  exchangeCode: async (
    platform: string,
    payload: { code: string; redirectUri?: string; state?: string },
  ) => {
    const response = await apiClient.post(`/integrations/${platform}/exchange-code`, payload);
    return response.data;
  },

  robloxGenerateCode: async (username: string) => {
    const response = await apiClient.post<{
      success: boolean;
      verificationCode: string;
      robloxUser: { id: number; username: string; displayName: string; avatarBustUrl: string };
    }>('/integrations/roblox/generate-code', { username });
    return response.data;
  },

  robloxVerifyCode: async (username: string, code: string) => {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      '/integrations/roblox/verify-ownership',
      { username, code },
    );
    return response.data;
  },

  // --- Music Hub: Liked Tracks Database Sync ---

  getLikedTracks: async () => {
    const response = await apiClient.get<any[]>('/integrations/music/liked-tracks');
    return response.data;
  },

  addLikedTrack: async (track: any) => {
    const response = await apiClient.post<{ success: boolean; track: any }>(
      '/integrations/music/liked-tracks',
      { track },
    );
    return response.data;
  },

  removeLikedTrack: async (trackId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/integrations/music/liked-tracks/${encodeURIComponent(trackId)}`,
    );
    return response.data;
  },

  syncLikedTracks: async (tracks: any[]) => {
    const response = await apiClient.post<any[]>('/integrations/music/liked-tracks/sync', {
      tracks,
    });
    return response.data;
  },

  // --- Music Hub: Folders & Custom Playlists Database Sync ---

  getMusicFolders: async () => {
    const response = await apiClient.get<
      Array<{ id: string; name: string; playlistIds: string[]; createdAt: string }>
    >('/integrations/music/folders');
    return response.data;
  },

  createMusicFolder: async (dataOrName?: string | { id?: string; name?: string }) => {
    const payload = typeof dataOrName === 'string' ? { name: dataOrName } : dataOrName;
    const response = await apiClient.post<{
      id: string;
      name: string;
      playlistIds: string[];
      createdAt: string;
    }>('/integrations/music/folders', payload || {});
    return response.data;
  },

  renameMusicFolder: async (id: string, name: string) => {
    const response = await apiClient.patch<{
      id: string;
      name: string;
      playlistIds: string[];
      createdAt: string;
    }>(`/integrations/music/folders/${encodeURIComponent(id)}`, { name });
    return response.data;
  },

  deleteMusicFolder: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/integrations/music/folders/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  getUserPlaylists: async () => {
    const response = await apiClient.get<any[]>('/integrations/music/playlists');
    return response.data;
  },

  getUserPlaylist: async (id: string) => {
    const response = await apiClient.get<any>(
      `/integrations/music/playlists/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  createUserPlaylist: async (data: {
    id?: string;
    title?: string;
    description?: string;
    coverUrl?: string;
    folderId?: string | null;
    isPublic?: boolean;
  }) => {
    const response = await apiClient.post<any>('/integrations/music/playlists', data);
    return response.data;
  },

  updateUserPlaylist: async (
    id: string,
    updates: {
      title?: string;
      description?: string;
      coverUrl?: string;
      folderId?: string | null;
      isPublic?: boolean;
    },
  ) => {
    const response = await apiClient.patch<any>(
      `/integrations/music/playlists/${encodeURIComponent(id)}`,
      updates,
    );
    return response.data;
  },

  deleteUserPlaylist: async (id: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/integrations/music/playlists/${encodeURIComponent(id)}`,
    );
    return response.data;
  },

  addTrackToUserPlaylist: async (playlistId: string, track: any) => {
    const response = await apiClient.post<any>(
      `/integrations/music/playlists/${encodeURIComponent(playlistId)}/tracks`,
      { track },
    );
    return response.data;
  },

  removeTrackFromUserPlaylist: async (playlistId: string, trackId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/integrations/music/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`,
    );
    return response.data;
  },
};
