import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

export interface PlaylistCollaborator {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  role: 'owner' | 'editor';
  joinedAt: string;
}

export interface PlaylistInvite {
  id: string;
  playlistId: string;
  playlistTitle: string;
  playlistCover?: string;
  inviterId: string;
  inviterUsername: string;
  inviterDisplayName?: string | null;
  inviterAvatar?: string | null;
  inviteeId: string;
  inviteeUsername: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface MusicPlaylist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  gradient?: string;
  tracks: SpotifyTrack[];
  creator: string;
  creatorId?: string;
  creatorUsername?: string;
  creatorAvatar?: string | null;
  createdAt: string;
  isPinned?: boolean;
  isSystem?: boolean;
  isPrivate?: boolean;
  collaborators?: PlaylistCollaborator[];
  source?: 'soundcloud' | 'spotify';
  trackCount?: number;
}

export function isDefaultPlaylistTitle(title: string): boolean {
  return /^(My playlist)(\s*(№|#)\s*\d+)?$/i.test(title.trim());
}

export function canViewPlaylist(playlist: MusicPlaylist, currentUserId?: string): boolean {
  if (!playlist.isPrivate) return true;
  if (!currentUserId) return false;
  if (playlist.creatorId && playlist.creatorId === currentUserId) return true;
  if (playlist.collaborators?.some((c) => c.id === currentUserId)) return true;
  return false;
}

export function isPlaylistSearchDiscoverable(
  playlist: MusicPlaylist,
  currentUserId?: string,
): boolean {
  if (playlist.isPrivate) return false;
  if (
    playlist.isSystem ||
    playlist.id.startsWith('catalog-') ||
    [
      '6jdVMq0SyG45lT3526KWSL',
      '37i9dQZF1DX0XUsuxWHRQd',
      '37i9dQZF1DX4eRPd9frC1m',
      '37i9dQZF1DWXRqgorJj26U',
      '37i9dQZF1DX1lVhptIYRda',
      '37i9dQZF1DXdbXrPNafg9d',
      'mr-popular',
      'fruktoviy-1',
      'larping-1',
      'larping-jet',
      'larp-songs',
      'vyzee-up-up-slowed',
      'rock-classics',
    ].includes(playlist.id)
  ) {
    return true;
  }
  if (currentUserId) {
    if (playlist.creatorId && playlist.creatorId === currentUserId) return true;
    if (playlist.collaborators?.some((c) => c.id === currentUserId)) return true;
  }
  if (playlist.tracks.length === 0) return false;
  if (isDefaultPlaylistTitle(playlist.title)) return false;
  return true;
}

export interface MusicFolder {
  id: string;
  name: string;
  playlistIds: string[];
  createdAt: string;
}

export function generateSpotifyId(length = 22): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null;
  if (cryptoObj?.getRandomValues) {
    const values = new Uint8Array(length);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return result;
}

export type MusicLibraryFilter = 'all' | 'playlists' | 'tracks';
export type MusicLibrarySort = 'recent' | 'recently-added' | 'alphabetical' | 'author' | 'added';
export type MusicLibraryViewMode = 'compact' | 'list' | 'grid-covers' | 'grid-cards';
export type MusicCatalogSource = 'all' | 'soundcloud' | 'spotify';

export const formatTracksDeclension = (count: number): string => {
  return count === 1 ? '1 track' : `${count} tracks`;
};

export const formatPlaylistsDeclension = (count: number): string => {
  return count === 1 ? '1 playlist' : `${count} playlists`;
};

export interface MusicRecentlyPlayedItem {
  id: string;
  type: 'playlist' | 'track' | 'liked-songs' | 'album';
  title: string;
  subtitle?: string;
  coverUrl?: string;
  artist?: string;
  isSaved?: boolean;
  playedAt: number;
  tracksCount?: number;
  genre?: string;
  track?: SpotifyTrack;
  playlistId?: string;
}

export interface RecommendationContext {
  seedGenre?: string;
  seedArtist?: string;
  seedTitle?: string;
  updatedAt: number;
}

export type MusicHomeCategory = 'all' | 'music' | 'podcasts';
