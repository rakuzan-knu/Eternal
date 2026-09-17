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

export type SortKey =
  'default' | 'title' | 'artist' | 'album' | 'dateAdded' | 'releaseDate' | 'duration';

export type ViewMode = 'list' | 'compact';

export const SORT_LABELS: Record<SortKey, string> = {
  default: 'Custom order',
  title: 'Title',
  artist: 'Artist',
  album: 'Album',
  dateAdded: 'Date added',
  releaseDate: 'Release date',
  duration: 'Duration',
};

export const formatSpotifyTrackAddedDate = (track: SpotifyTrack): string => {
  let targetMs: number | null = null;
  if (track.addedAt) {
    const t = new Date(track.addedAt).getTime();
    if (!isNaN(t)) targetMs = t;
  }

  if (!targetMs) return 'just now';

  const now = new Date();
  const date = new Date(targetMs);
  const diffMs = now.getTime() - targetMs;

  if (diffMs < 60 * 1000) {
    return 'just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffMin < 60) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday || (diffHours < 24 && !isYesterday)) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  if (isYesterday) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `Yesterday at ${hh}:${mm}`;
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};
