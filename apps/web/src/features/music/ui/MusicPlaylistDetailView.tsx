import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Shuffle,
  Heart,
  Clock,
  Music,
  MoreHorizontal,
  Check,
  Plus,
  Search,
  X,
  List,
  AlignJustify,
  ChevronUp,
  ChevronDown,
  UserPlus,
  Edit3,
  Music2,
  Loader2,
  Lock,
} from 'lucide-react';
import Tooltip from '@/shared/ui/Tooltip';
import Avatar from '@/shared/ui/Avatar';
import { useMusicHubStore, CATALOG_PLAYLISTS } from '../model/useMusicHubStore';
import { formatTracksDeclension, canViewPlaylist, type MusicPlaylist } from '../model/types';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { PlaylistActionMenu } from './PlaylistActionMenu';
import { TrackActionMenu } from './TrackActionMenu';
import { PlaylistCollaboratorsModal } from './PlaylistCollaboratorsModal';
import { EditPlaylistDetailsModal } from './EditPlaylistDetailsModal';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { PlaylistSortViewMenu } from './PlaylistSortViewMenu';
import {
  SORT_LABELS,
  formatSpotifyTrackAddedDate,
  type SortKey,
  type ViewMode,
} from '../model/types';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';

interface MusicPlaylistDetailViewProps {
  playlistId: string;
}

const formatDuration = (ms?: number): string => {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const getTrackDateAddedMs = (track: SpotifyTrack, originalIndex: number): number => {
  if (track.addedAt) {
    const t = new Date(track.addedAt).getTime();
    if (!isNaN(t)) return t;
  }
  // Deterministic fallback timestamp staggered by index
  return Date.now() - (originalIndex + 1) * 86400000 * 1.5;
};

const getTrackReleaseDateMs = (track: SpotifyTrack, originalIndex: number): number => {
  if (track.releaseDate) {
    const t = new Date(track.releaseDate).getTime();
    if (!isNaN(t)) return t;
  }
  return Date.now() - (originalIndex + 1) * 86400000 * 365;
};

export const MusicPlaylistDetailView: React.FC<MusicPlaylistDetailViewProps> = ({ playlistId }) => {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const {
    playlists,
    customPlaylists,
    likedTracks,
    isTrackLiked,
    toggleLikeTrack,
    isPlaylistSaved,
    toggleSavePlaylist,
    getPlaylistById,
    addTrackToPlaylist,
    respondToPlaylistInvite,
    getPendingInviteForUser,
  } = useMusicHubStore();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);
  const sortViewButtonRef = useRef<HTMLButtonElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Action Menu state
  const [actionMenuAnchor, setActionMenuAnchor] = useState<DOMRect | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  // Collaborators & Edit Details Modals
  const [isCollaboratorsModalOpen, setIsCollaboratorsModalOpen] = useState(false);
  const [isEditDetailsModalOpen, setIsEditDetailsModalOpen] = useState(false);

  // Empty state search & recommendations
  const [emptyStateSearch, setEmptyStateSearch] = useState('');
  const [emptyStateResults, setEmptyStateResults] = useState<SpotifyTrack[]>([]);
  const [isSearchingEmptyState, setIsSearchingEmptyState] = useState(false);
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(new Set());

  // Track Action Menu state
  const [activeTrackMenu, setActiveTrackMenu] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
  } | null>(null);

  const handleTrackContextMenu = (e: React.MouseEvent, trk: SpotifyTrack) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTrackMenu({
      track: trk,
      rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
    });
  };

  const handleTrackThreeDots = (e: React.MouseEvent, trk: SpotifyTrack) => {
    e.stopPropagation();
    if (activeTrackMenu?.track.id === trk.id) {
      setActiveTrackMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveTrackMenu({
      track: trk,
      rect,
    });
  };

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort & View state
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSortViewMenuOpen, setIsSortViewMenuOpen] = useState(false);
  const [sortViewMenuAnchor, setSortViewMenuAnchor] = useState<DOMRect | null>(null);

  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const toggleShuffle = useSpotifyPlayerStore((s) => s.toggleShuffle);
  const isShuffled = useSpotifyPlayerStore((s) => s.isShuffled);
  const { dockOffset } = useSpotifyDockOffset(32);

  const isLikedSongs = playlistId === 'liked-songs';

  const [remotePlaylist, setRemotePlaylist] = useState<MusicPlaylist | null>(null);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);

  const playlist = useMemo(() => {
    if (isLikedSongs) {
      return {
        id: 'liked-songs',
        title: 'Liked Songs',
        description: 'Your personal collection of tracks marked with a heart across the platform.',
        creator: currentUser?.displayName || currentUser?.username || 'You',
        creatorId: currentUser?.id,
        creatorUsername: currentUser?.username,
        creatorAvatar: currentUser?.avatar,
        coverUrl: '',
        createdAt: new Date().toISOString(),
        tracks: likedTracks,
      };
    }
    return (
      customPlaylists.find((p) => p.id === playlistId) ||
      playlists.find((p) => p.id === playlistId) ||
      getPlaylistById(playlistId) ||
      (remotePlaylist &&
      (remotePlaylist.id === playlistId ||
        remotePlaylist.id.includes(playlistId) ||
        playlistId.includes(remotePlaylist.id))
        ? remotePlaylist
        : null)
    );
  }, [
    isLikedSongs,
    likedTracks,
    playlistId,
    customPlaylists,
    playlists,
    getPlaylistById,
    remotePlaylist,
    currentUser,
  ]);

  // Fetch remote SoundCloud / Spotify playlists if not found in local store
  useEffect(() => {
    if (isLikedSongs) return;
    const local =
      customPlaylists.find((p) => p.id === playlistId) ||
      playlists.find((p) => p.id === playlistId) ||
      CATALOG_PLAYLISTS.find((p) => p.id === playlistId) ||
      getPlaylistById(playlistId);

    if (local) {
      setRemotePlaylist(null);
      setIsLoadingRemote(false);
      return;
    }

    let isMounted = true;
    setRemotePlaylist(null);
    setIsLoadingRemote(true);

    const fetchRemote = async () => {
      try {
        if (playlistId.startsWith('sc-pl-')) {
          const data = await integrationsApi.getSoundCloudPlaylist(playlistId);
          if (data && isMounted) {
            const pl: MusicPlaylist = {
              id: data.id,
              title: data.title,
              description: data.description,
              coverUrl: data.coverUrl,
              creator: data.creator,
              creatorUsername: data.creatorUsername,
              creatorAvatar: data.creatorAvatar,
              tracks: (data.tracks || []).map((t: any) => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: data.title,
                albumArt: t.albumArt || data.coverUrl,
                durationMs: t.durationMs || 180000,
                previewUrl: null,
                spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
                source: 'soundcloud' as const,
                streamUrl: t.streamUrl,
              })),
              createdAt: new Date().toISOString(),
            };
            setRemotePlaylist(pl);
          }
        } else if (
          playlistId.startsWith('sp-pl-') ||
          playlistId.startsWith('playlist-') ||
          playlistId.startsWith('pl-') ||
          /^[a-zA-Z0-9_-]{15,30}$/.test(playlistId)
        ) {
          try {
            const data = await integrationsApi.getSpotifyPlaylist(playlistId);
            if (data && isMounted) {
              const pl: MusicPlaylist = {
                id: data.id || `sp-pl-${playlistId}`,
                title: data.title,
                description: data.description,
                coverUrl: data.coverUrl,
                creator: data.creator,
                creatorUsername: data.creatorUsername,
                tracks: (data.tracks || []).map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  artist: t.artist,
                  album: data.title,
                  albumArt: t.albumArt || data.coverUrl,
                  durationMs: t.durationMs || 180000,
                  previewUrl: t.previewUrl || null,
                  spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
                  source: 'spotify' as const,
                })),
                createdAt: new Date().toISOString(),
              };
              setRemotePlaylist(pl);
            }
          } catch {}
        } else {
          // Check if valid UUID for user-created database playlist
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            playlistId,
          );
          if (isUuid) {
            try {
              if (typeof integrationsApi?.getUserPlaylist === 'function') {
                const data = await integrationsApi.getUserPlaylist(playlistId);
                if (data && isMounted) {
                  setRemotePlaylist(data);
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Failed to fetch remote playlist:', err);
      } finally {
        if (isMounted) setIsLoadingRemote(false);
      }
    };

    fetchRemote();

    return () => {
      isMounted = false;
    };
  }, [playlistId, isLikedSongs, customPlaylists, playlists, getPlaylistById]);

  // Lock background scroll when any menu is open (Point 1)
  useEffect(() => {
    if (!isActionMenuOpen && !isSortViewMenuOpen) return;

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('[data-menu-portal]')) {
        return; // Allow scrolling within the dropdown itself
      }
      e.preventDefault();
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleWheel as any, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleWheel as any);
    };
  }, [isActionMenuOpen, isSortViewMenuOpen]);

  // Close search when clicking outside (Point 2)
  useEffect(() => {
    if (!isSearchOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // Precompute default recommendations pool from CATALOG_PLAYLISTS for empty playlist
  const defaultRecommendations = useMemo(() => {
    const pool: SpotifyTrack[] = [];
    const seen = new Set<string>();
    for (const pl of CATALOG_PLAYLISTS) {
      for (const t of pl.tracks) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          pool.push(t);
          if (pool.length >= 10) return pool;
        }
      }
    }
    return pool;
  }, []);

  // Search effect for empty state recommendations (Zero mocks: live SoundCloud tracks)
  useEffect(() => {
    if (!emptyStateSearch.trim()) {
      setEmptyStateResults(defaultRecommendations);
      setIsSearchingEmptyState(false);
      return;
    }

    setIsSearchingEmptyState(true);
    const timer = setTimeout(async () => {
      try {
        const results = await integrationsApi.searchSoundCloudCatalog(emptyStateSearch.trim(), 10);
        const mapped: SpotifyTrack[] = (results || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album || t.title,
          albumArt: t.albumArt || '',
          durationMs: t.durationMs || 180000,
          previewUrl: null,
          spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
          source: 'soundcloud' as const,
          streamUrl: t.streamUrl,
        }));
        setEmptyStateResults(mapped);
      } catch (e) {
        console.error('Failed to search tracks for empty playlist:', e);
        const q = emptyStateSearch.toLowerCase();
        setEmptyStateResults(
          defaultRecommendations.filter(
            (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
          ),
        );
      } finally {
        setIsSearchingEmptyState(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [emptyStateSearch, defaultRecommendations]);

  const pendingInvite = useMemo(() => {
    if (!currentUser || !playlist) return null;
    return getPendingInviteForUser(playlist.id, currentUser.id, currentUser.username);
  }, [currentUser, playlist, getPendingInviteForUser]);

  const rawTracks = useMemo(() => playlist?.tracks || [], [playlist?.tracks]);

  // Filter and sort tracks (Point 3)
  const processedTracks = useMemo(() => {
    let list = rawTracks.map((t, idx) => ({ track: t, originalIndex: idx }));

    // Filter by query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        ({ track }) =>
          track.title.toLowerCase().includes(q) ||
          track.artist.toLowerCase().includes(q) ||
          (track.album && track.album.toLowerCase().includes(q)),
      );
    }

    // Sort
    if (sortKey !== 'default') {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'title') {
          cmp = a.track.title.localeCompare(b.track.title, 'ru', { sensitivity: 'base' });
        } else if (sortKey === 'artist') {
          cmp = (a.track.artist || '').localeCompare(b.track.artist || '', 'ru', {
            sensitivity: 'base',
          });
        } else if (sortKey === 'album') {
          const aAlb = a.track.album || a.track.title;
          const bAlb = b.track.album || b.track.title;
          cmp = aAlb.localeCompare(bAlb, 'ru', { sensitivity: 'base' });
        } else if (sortKey === 'dateAdded') {
          const aTime = getTrackDateAddedMs(a.track, a.originalIndex);
          const bTime = getTrackDateAddedMs(b.track, b.originalIndex);
          cmp = bTime - aTime; // Newer first on asc
        } else if (sortKey === 'releaseDate') {
          const aTime = getTrackReleaseDateMs(a.track, a.originalIndex);
          const bTime = getTrackReleaseDateMs(b.track, b.originalIndex);
          cmp = bTime - aTime; // Newer release first on asc
        } else if (sortKey === 'duration') {
          cmp = (a.track.durationMs || 0) - (b.track.durationMs || 0);
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [rawTracks, searchQuery, sortKey, sortDirection]);

  if (isLoadingRemote) {
    return (
      <div className="p-24 flex flex-col items-center justify-center text-purple-400 gap-3">
        <Loader2 size={36} className="animate-spin" />
        <p className="text-sm font-medium text-gray-300">Loading playlist...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Music size={40} className="mx-auto mb-3 opacity-40 text-purple-400" />
        <p className="text-base font-bold text-white">Playlist not found</p>
        <p className="text-xs text-gray-500 mt-1">It may have been deleted or moved</p>
      </div>
    );
  }

  // Access control: private playlist only viewable by owner & collaborators
  if (!canViewPlaylist(playlist, currentUser?.id)) {
    return (
      <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center max-w-md mx-auto select-none">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
          <Lock size={30} />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">This is a private playlist</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">
          The creator has restricted access to this playlist. Only the author and invited
          collaborators can view its tracks.
        </p>
        <button
          type="button"
          onClick={() => navigate('/music')}
          className="px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/30 cursor-pointer"
        >
          Return to Music Hub
        </button>
      </div>
    );
  }

  const currentUserId = currentUser?.id;
  const isExternalPlatform = Boolean(
    playlist.id === 'liked-songs' ||
    playlist.id.startsWith('sc-pl-') ||
    playlist.id.startsWith('sp-pl-') ||
    playlist.id.startsWith('playlist-') ||
    playlist.id.startsWith('pl-') ||
    CATALOG_PLAYLISTS.some((cp) => cp.id === playlist.id),
  );

  const isSelfCreatedPlaylist = Boolean(
    !isExternalPlatform &&
    !isLikedSongs &&
    (customPlaylists.some(
      (p) =>
        p.id === playlist.id &&
        (p.creatorId === currentUserId ||
          p.creator === 'You' ||
          (currentUser?.displayName && p.creator === currentUser.displayName) ||
          (!currentUserId && !p.creatorId)),
    ) ||
      (currentUserId && playlist.creatorId === currentUserId) ||
      playlist.creator === 'You') &&
    !(currentUserId && playlist.creatorId && playlist.creatorId !== currentUserId),
  );

  const isOwner = Boolean(
    !isExternalPlatform &&
    ((currentUserId && playlist.creatorId === currentUserId) ||
      playlist.creator === 'You' ||
      (currentUser?.displayName && playlist.creator === currentUser.displayName)),
  );
  const isCollaborator = Boolean(
    !isExternalPlatform &&
    !isOwner &&
    currentUserId &&
    playlist.collaborators?.some((c) => c.id === currentUserId),
  );
  const canEdit = isOwner || isCollaborator;

  const isThisPlaylistPlaying =
    isPlaying && currentTrack && rawTracks.some((t) => t.id === currentTrack.id);

  const totalDurationMs = rawTracks.reduce((acc, t) => acc + (t.durationMs || 180000), 0);
  const totalHours = Math.floor(totalDurationMs / 3600000);
  const remainingMinutes = Math.floor((totalDurationMs % 3600000) / 60000);
  const remainingSeconds = Math.floor((totalDurationMs % 60000) / 1000);

  const formattedTotalDuration =
    totalHours > 0
      ? `${totalHours} hr ${remainingMinutes} min`
      : `${remainingMinutes} min ${remainingSeconds > 0 ? `${remainingSeconds} sec` : ''}`;

  const handleTogglePlaylistPlayback = () => {
    if (processedTracks.length === 0) return;
    if (isThisPlaylistPlaying) {
      togglePlay();
    } else {
      const allTracks = processedTracks.map((p) => p.track);
      playTrack(allTracks[0], allTracks.slice(1), playlist.title);
    }
  };

  const handlePlayRow = (track: SpotifyTrack, index: number) => {
    const isThisTrackPlaying = isPlaying && currentTrack?.id === track.id;
    if (isThisTrackPlaying) {
      togglePlay();
    } else {
      const allTracks = processedTracks.map((p) => p.track);
      const queue = [...allTracks.slice(index + 1), ...allTracks.slice(0, index)];
      playTrack(track, queue, playlist.title);
    }
  };

  const handleColumnSortClick = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey('default');
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const isAnyMenuOpen = isActionMenuOpen || isSortViewMenuOpen;

  return (
    <div
      ref={scrollContainerRef}
      style={{ paddingBottom: `${dockOffset + 54}px` }}
      className={`flex-1 overflow-x-hidden min-w-0 w-full custom-scrollbar select-none ${
        isAnyMenuOpen ? 'overflow-y-hidden' : 'overflow-y-auto'
      }`}
    >
      {/* Hero Banner with Dark Liquid Purple Glass */}
      <div
        className={`relative p-8 flex flex-col sm:flex-row items-start sm:items-end gap-6 overflow-hidden ${
          isLikedSongs
            ? 'bg-gradient-to-b from-purple-900/60 via-[#180e2b]/40 to-transparent'
            : 'bg-gradient-to-b from-[#2d0f55]/50 via-[#140a24]/30 to-transparent'
        }`}
      >
        {/* Cover Art - Grey square for new playlists with Music2 icon */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-white/10 group bg-[#282828] flex items-center justify-center">
          {isLikedSongs ? (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center shadow-2xl shadow-purple-900/40">
              <Heart size={68} className="text-white fill-white drop-shadow-xl" />
            </div>
          ) : playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#282828] flex items-center justify-center text-[#737373] group-hover:text-white transition-colors">
              <Music2 size={68} strokeWidth={1.5} />
            </div>
          )}

          {/* Hover overlay to edit details if owner/collaborator and not liked songs */}
          {canEdit && !isLikedSongs && (
            <button
              type="button"
              onClick={() => setIsEditDetailsModalOpen(true)}
              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 text-white transition-opacity cursor-pointer z-10"
              title="Choose photo and edit details"
            >
              <Edit3 size={28} />
              <span className="text-xs font-semibold">Choose photo</span>
            </button>
          )}
        </div>

        {/* Info Column */}
        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest">
            {isLikedSongs ? (
              <span className="text-purple-300/80">Collection</span>
            ) : playlist.isPrivate ? (
              <span className="inline-flex items-center gap-1.5 text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                <Lock size={11} className="text-purple-400" />
                <span>Private playlist</span>
              </span>
            ) : (
              <span className="text-purple-300/80">Public playlist</span>
            )}
          </div>

          <h1
            onClick={() => canEdit && !isLikedSongs && setIsEditDetailsModalOpen(true)}
            className={`text-3xl sm:text-5xl font-black text-white tracking-tight mt-1 mb-3 truncate drop-shadow-md ${
              canEdit && !isLikedSongs
                ? 'hover:text-purple-300 cursor-pointer transition-colors'
                : ''
            }`}
            title={canEdit && !isLikedSongs ? 'Click to edit playlist details' : undefined}
          >
            {playlist.title}
          </h1>

          {playlist.description && (
            <p className="text-xs sm:text-sm text-gray-300 font-medium mb-3 max-w-xl line-clamp-2 leading-relaxed">
              {playlist.description}
            </p>
          )}

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 flex-wrap">
            <div
              onClick={() => {
                const targetUsername =
                  playlist.creatorId === currentUser?.id
                    ? currentUser?.username
                    : playlist.creatorUsername || pendingInvite?.inviterUsername;
                if (targetUsername) {
                  navigate(`/${targetUsername}`);
                }
              }}
              className={`flex items-center gap-2 ${
                (
                  playlist.creatorId === currentUser?.id
                    ? currentUser?.username
                    : playlist.creatorUsername || pendingInvite?.inviterUsername
                )
                  ? 'cursor-pointer hover:underline group'
                  : ''
              }`}
              title={
                (
                  playlist.creatorId === currentUser?.id
                    ? currentUser?.username
                    : playlist.creatorUsername || pendingInvite?.inviterUsername
                )
                  ? `View profile of ${playlist.creator}`
                  : undefined
              }
            >
              <Avatar
                src={
                  playlist.creatorId === currentUser?.id
                    ? currentUser?.avatar
                    : playlist.creatorAvatar || pendingInvite?.inviterAvatar
                }
                name={playlist.creator}
                size="xs"
                className="w-6 h-6 border border-white/20 transition-transform group-hover:scale-105"
              />
              <span className="text-white font-bold group-hover:text-purple-300 transition-colors">
                {playlist.creator}
              </span>
            </div>

            {/* Collaborator avatars & invite + button */}
            {!isLikedSongs &&
              ((playlist.collaborators && playlist.collaborators.length > 0) ||
                isSelfCreatedPlaylist) && (
                <div className="flex items-center gap-1.5 ml-1">
                  {playlist.collaborators && playlist.collaborators.length > 0 && (
                    <div className="flex items-center -space-x-1.5 mr-1">
                      {playlist.collaborators.map((c) => (
                        <div
                          key={c.id}
                          title={`${c.displayName || c.username} (Collaborator)`}
                          onClick={() => {
                            if (c.username) navigate(`/${c.username}`);
                          }}
                          className="cursor-pointer hover:scale-110 hover:z-10 transition-transform"
                        >
                          <Avatar
                            src={c.avatar}
                            name={c.displayName || c.username}
                            size="xs"
                            className="w-5 h-5 border-2 border-[#121216]"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {isSelfCreatedPlaylist && (
                    <Tooltip label="Invite collaborators" position="top">
                      <button
                        type="button"
                        onClick={() => setIsCollaboratorsModalOpen(true)}
                        aria-label="Invite collaborators"
                        className="w-6 h-6 rounded-full border border-white/30 hover:border-white text-gray-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              )}

            <span className="text-gray-500">•</span>
            <span>{formatTracksDeclension(rawTracks.length)}</span>
            {rawTracks.length > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 font-mono">{formattedTotalDuration}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inbound Collaborator Invite Banner */}
      {pendingInvite && (
        <div className="mx-8 my-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 to-indigo-950/50 border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-xl shadow-xl shadow-purple-950/30">
          <div className="flex items-center gap-3">
            <Avatar
              src={pendingInvite.inviterAvatar}
              name={pendingInvite.inviterDisplayName || pendingInvite.inviterUsername}
              size="md"
            />
            <div>
              <p className="text-sm font-bold text-white">
                {pendingInvite.inviterDisplayName || pendingInvite.inviterUsername} invited you to
                collaborate on this playlist
              </p>
              <p className="text-xs text-gray-400">
                You will be able to add and remove tracks and manage the playlist
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentUser) {
                  respondToPlaylistInvite(pendingInvite.id, true, {
                    id: currentUser.id,
                    username: currentUser.username,
                    displayName: currentUser.displayName,
                    avatar: currentUser.avatar,
                  });
                }
              }}
              className="px-5 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 active:scale-95 cursor-pointer"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => respondToPlaylistInvite(pendingInvite.id, false)}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Control Buttons Bar */}
      <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
        {rawTracks.length === 0 && !isLikedSongs ? (
          /* Empty Playlist Toolbar (Spotify Style) */
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('empty-playlist-search-input');
                el?.focus();
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black hover:bg-gray-200 text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Find tracks</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditDetailsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Edit3 size={15} />
                <span>Edit details</span>
              </button>
            )}

            {isSelfCreatedPlaylist && (
              <Tooltip label="Invite collaborators" position="top">
                <button
                  type="button"
                  onClick={() => setIsCollaboratorsModalOpen(true)}
                  aria-label="Invite collaborators"
                  className="p-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <UserPlus size={20} />
                </button>
              </Tooltip>
            )}

            <Tooltip label={`More information about «${playlist.title}»`} position="top">
              <button
                ref={actionButtonRef}
                type="button"
                data-menu-trigger="true"
                aria-label={`More information about «${playlist.title}»`}
                onClick={() => {
                  if (isActionMenuOpen) {
                    setIsActionMenuOpen(false);
                  } else if (actionButtonRef.current) {
                    setActionMenuAnchor(actionButtonRef.current.getBoundingClientRect());
                    setIsActionMenuOpen(true);
                  }
                }}
                className={`p-2.5 rounded-full transition-colors cursor-pointer ${
                  isActionMenuOpen
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <MoreHorizontal size={22} />
              </button>
            </Tooltip>
          </div>
        ) : (
          /* Normal Playlist Toolbar with tracks */
          <div className="flex items-center gap-4">
            {/* 1. Big Play Button in Brand Purple */}
            <Tooltip
              label={isThisPlaylistPlaying ? 'Pause' : `Play ${playlist.title}`}
              position="top"
            >
              <button
                type="button"
                onClick={handleTogglePlaylistPlayback}
                disabled={rawTracks.length === 0}
                aria-label="Play playlist"
                className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] hover:from-[#9333EA] hover:to-[#6D28D9] text-white shadow-xl shadow-purple-600/35 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-purple-400/20 cursor-pointer"
              >
                {isThisPlaylistPlaying ? (
                  <Pause size={24} className="fill-white" />
                ) : (
                  <Play size={24} className="fill-white ml-1" />
                )}
              </button>
            </Tooltip>

            {/* 2. Mini Preview Card: "View tracks in this playlist" */}
            {rawTracks.length > 0 && (
              <Tooltip label="View tracks in this playlist" position="top">
                <button
                  type="button"
                  onClick={() => {
                    const table = document.getElementById('playlist-tracklist-table');
                    if (table) {
                      table.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="group relative w-10 h-10 rounded-lg overflow-hidden border border-white/20 hover:border-purple-400/60 transition-all shrink-0 bg-black/40 flex items-center justify-center shadow-md cursor-pointer"
                >
                  {rawTracks[0].albumArt ? (
                    <img
                      src={rawTracks[0].albumArt}
                      alt={rawTracks[0].title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <Music size={16} className="text-gray-400" />
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-purple-900/30 transition-colors">
                    <Play size={12} className="text-white fill-white ml-0.5" />
                  </div>
                </button>
              </Tooltip>
            )}

            {/* 3. Shuffle Button with Dynamic Rich Tooltip */}
            <Tooltip
              label={
                isShuffled
                  ? `Turn off shuffle for "${playlist.title}"`
                  : `Turn on shuffle for "${playlist.title}"`
              }
              position="top"
            >
              <button
                type="button"
                aria-label={
                  isShuffled
                    ? `Turn off shuffle for "${playlist.title}"`
                    : `Turn on shuffle for "${playlist.title}"`
                }
                onClick={toggleShuffle}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isShuffled
                    ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Shuffle size={20} />
              </button>
            </Tooltip>

            {/* 4. Like / Add to Library Button */}
            {!isLikedSongs && (
              <Tooltip
                label={isPlaylistSaved(playlist.id) ? 'Remove from library' : 'Add to library'}
                position="top"
              >
                <button
                  type="button"
                  aria-label={
                    isPlaylistSaved(playlist.id) ? 'Remove from library' : 'Add to library'
                  }
                  onClick={() => toggleSavePlaylist(playlist.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                    isPlaylistSaved(playlist.id)
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 border border-purple-500'
                      : 'border border-white/40 text-gray-300 hover:border-white hover:text-white'
                  }`}
                >
                  {isPlaylistSaved(playlist.id) ? (
                    <Check size={16} strokeWidth={3} />
                  ) : (
                    <Plus size={18} strokeWidth={2.5} />
                  )}
                </button>
              </Tooltip>
            )}

            {/* 5. Collaborators button */}
            {isSelfCreatedPlaylist && (
              <Tooltip label="Invite collaborators" position="top">
                <button
                  type="button"
                  onClick={() => setIsCollaboratorsModalOpen(true)}
                  aria-label="Invite collaborators"
                  className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <UserPlus size={20} />
                </button>
              </Tooltip>
            )}

            {/* 6. "Three dots" Menu Button with Toggle Close on Repeat Click */}
            {!isLikedSongs && (
              <Tooltip label={`More information about «${playlist.title}»`} position="top">
                <button
                  ref={actionButtonRef}
                  type="button"
                  data-menu-trigger="true"
                  aria-label={`More information about «${playlist.title}»`}
                  onClick={() => {
                    if (isActionMenuOpen) {
                      setIsActionMenuOpen(false);
                    } else if (actionButtonRef.current) {
                      setActionMenuAnchor(actionButtonRef.current.getBoundingClientRect());
                      setIsActionMenuOpen(true);
                    }
                  }}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    isActionMenuOpen
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <MoreHorizontal size={22} />
                </button>
              </Tooltip>
            )}
          </div>
        )}

        {/* Right: Animated Slide-out Search & Spotify Sort/View Dropdown Menu */}
        {rawTracks.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Animated Slide-out Search Bar */}
            <div ref={searchContainerRef} className="relative flex items-center">
              <AnimatePresence initial={false}>
                {isSearchOpen ? (
                  <motion.div
                    key="search-input-box"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center overflow-hidden bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-xs text-white shadow-inner backdrop-blur-md"
                  >
                    <Search size={14} className="text-gray-400 mr-2 shrink-0" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search in playlist..."
                      autoFocus
                      className="bg-transparent border-none outline-none text-xs text-white placeholder:text-gray-500 w-full min-w-0"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="p-0.5 text-gray-400 hover:text-white shrink-0 ml-1 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="search-btn-trigger"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Tooltip label="Search in this playlist" position="top">
                      <button
                        type="button"
                        aria-label="Search in this playlist"
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                      >
                        <Search size={18} />
                      </button>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Unified Spotify Sort & View Dropdown Trigger */}
            <div className="relative">
              <button
                ref={sortViewButtonRef}
                type="button"
                aria-label="Sort and view"
                title="Sort and view options"
                onClick={() => {
                  if (isSortViewMenuOpen) {
                    setIsSortViewMenuOpen(false);
                  } else if (sortViewButtonRef.current) {
                    setSortViewMenuAnchor(sortViewButtonRef.current.getBoundingClientRect());
                    setIsSortViewMenuOpen(true);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold select-none cursor-pointer transition-colors duration-150 ${
                  sortKey !== 'default'
                    ? 'text-purple-300 bg-purple-500/15 hover:bg-purple-500/25'
                    : isSortViewMenuOpen
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{SORT_LABELS[sortKey]}</span>
                {viewMode === 'compact' ? (
                  <AlignJustify
                    size={14}
                    className={sortKey !== 'default' ? 'text-purple-400' : 'text-gray-400'}
                  />
                ) : (
                  <List
                    size={14}
                    className={sortKey !== 'default' ? 'text-purple-400' : 'text-gray-400'}
                  />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Tracklist Table OR Empty Playlist Recommendations */}
      {rawTracks.length === 0 && !isLikedSongs ? (
        /* Rich Empty Playlist Section: "Let's find some songs for your playlist" */
        <div id="empty-playlist-suggestions" className="px-8 py-6 border-t border-white/10 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Let's find some songs for your playlist
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Search for your favorite tracks or add recommended songs with one click
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                id="empty-playlist-search-input"
                type="text"
                value={emptyStateSearch}
                onChange={(e) => setEmptyStateSearch(e.target.value)}
                placeholder="Search for songs or artists"
                className="w-full bg-[#1e1e24] border border-white/10 rounded-full pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 shadow-inner"
              />
              {isSearchingEmptyState ? (
                <Loader2
                  size={15}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-400 animate-spin"
                />
              ) : emptyStateSearch ? (
                <button
                  type="button"
                  onClick={() => setEmptyStateSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          {/* List of recommended or searched streamable tracks */}
          <div className="space-y-1">
            {emptyStateResults.map((trk, idx) => {
              const isAdded = addedTrackIds.has(trk.id);
              return (
                <div
                  key={`empty-trk-${trk.id}-${idx}`}
                  className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/[0.04]"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                      {trk.albumArt ? (
                        <img
                          src={trk.albumArt}
                          alt={trk.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Music2 size={18} />
                        </div>
                      )}
                      {/* Quick play overlay on hover */}
                      <button
                        type="button"
                        onClick={() => playTrack(trk, emptyStateResults, playlist.title)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white hover:text-purple-400 transition-opacity cursor-pointer"
                      >
                        <Play size={16} className="fill-current ml-0.5" />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {trk.title}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{trk.artist}</p>
                    </div>

                    {trk.album && (
                      <div className="hidden md:block w-48 text-xs text-gray-400 truncate px-4">
                        {trk.album}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-4">
                    <button
                      type="button"
                      onClick={() => {
                        addTrackToPlaylist(playlist.id, trk);
                        setAddedTrackIds((prev) => new Set([...prev, trk.id]));
                      }}
                      disabled={isAdded}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isAdded
                          ? 'bg-white/10 text-gray-400 cursor-default border border-white/10'
                          : 'border border-white/20 hover:border-white text-white hover:bg-white/10 hover:scale-105 active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={14} className="text-purple-400" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Tracklist Table with strictly fixed layout - ZERO horizontal scroll & ZERO hover jump */
        <div className="px-8 min-w-0 w-full overflow-hidden">
          <table
            id="playlist-tracklist-table"
            className="w-full table-fixed text-left border-collapse min-w-0"
          >
            <colgroup>
              <col className={viewMode === 'compact' ? 'w-10' : 'w-12'} />
              <col className="w-auto" />
              {viewMode === 'compact' && <col className="w-[24%]" />}
              <col className={viewMode === 'compact' ? 'w-[22%]' : 'w-[28%]'} />
              <col className={viewMode === 'compact' ? 'w-[18%]' : 'w-[22%]'} />
              <col className="w-24" />
            </colgroup>

            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {/* # Column */}
                <th
                  onClick={() => setSortKey('default')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:text-white"
                  title="Reset sort"
                >
                  #
                </th>

                {/* Title Column */}
                <th
                  onClick={() => handleColumnSortClick('title')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Title</span>
                    {sortKey === 'title' && (
                      <span className="text-purple-400">
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </span>
                    )}
                  </div>
                </th>

                {/* Artist Column (Visible only in Compact Mode as separate column, matching Screenshot 5) */}
                {viewMode === 'compact' && (
                  <th
                    onClick={() => handleColumnSortClick('artist')}
                    className="py-2.5 px-3 cursor-pointer hover:text-white"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Artist</span>
                      {sortKey === 'artist' && (
                        <span className="text-purple-400">
                          {sortDirection === 'asc' ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                )}

                {/* Album Column */}
                <th
                  onClick={() => handleColumnSortClick('album')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Album</span>
                    {sortKey === 'album' && (
                      <span className="text-purple-400">
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </span>
                    )}
                  </div>
                </th>

                {/* Date Added Column */}
                <th
                  onClick={() => handleColumnSortClick('dateAdded')}
                  className="py-2.5 px-3 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date added</span>
                    {sortKey === 'dateAdded' && (
                      <span className="text-purple-400">
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </span>
                    )}
                  </div>
                </th>

                {/* Duration Column */}
                <th
                  onClick={() => handleColumnSortClick('duration')}
                  className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <Clock size={14} />
                    {sortKey === 'duration' && (
                      <span className="text-purple-400">
                        {sortDirection === 'asc' ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {processedTracks.length === 0 ? (
                <tr>
                  <td colSpan={viewMode === 'compact' ? 6 : 5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-3 shadow-inner">
                        <Heart size={28} />
                      </div>
                      <p className="text-base font-bold text-white mb-1">
                        {searchQuery.trim()
                          ? 'No tracks found matching your query'
                          : isLikedSongs
                            ? 'Songs you like will appear here'
                            : 'There are no songs in this playlist yet'}
                      </p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {searchQuery.trim()
                          ? 'Try changing your search query.'
                          : isLikedSongs
                            ? 'Click the heart icon on any track to add it here.'
                            : 'Use search above to find and add tracks to this playlist.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedTracks.map(({ track }, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isTrackLiked(track.id);

                  return (
                    <tr
                      key={`${track.id}-${idx}`}
                      onClick={() => handlePlayRow(track, idx)}
                      onContextMenu={(e) => handleTrackContextMenu(e, track)}
                      className={`group border-b border-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer ${
                        isCurrent ? 'bg-white/[0.07]' : ''
                      }`}
                    >
                      {/* # or Play Button or Equalizer (Fixed width) */}
                      <td
                        className={`text-center text-xs font-medium ${
                          viewMode === 'compact' ? 'py-2 px-2 w-10' : 'py-3 px-3 w-12'
                        }`}
                      >
                        <div className="w-6 h-6 mx-auto flex items-center justify-center">
                          <span className="group-hover:hidden flex items-center justify-center">
                            {isThisPlaying ? (
                              <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5">
                                <span className="w-0.5 bg-purple-400 animate-pulse h-full rounded-full" />
                                <span className="w-0.5 bg-purple-400 animate-pulse h-2/3 rounded-full [animation-delay:150ms]" />
                                <span className="w-0.5 bg-purple-400 animate-pulse h-4/5 rounded-full [animation-delay:300ms]" />
                              </div>
                            ) : (
                              <span
                                className={
                                  isCurrent ? 'text-purple-400 font-bold' : 'text-gray-400'
                                }
                              >
                                {idx + 1}
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayRow(track, idx);
                            }}
                            className="hidden group-hover:flex items-center justify-center text-white hover:text-purple-400 transition-colors cursor-pointer"
                          >
                            {isThisPlaying ? (
                              <Pause size={15} className="fill-current" />
                            ) : (
                              <Play size={15} className="fill-current ml-0.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Track Title (+ Cover Art in List mode, NO cover in Compact mode matching Screenshot 5) */}
                      <td
                        className={`min-w-0 ${viewMode === 'compact' ? 'py-2 px-3' : 'py-3 px-3'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Cover thumbnail only in List view */}
                          {viewMode === 'list' && (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                              {track.albumArt ? (
                                <img
                                  src={track.albumArt}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                  <Music size={16} />
                                </div>
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/music/track/${track.id}`);
                              }}
                              className={`text-sm font-bold truncate hover:underline cursor-pointer ${
                                isCurrent
                                  ? 'text-purple-400'
                                  : 'text-white group-hover:text-purple-300 transition-colors'
                              }`}
                            >
                              {track.title}
                            </p>

                            {/* Artist underneath title only in List mode */}
                            {viewMode === 'list' && (
                              <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1.5">
                                <span className="px-1 py-0.5 rounded bg-white/10 text-[9px] font-bold text-gray-300">
                                  E
                                </span>
                                <span className="truncate">{track.artist}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Separate Artist Column in Compact Mode (Screenshot 5) */}
                      {viewMode === 'compact' && (
                        <td className="py-2 px-3 text-xs text-gray-300 min-w-0">
                          <span className="truncate block hover:underline cursor-pointer">
                            {track.artist}
                          </span>
                        </td>
                      )}

                      {/* Album Column */}
                      <td
                        className={`text-xs text-gray-400 min-w-0 ${
                          viewMode === 'compact' ? 'py-2 px-3' : 'py-3 px-3'
                        }`}
                      >
                        <span className="truncate block hover:underline cursor-pointer">
                          {track.album || track.title}
                        </span>
                      </td>

                      {/* Date Added Column */}
                      <td
                        className={`text-xs text-gray-400 min-w-0 ${
                          viewMode === 'compact' ? 'py-2 px-3' : 'py-3 px-3'
                        }`}
                      >
                        <span className="truncate block">{formatSpotifyTrackAddedDate(track)}</span>
                      </td>

                      {/* Like Button, 3 Dots & Duration */}
                      <td
                        className={`text-right w-28 shrink-0 ${
                          viewMode === 'compact' ? 'py-2 px-3' : 'py-3 px-3'
                        }`}
                      >
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLikeTrack(track);
                            }}
                            title={liked ? 'Remove from liked' : 'Save to liked'}
                            className={`p-1 rounded-full hover:scale-110 transition-all cursor-pointer ${
                              liked
                                ? 'text-purple-400 opacity-100'
                                : 'text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Heart
                              size={15}
                              className={liked ? 'fill-purple-400 text-purple-400' : ''}
                            />
                          </button>

                          {/* 3 Dots button */}
                          <button
                            type="button"
                            data-menu-trigger="true"
                            onClick={(e) => handleTrackThreeDots(e, track)}
                            title="More options"
                            className="p-1 rounded-full text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          <span className="text-xs text-gray-400 font-mono w-10 text-right">
                            {formatDuration(track.durationMs)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3-Dots Action Dropdown Menu via React Portal */}
      <PlaylistActionMenu
        isOpen={isActionMenuOpen}
        onClose={() => setIsActionMenuOpen(false)}
        anchorRect={actionMenuAnchor}
        playlist={playlist}
        triggerRef={actionButtonRef}
      />

      {/* Track Action Dropdown Menu via React Portal */}
      {activeTrackMenu && (
        <TrackActionMenu
          isOpen={Boolean(activeTrackMenu)}
          onClose={() => setActiveTrackMenu(null)}
          anchorRect={activeTrackMenu.rect}
          track={activeTrackMenu.track}
        />
      )}

      {/* Spotify Sort & View Dropdown Menu via React Portal (Screenshots 4 & 5) */}
      <PlaylistSortViewMenu
        isOpen={isSortViewMenuOpen}
        onClose={() => setIsSortViewMenuOpen(false)}
        anchorRect={sortViewMenuAnchor}
        triggerRef={sortViewButtonRef}
        sortKey={sortKey}
        onSelectSortKey={(k) => {
          setSortKey(k);
          setSortDirection('asc');
        }}
        viewMode={viewMode}
        onSelectViewMode={(m) => setViewMode(m)}
      />

      {/* Collaborators Modal */}
      <PlaylistCollaboratorsModal
        isOpen={isCollaboratorsModalOpen}
        onClose={() => setIsCollaboratorsModalOpen(false)}
        playlist={playlist}
      />

      {/* Edit Details Modal */}
      <EditPlaylistDetailsModal
        isOpen={isEditDetailsModalOpen}
        onClose={() => setIsEditDetailsModalOpen(false)}
        playlist={playlist}
      />
    </div>
  );
};
