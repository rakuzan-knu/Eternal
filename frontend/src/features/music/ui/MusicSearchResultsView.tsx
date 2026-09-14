import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  Loader2,
  Music,
  Plus,
  Check,
  ChevronDown,
  Clock,
  MoreHorizontal,
} from 'lucide-react';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import type { MusicCatalogSource, MusicPlaylist } from '../model/types';
import { isPlaylistSearchDiscoverable } from '../model/types';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import Tooltip from '@/shared/ui/Tooltip';
import { TrackActionMenu } from './TrackActionMenu';
import { PlaylistActionMenu } from './PlaylistActionMenu';
import { isSoundCloudUrl } from '@/shared/lib/urlSecurity';

export type SearchCategory = 'all' | 'tracks' | 'playlists';

interface MusicSearchResultsViewProps {
  query: string;
  source: MusicCatalogSource;
  onClearSearch?: () => void;
}

const formatDuration = (ms?: number): string => {
  if (!ms || ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const MusicSearchResultsView: React.FC<MusicSearchResultsViewProps> = ({
  query,
  source,
  onClearSearch,
}) => {
  const navigate = useNavigate();

  const {
    isTrackLiked,
    toggleLikeTrack,
    playlists,
    catalogPlaylists,
    addTrackToPlaylist,
    setSelectedPlaylistId,
  } = useMusicHubStore();

  const handleOpenPlaylist = (playlistId: string) => {
    onClearSearch?.();
    setSelectedPlaylistId(playlistId);
    navigate(`/music/playlist/${playlistId}`);
  };

  const handleOpenTrack = (trackId: string) => {
    onClearSearch?.();
    navigate(`/music/track/${trackId}`);
  };

  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [remotePlaylists, setRemotePlaylists] = useState<MusicPlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Pagination for tracks & playlists
  const [trackOffset, setTrackOffset] = useState({ sc: 0, sp: 0 });
  const [isLoadingMoreTracks, setIsLoadingMoreTracks] = useState(false);
  const [hasMoreTracks, setHasMoreTracks] = useState(true);

  const [playlistOffset, setPlaylistOffset] = useState({ sc: 0, sp: 0 });
  const [isLoadingMorePlaylists, setIsLoadingMorePlaylists] = useState(false);
  const [hasMorePlaylists, setHasMorePlaylists] = useState(true);

  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);

  // Column visibility for Songs table view (Point 2, Screenshot 3)
  const [visibleColumns, setVisibleColumns] = useState({
    album: true,
    duration: true,
  });
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const columnsBtnRef = useRef<HTMLButtonElement>(null);
  const columnsMenuRef = useRef<HTMLDivElement>(null);

  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);

  const { data: currentUser } = useCurrentUser();
  const { dockOffset } = useSpotifyDockOffset(32);

  const [activePlaylistMenuTrackId, setActivePlaylistMenuTrackId] = useState<string | null>(null);
  const [activeTrackMenu, setActiveTrackMenu] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
    triggerRef?: React.RefObject<HTMLElement | null>;
  } | null>(null);

  const [activePlaylistMenu, setActivePlaylistMenu] = useState<{
    playlist: MusicPlaylist;
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

  const handlePlaylistContextMenu = (e: React.MouseEvent, pl: MusicPlaylist) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePlaylistMenu({
      playlist: pl,
      rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
    });
  };

  // Close columns menu on outside click with triggerRef protection for repeat click toggle
  useEffect(() => {
    if (!isColumnsMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (columnsBtnRef.current && columnsBtnRef.current.contains(e.target as Node)) {
        return;
      }
      if (columnsMenuRef.current && !columnsMenuRef.current.contains(e.target as Node)) {
        setIsColumnsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnsMenuOpen]);

  // Search tracks & playlists from SoundCloud & Spotify with high limits & strict platform isolation
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setRemotePlaylists([]);
      setIsLoading(false);
      setIsLoadingPlaylists(false);
      setHasMoreTracks(false);
      setHasMorePlaylists(false);
      return;
    }

    setIsLoading(true);
    setIsLoadingPlaylists(true);
    setHasMoreTracks(true);
    setHasMorePlaylists(true);

    const timeoutId = setTimeout(async () => {
      try {
        let combinedTracks: SpotifyTrack[] = [];
        let combinedPlaylists: MusicPlaylist[] = [];

        if (source === 'soundcloud') {
          // Strictly SoundCloud: zero Spotify tracks or playlists
          const [scTracks, scPls] = await Promise.all([
            typeof integrationsApi.searchSoundCloudCatalog === 'function'
              ? integrationsApi.searchSoundCloudCatalog(trimmed, 50, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSoundCloudPlaylists === 'function'
              ? integrationsApi.searchSoundCloudPlaylists(trimmed, 30, 0).catch(() => [])
              : Promise.resolve([]),
          ]);

          if (Array.isArray(scTracks)) {
            combinedTracks = scTracks.map((t: any) => ({
              id: t.id,
              title: t.title,
              artist: t.artist,
              album: t.album || t.title,
              albumArt: t.albumArt,
              durationMs: t.durationMs || 180000,
              previewUrl: null,
              spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
              contextName: 'SoundCloud Search',
              source: 'soundcloud' as const,
              streamUrl: t.streamUrl,
            }));
          }

          if (Array.isArray(scPls)) {
            combinedPlaylists = scPls.map((p: any) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              coverUrl: p.coverUrl,
              creator: p.creator,
              creatorUsername: p.creatorUsername,
              creatorAvatar: p.creatorAvatar,
              trackCount: p.trackCount,
              tracks: p.tracks || [],
              createdAt: new Date().toISOString(),
              source: 'soundcloud' as const,
            }));
          }

          setTrackOffset({ sc: 50, sp: 0 });
          setPlaylistOffset({ sc: 30, sp: 0 });
          setHasMoreTracks(combinedTracks.length >= 35);
          setHasMorePlaylists(combinedPlaylists.length >= 20);
        } else if (source === 'spotify') {
          // Strictly Spotify: zero SoundCloud tracks or playlists
          const [spTracks, spPls] = await Promise.all([
            typeof integrationsApi.searchSpotifyCatalog === 'function'
              ? integrationsApi.searchSpotifyCatalog(trimmed, 40, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSpotifyPlaylists === 'function'
              ? integrationsApi.searchSpotifyPlaylists(trimmed, 30, 0).catch(() => [])
              : Promise.resolve([]),
          ]);

          if (Array.isArray(spTracks)) {
            combinedTracks = spTracks.map((t: any) => ({
              id: t.id,
              title: t.title || t.name,
              artist: t.artist,
              album: t.album?.name || t.album || t.title || t.name,
              albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
              durationMs: t.durationMs || t.duration_ms || 180000,
              previewUrl: t.previewUrl || null,
              spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
              contextName: 'Spotify Search',
              source: 'spotify' as const,
            }));
          }

          if (Array.isArray(spPls)) {
            combinedPlaylists = spPls.map((p: any) => ({
              id: p.id,
              title: p.title,
              description: p.description,
              coverUrl: p.coverUrl,
              creator: p.creator,
              creatorUsername: p.creatorUsername,
              trackCount: p.trackCount,
              tracks: [],
              createdAt: new Date().toISOString(),
              source: 'spotify' as const,
            }));
          }

          setTrackOffset({ sc: 0, sp: 40 });
          setPlaylistOffset({ sc: 0, sp: 30 });
          setHasMoreTracks(combinedTracks.length >= 30);
          setHasMorePlaylists(combinedPlaylists.length >= 20);
        } else {
          // 'all': query both SoundCloud and Spotify concurrently
          const [scTracks, spTracks, scPls, spPls] = await Promise.all([
            typeof integrationsApi.searchSoundCloudCatalog === 'function'
              ? integrationsApi.searchSoundCloudCatalog(trimmed, 30, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSpotifyCatalog === 'function'
              ? integrationsApi.searchSpotifyCatalog(trimmed, 30, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSoundCloudPlaylists === 'function'
              ? integrationsApi.searchSoundCloudPlaylists(trimmed, 20, 0).catch(() => [])
              : Promise.resolve([]),
            typeof integrationsApi.searchSpotifyPlaylists === 'function'
              ? integrationsApi.searchSpotifyPlaylists(trimmed, 20, 0).catch(() => [])
              : Promise.resolve([]),
          ]);

          const mappedScTracks: SpotifyTrack[] = Array.isArray(scTracks)
            ? scTracks.map((t: any) => ({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album || t.title,
                albumArt: t.albumArt,
                durationMs: t.durationMs || 180000,
                previewUrl: null,
                spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
                contextName: 'SoundCloud Search',
                source: 'soundcloud' as const,
                streamUrl: t.streamUrl,
              }))
            : [];

          const mappedSpTracks: SpotifyTrack[] = Array.isArray(spTracks)
            ? spTracks.map((t: any) => ({
                id: t.id,
                title: t.title || t.name,
                artist: t.artist,
                album: t.album?.name || t.album || t.title || t.name,
                albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
                durationMs: t.durationMs || t.duration_ms || 180000,
                previewUrl: t.previewUrl || null,
                spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
                contextName: 'Spotify Search',
                source: 'spotify' as const,
              }))
            : [];

          // Interleave tracks
          const maxTrackLen = Math.max(mappedScTracks.length, mappedSpTracks.length);
          for (let i = 0; i < maxTrackLen; i++) {
            if (i < mappedScTracks.length) combinedTracks.push(mappedScTracks[i]);
            if (i < mappedSpTracks.length) combinedTracks.push(mappedSpTracks[i]);
          }

          const mappedScPls: MusicPlaylist[] = Array.isArray(scPls)
            ? scPls.map((p: any) => ({
                id: p.id,
                title: p.title,
                description: p.description,
                coverUrl: p.coverUrl,
                creator: p.creator,
                creatorUsername: p.creatorUsername,
                creatorAvatar: p.creatorAvatar,
                trackCount: p.trackCount,
                tracks: p.tracks || [],
                createdAt: new Date().toISOString(),
                source: 'soundcloud' as const,
              }))
            : [];

          const mappedSpPls: MusicPlaylist[] = Array.isArray(spPls)
            ? spPls.map((p: any) => ({
                id: p.id,
                title: p.title,
                description: p.description,
                coverUrl: p.coverUrl,
                creator: p.creator,
                creatorUsername: p.creatorUsername,
                trackCount: p.trackCount,
                tracks: [],
                createdAt: new Date().toISOString(),
                source: 'spotify' as const,
              }))
            : [];

          // Interleave playlists
          const maxPlLen = Math.max(mappedScPls.length, mappedSpPls.length);
          for (let i = 0; i < maxPlLen; i++) {
            if (i < mappedScPls.length) combinedPlaylists.push(mappedScPls[i]);
            if (i < mappedSpPls.length) combinedPlaylists.push(mappedSpPls[i]);
          }

          setTrackOffset({ sc: 30, sp: 30 });
          setPlaylistOffset({ sc: 20, sp: 20 });
          setHasMoreTracks(mappedScTracks.length >= 20 || mappedSpTracks.length >= 20);
          setHasMorePlaylists(mappedScPls.length >= 10 || mappedSpPls.length >= 10);
        }

        setResults(combinedTracks);
        setRemotePlaylists(combinedPlaylists);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingPlaylists(false);
      }
    }, 260);

    return () => clearTimeout(timeoutId);
  }, [query, source]);

  // Load more tracks when in 'tracks' tab
  const handleLoadMoreTracks = async () => {
    if (isLoadingMoreTracks || !hasMoreTracks) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoadingMoreTracks(true);
    try {
      let newTracks: SpotifyTrack[] = [];
      if (source === 'soundcloud') {
        const scData = await integrationsApi.searchSoundCloudCatalog(trimmed, 40, trackOffset.sc);
        const mapped = (scData || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album || t.title,
          albumArt: t.albumArt,
          durationMs: t.durationMs || 180000,
          previewUrl: null,
          spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
          contextName: 'SoundCloud Search',
          source: 'soundcloud' as const,
          streamUrl: t.streamUrl,
        }));
        newTracks = mapped;
        setTrackOffset((prev) => ({ ...prev, sc: prev.sc + 40 }));
        if (mapped.length < 20) setHasMoreTracks(false);
      } else if (source === 'spotify') {
        const spData = await integrationsApi.searchSpotifyCatalog(trimmed, 30, trackOffset.sp);
        const mapped = (spData || []).map((t: any) => ({
          id: t.id,
          title: t.title || t.name,
          artist: t.artist,
          album: t.album?.name || t.album || t.title || t.name,
          albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
          durationMs: t.durationMs || t.duration_ms || 180000,
          previewUrl: t.previewUrl || null,
          spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
          contextName: 'Spotify Search',
          source: 'spotify' as const,
        }));
        newTracks = mapped;
        setTrackOffset((prev) => ({ ...prev, sp: prev.sp + 30 }));
        if (mapped.length < 15) setHasMoreTracks(false);
      } else {
        const [scData, spData] = await Promise.all([
          integrationsApi.searchSoundCloudCatalog(trimmed, 25, trackOffset.sc).catch(() => []),
          integrationsApi.searchSpotifyCatalog(trimmed, 25, trackOffset.sp).catch(() => []),
        ]);
        const mappedSc = (scData || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album || t.title,
          albumArt: t.albumArt,
          durationMs: t.durationMs || 180000,
          previewUrl: null,
          spotifyUrl: t.spotifyUrl || 'https://soundcloud.com',
          contextName: 'SoundCloud Search',
          source: 'soundcloud' as const,
          streamUrl: t.streamUrl,
        }));
        const mappedSp = (spData || []).map((t: any) => ({
          id: t.id,
          title: t.title || t.name,
          artist: t.artist,
          album: t.album?.name || t.album || t.title || t.name,
          albumArt: t.albumArt || t.album?.images?.[0]?.url || '',
          durationMs: t.durationMs || t.duration_ms || 180000,
          previewUrl: t.previewUrl || null,
          spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
          contextName: 'Spotify Search',
          source: 'spotify' as const,
        }));
        const maxLen = Math.max(mappedSc.length, mappedSp.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < mappedSc.length) newTracks.push(mappedSc[i]);
          if (i < mappedSp.length) newTracks.push(mappedSp[i]);
        }
        setTrackOffset((prev) => ({ sc: prev.sc + 25, sp: prev.sp + 25 }));
        if (mappedSc.length < 10 && mappedSp.length < 10) setHasMoreTracks(false);
      }

      if (newTracks.length > 0) {
        setResults((prev) => {
          const seen = new Set(prev.map((t) => t.id));
          const uniqueNew = newTracks.filter((t) => !seen.has(t.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setHasMoreTracks(false);
      }
    } catch (err) {
      console.error('Failed to load more tracks:', err);
    } finally {
      setIsLoadingMoreTracks(false);
    }
  };

  // Load more playlists when in 'playlists' tab
  const handleLoadMorePlaylists = async () => {
    if (isLoadingMorePlaylists || !hasMorePlaylists) return;
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoadingMorePlaylists(true);
    try {
      let newPlaylists: MusicPlaylist[] = [];
      if (source === 'soundcloud') {
        const scData = await integrationsApi.searchSoundCloudPlaylists(
          trimmed,
          25,
          playlistOffset.sc,
        );
        const mapped = (scData || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          coverUrl: p.coverUrl,
          creator: p.creator,
          creatorUsername: p.creatorUsername,
          creatorAvatar: p.creatorAvatar,
          trackCount: p.trackCount,
          tracks: p.tracks || [],
          createdAt: new Date().toISOString(),
          source: 'soundcloud' as const,
        }));
        newPlaylists = mapped;
        setPlaylistOffset((prev) => ({ ...prev, sc: prev.sc + 25 }));
        if (mapped.length < 15) setHasMorePlaylists(false);
      } else if (source === 'spotify') {
        const spData = await integrationsApi.searchSpotifyPlaylists(trimmed, 25, playlistOffset.sp);
        const mapped = (spData || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          coverUrl: p.coverUrl,
          creator: p.creator,
          creatorUsername: p.creatorUsername,
          trackCount: p.trackCount,
          tracks: [],
          createdAt: new Date().toISOString(),
          source: 'spotify' as const,
        }));
        newPlaylists = mapped;
        setPlaylistOffset((prev) => ({ ...prev, sp: prev.sp + 25 }));
        if (mapped.length < 15) setHasMorePlaylists(false);
      } else {
        const [scData, spData] = await Promise.all([
          integrationsApi.searchSoundCloudPlaylists(trimmed, 15, playlistOffset.sc).catch(() => []),
          integrationsApi.searchSpotifyPlaylists(trimmed, 15, playlistOffset.sp).catch(() => []),
        ]);
        const mappedSc = (scData || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          coverUrl: p.coverUrl,
          creator: p.creator,
          creatorUsername: p.creatorUsername,
          creatorAvatar: p.creatorAvatar,
          trackCount: p.trackCount,
          tracks: p.tracks || [],
          createdAt: new Date().toISOString(),
          source: 'soundcloud' as const,
        }));
        const mappedSp = (spData || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          coverUrl: p.coverUrl,
          creator: p.creator,
          creatorUsername: p.creatorUsername,
          trackCount: p.trackCount,
          tracks: [],
          createdAt: new Date().toISOString(),
          source: 'spotify' as const,
        }));
        const maxLen = Math.max(mappedSc.length, mappedSp.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < mappedSc.length) newPlaylists.push(mappedSc[i]);
          if (i < mappedSp.length) newPlaylists.push(mappedSp[i]);
        }
        setPlaylistOffset((prev) => ({ sc: prev.sc + 15, sp: prev.sp + 15 }));
        if (mappedSc.length < 5 && mappedSp.length < 5) setHasMorePlaylists(false);
      }

      if (newPlaylists.length > 0) {
        setRemotePlaylists((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const unique = newPlaylists.filter((p) => !seen.has(p.id));
          return [...prev, ...unique];
        });
      } else {
        setHasMorePlaylists(false);
      }
    } catch (err) {
      console.error('Failed to load more playlists:', err);
    } finally {
      setIsLoadingMorePlaylists(false);
    }
  };

  // Search playlists from catalog, user libraries, and live remote sources
  const matchingPlaylists = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Filter local candidates strictly by discoverability and source
    const localCandidates = [...catalogPlaylists, ...playlists].filter((p) => {
      const isDiscoverable = isPlaylistSearchDiscoverable(p, currentUser?.id);
      if (!isDiscoverable) return false;
      if (source === 'soundcloud') {
        return (p as any).source === 'soundcloud' || p.id.startsWith('sc-pl-');
      }
      if (source === 'spotify') {
        return (p as any).source === 'spotify' || p.id.startsWith('sp-pl-');
      }
      return true;
    });

    const directLocalMatches = localCandidates.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.creator.toLowerCase().includes(q) ||
        p.tracks.some(
          (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q),
        ),
    );

    // Filter remote playlists according to active source
    let filteredRemote = remotePlaylists;
    if (source === 'soundcloud') {
      filteredRemote = remotePlaylists.filter(
        (p) => (p as any).source === 'soundcloud' || p.id.startsWith('sc-pl-'),
      );
    } else if (source === 'spotify') {
      filteredRemote = remotePlaylists.filter(
        (p) => (p as any).source === 'spotify' || p.id.startsWith('sp-pl-'),
      );
    }

    // Merge remote and local (remote first, then local, deduplicated by id)
    const seen = new Set<string>();
    const combined: MusicPlaylist[] = [];

    for (const pl of [...filteredRemote, ...directLocalMatches]) {
      if (!seen.has(pl.id)) {
        seen.add(pl.id);
        combined.push(pl);
      }
    }

    if (combined.length > 0) {
      return combined;
    }

    // Fallback: If query has tracks returned but no direct playlist name, provide dynamic playlist mixes matching query
    if (results.length > 0) {
      return [
        {
          id: `mix-${encodeURIComponent(q)}`,
          title: `${query} — Best Mix`,
          description: `Top tracks for "${query}"`,
          coverUrl: results[0].albumArt || '',
          creator: 'Eternal Curated',
          tracks: results,
          createdAt: new Date().toISOString(),
        },
      ];
    }

    return [];
  }, [query, remotePlaylists, catalogPlaylists, playlists, results, currentUser?.id, source]);

  const handlePlayTrack = (track: SpotifyTrack, index: number, trackList: SpotifyTrack[]) => {
    const isThisPlaying = isPlaying && currentTrack?.id === track.id;
    if (isThisPlaying) {
      togglePlay();
    } else {
      const isSoundCloud =
        track.source === 'soundcloud' ||
        Boolean(track.streamUrl) ||
        track.id.startsWith('sc-') ||
        track.id.startsWith('soundcloud-') ||
        isSoundCloudUrl(track.spotifyUrl);

      let queue = [...trackList.slice(index + 1), ...trackList.slice(0, index)];
      if (isSoundCloud) {
        queue = queue.filter(
          (t) =>
            t.source === 'soundcloud' ||
            Boolean(t.streamUrl) ||
            t.id.startsWith('sc-') ||
            t.id.startsWith('soundcloud-') ||
            isSoundCloudUrl(t.spotifyUrl),
        );
      }
      playTrack(track, queue, `Search: ${query}`);
    }
  };

  const handlePlayPlaylist = async (playlist: MusicPlaylist, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If tracks are already loaded, play immediately
    if (playlist.tracks && playlist.tracks.length > 0) {
      const first = playlist.tracks[0];
      const rest = playlist.tracks.slice(1);
      playTrack(first, rest, playlist.title);
      return;
    }

    // Otherwise, fetch remote tracks on demand before starting playback
    setLoadingPlaylistId(playlist.id);
    try {
      let fetchedTracks: SpotifyTrack[] = [];
      if (playlist.id.startsWith('sc-pl-') || (playlist as any).source === 'soundcloud') {
        const data = await integrationsApi.getSoundCloudPlaylist(playlist.id);
        if (data?.tracks && data.tracks.length > 0) {
          fetchedTracks = data.tracks.map((t: any) => ({
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
          }));
        }
      } else {
        const data = await integrationsApi.getSpotifyPlaylist(playlist.id);
        if (data?.tracks && data.tracks.length > 0) {
          fetchedTracks = data.tracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            artist: t.artist,
            album: data.title,
            albumArt: t.albumArt || data.coverUrl,
            durationMs: t.durationMs || 180000,
            previewUrl: t.previewUrl || null,
            spotifyUrl: t.spotifyUrl || `https://open.spotify.com/track/${t.id}`,
            source: 'spotify' as const,
          }));
        }
      }

      if (fetchedTracks.length > 0) {
        setRemotePlaylists((prev) =>
          prev.map((p) => (p.id === playlist.id ? { ...p, tracks: fetchedTracks } : p)),
        );
        playTrack(fetchedTracks[0], fetchedTracks.slice(1), playlist.title);
      }
    } catch (err) {
      console.error('Failed to load tracks for playlist playback:', err);
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  const isEmpty =
    results.length === 0 && matchingPlaylists.length === 0 && !isLoading && !isLoadingPlaylists;

  return (
    <div
      style={{ paddingBottom: `${dockOffset + 48}px` }}
      className="p-6 overflow-y-auto custom-scrollbar select-none"
    >
      {/* Search Header Title */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Search Results</h2>
          <p className="text-xs text-gray-400 mt-0.5">For "{query}"</p>
        </div>
        {(isLoading || isLoadingPlaylists) && (
          <div className="flex items-center gap-2 text-xs text-purple-400">
            <Loader2 size={16} className="animate-spin" />
            <span>Searching...</span>
          </div>
        )}
      </div>

      {/* 1. Category Filter Pills: All, Songs, Playlists */}
      <div className="flex items-center gap-2 mb-6 select-none overflow-x-auto custom-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSearchCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            searchCategory === 'all'
              ? 'bg-white text-black shadow-md shadow-white/10 scale-105'
              : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
          }`}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => setSearchCategory('tracks')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            searchCategory === 'tracks'
              ? 'bg-white text-black shadow-md shadow-white/10 scale-105'
              : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
          }`}
        >
          Songs
        </button>

        <button
          type="button"
          onClick={() => setSearchCategory('playlists')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            searchCategory === 'playlists'
              ? 'bg-white text-black shadow-md shadow-white/10 scale-105'
              : 'bg-white/10 text-gray-300 hover:text-white hover:bg-white/15'
          }`}
        >
          Playlists
        </button>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="p-12 text-center text-gray-500 rounded-2xl bg-white/[0.02] border border-white/5 max-w-lg mx-auto mt-6">
          <Music size={40} className="mx-auto mb-3 opacity-40 text-purple-400" />
          <p className="text-base font-bold text-white">No results found</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Try adjusting your search query or switching sources in the search bar.
          </p>
        </div>
      )}

      {/* 2. FILTER: ALL */}
      {searchCategory === 'all' && !isEmpty && (
        <div className="space-y-8">
          {/* Section: Songs */}
          {results.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Songs</h3>
                {results.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setSearchCategory('tracks')}
                    className="text-xs font-bold text-gray-400 hover:text-white hover:underline transition-colors"
                  >
                    Show all ({results.length})
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {results.slice(0, 5).map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isTrackLiked(track.id);
                  const isSoundCloud = Boolean(
                    track.source === 'soundcloud' ||
                    track.id.startsWith('sc-') ||
                    track.id.startsWith('soundcloud-'),
                  );
                  const isSpotify = Boolean(
                    track.source === 'spotify' ||
                    track.id.startsWith('sp-') ||
                    track.id.startsWith('spotify-'),
                  );

                  return (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => handlePlayTrack(track, idx, results)}
                      onContextMenu={(e) => handleTrackContextMenu(e, track)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl border border-transparent transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-600/15 border-purple-500/20 text-purple-300'
                          : 'hover:bg-white/5 text-gray-300'
                      }`}
                    >
                      {/* Left: Play button, Cover Art, Title & Proper Subtitle */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track, idx, results);
                          }}
                          aria-label={isThisPlaying ? 'Pause' : 'Play'}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isThisPlaying
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 scale-105'
                              : 'bg-white/10 hover:bg-white/20 text-white group-hover:scale-105'
                          }`}
                        >
                          {isThisPlaying ? (
                            <Pause size={16} className="fill-white" />
                          ) : (
                            <Play size={16} className="fill-white ml-0.5" />
                          )}
                        </button>

                        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-black/40">
                          {track.albumArt ? (
                            <img
                              src={track.albumArt}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <Music size={18} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTrack(track.id);
                              }}
                              className={`text-sm font-bold truncate hover:underline cursor-pointer ${
                                isCurrent
                                  ? 'text-purple-400'
                                  : 'text-white group-hover:text-purple-300'
                              }`}
                            >
                              {track.title}
                            </p>
                            {source === 'all' &&
                              (isSoundCloud ? (
                                <span
                                  title="SoundCloud"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FF5500]/15 text-[#FF7733] border border-[#FF5500]/30 shrink-0"
                                >
                                  <SoundCloudBrandIcon
                                    size={12}
                                    className="shrink-0 inline-block align-middle"
                                  />
                                  <span className="leading-none">SoundCloud</span>
                                </span>
                              ) : isSpotify ? (
                                <span
                                  title="Spotify"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1DB954]/15 text-[#1ED760] border border-[#1DB954]/30 shrink-0"
                                >
                                  <SpotifyBrandIcon size={12} className="shrink-0" />
                                  <span className="leading-none">Spotify</span>
                                </span>
                              ) : null)}
                          </div>
                          {/* Label: Song • Artist */}
                          <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="text-gray-300 font-medium">Song</span>
                            <span className="text-gray-600">•</span>
                            <span className="truncate">{track.artist}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions & Duration */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLikeTrack(track);
                          }}
                          title={liked ? 'Remove from Liked' : 'Save to Liked'}
                          className={`p-1.5 rounded-lg transition-transform hover:scale-110 ${
                            liked ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Heart size={16} className={liked ? 'fill-purple-400' : ''} />
                        </button>

                        <button
                          type="button"
                          data-menu-trigger="true"
                          onClick={(e) => handleTrackThreeDots(e, track)}
                          title="More actions"
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        <span className="text-xs text-gray-400 font-mono w-12 text-right">
                          {formatDuration(track.durationMs)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Playlists */}
          {matchingPlaylists.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-white">Playlists</h3>
                {matchingPlaylists.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setSearchCategory('playlists')}
                    className="text-xs font-bold text-gray-400 hover:text-white hover:underline transition-colors"
                  >
                    Show all ({matchingPlaylists.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {matchingPlaylists.slice(0, 6).map((playlist) => (
                  <div
                    key={playlist.id}
                    onClick={() => handleOpenPlaylist(playlist.id)}
                    onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
                    className="group relative p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer border border-white/5 hover:border-white/10 flex flex-col"
                  >
                    {/* Cover Art with Hover Play Button */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-lg bg-[#121216] shrink-0">
                      {source === 'all' &&
                        (playlist.source === 'soundcloud' || playlist.id.startsWith('sc-pl-') ? (
                          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full backdrop-blur-md bg-black/80 border border-[#FF5500]/30 flex items-center gap-1.5 shadow-md pointer-events-none">
                            <SoundCloudBrandIcon
                              size={12}
                              className="shrink-0 inline-block align-middle"
                            />
                            <span className="text-[10px] font-bold text-[#FF7733] leading-none">
                              SoundCloud
                            </span>
                          </div>
                        ) : playlist.source === 'spotify' || playlist.id.startsWith('sp-pl-') ? (
                          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full backdrop-blur-md bg-black/80 border border-[#1DB954]/30 flex items-center gap-1.5 shadow-md pointer-events-none">
                            <SpotifyBrandIcon
                              size={12}
                              className="shrink-0 inline-block align-middle"
                            />
                            <span className="text-[10px] font-bold text-[#1ED760] leading-none">
                              Spotify
                            </span>
                          </div>
                        ) : null)}

                      {playlist.coverUrl ? (
                        <img
                          src={playlist.coverUrl}
                          alt={playlist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 bg-white/5">
                          <Music size={32} />
                        </div>
                      )}

                      {/* Hover Play Button (Point 2, Screenshot 4) */}
                      <button
                        type="button"
                        disabled={loadingPlaylistId === playlist.id}
                        onClick={(e) => handlePlayPlaylist(playlist, e)}
                        aria-label={`Play playlist "${playlist.title}"`}
                        className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] hover:from-[#9333EA] hover:to-[#6D28D9] text-white flex items-center justify-center shadow-xl shadow-purple-600/40 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-80"
                      >
                        {loadingPlaylistId === playlist.id ? (
                          <Loader2 size={18} className="animate-spin text-white" />
                        ) : (
                          <Play size={18} className="fill-white ml-0.5" />
                        )}
                      </button>
                    </div>

                    {/* Title with isolated navigation */}
                    <h4
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPlaylist(playlist.id);
                      }}
                      className="text-sm font-bold text-white truncate mt-3 hover:underline cursor-pointer group-hover:text-purple-300 transition-colors"
                    >
                      {playlist.title}
                    </h4>

                    {/* Label: Playlist • Creator */}
                    <p className="text-xs text-gray-400 mt-1 truncate">
                      Playlist •{' '}
                      <span className="text-gray-300 font-medium">{playlist.creator}</span>
                      {(playlist as any).trackCount ? (
                        <span className="text-gray-500 ml-1">({(playlist as any).trackCount})</span>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. FILTER: SONGS */}
      {searchCategory === 'tracks' && !isEmpty && (
        <div className="w-full">
          <table className="w-full table-fixed text-left border-collapse min-w-0">
            <colgroup>
              <col className="w-12" />
              <col className="w-auto" />
              {visibleColumns.album && <col className="w-[30%]" />}
              {visibleColumns.duration && <col className="w-28" />}
            </colgroup>

            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center">#</th>
                <th className="py-2.5 px-3">Title</th>
                {visibleColumns.album && <th className="py-2.5 px-3">Album</th>}
                {visibleColumns.duration && (
                  <th className="py-2.5 px-3 text-right" aria-label="Duration">
                    <div className="flex items-center justify-end gap-2 relative">
                      <Clock size={14} />

                      {/* Dropdown for Columns (Screenshot 3) with Toggle on Repeat Click */}
                      <button
                        ref={columnsBtnRef}
                        type="button"
                        onClick={() => setIsColumnsMenuOpen((prev) => !prev)}
                        aria-label="Configure columns"
                        className={`p-1 rounded hover:text-white hover:bg-white/10 transition-colors ${
                          isColumnsMenuOpen ? 'text-purple-400 bg-white/10' : 'text-gray-400'
                        }`}
                      >
                        <ChevronDown size={13} />
                      </button>

                      {/* Columns Checkbox Dropdown Menu (Screenshot 3) */}
                      {isColumnsMenuOpen && (
                        <div
                          ref={columnsMenuRef}
                          className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-[#1c1c24]/95 backdrop-blur-2xl border border-white/10 shadow-2xl p-2 text-white select-none animate-fadeIn text-left normal-case"
                        >
                          <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            Columns
                          </div>

                          {/* Album checkbox */}
                          <div
                            onClick={() => setVisibleColumns((v) => ({ ...v, album: !v.album }))}
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-medium text-gray-300"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-mono text-[10px]">::::</span>
                              <span>Album</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={visibleColumns.album}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-purple-600 bg-white/10 border-white/20 cursor-pointer"
                            />
                          </div>

                          {/* Duration checkbox */}
                          <div
                            onClick={() =>
                              setVisibleColumns((v) => ({ ...v, duration: !v.duration }))
                            }
                            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-xs font-medium text-gray-300"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-mono text-[10px]">::::</span>
                              <span>Duration</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={visibleColumns.duration}
                              onChange={() => {}}
                              className="w-4 h-4 rounded accent-purple-600 bg-white/10 border-white/20 cursor-pointer"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {results.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                const isThisPlaying = isCurrent && isPlaying;
                const liked = isTrackLiked(track.id);

                return (
                  <tr
                    key={`${track.id}-${idx}`}
                    onClick={() => handlePlayTrack(track, idx, results)}
                    onContextMenu={(e) => handleTrackContextMenu(e, track)}
                    className={`group border-b border-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer ${
                      isCurrent ? 'bg-purple-600/10' : ''
                    }`}
                  >
                    {/* # or Play button */}
                    <td className="text-center text-xs font-medium py-3 px-3 w-12">
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
                              className={isCurrent ? 'text-purple-400 font-bold' : 'text-gray-400'}
                            >
                              {idx + 1}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(track, idx, results);
                          }}
                          className="hidden group-hover:flex items-center justify-center text-white hover:text-purple-400 transition-colors"
                        >
                          {isThisPlaying ? (
                            <Pause size={15} className="fill-current" />
                          ) : (
                            <Play size={15} className="fill-current ml-0.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Track Title + Cover Art */}
                    <td className="min-w-0 py-3 px-3">
                      <div className="flex items-center gap-3 min-w-0">
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

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTrack(track.id);
                              }}
                              className={`text-sm font-medium truncate cursor-pointer hover:underline ${
                                isCurrent
                                  ? 'text-purple-400 font-bold'
                                  : 'text-white group-hover:text-purple-300 transition-colors'
                              }`}
                            >
                              {track.title}
                            </p>
                            {source === 'all' &&
                              (track.source === 'soundcloud' ||
                              track.id.startsWith('sc-') ||
                              track.id.startsWith('soundcloud-') ? (
                                <span
                                  title="SoundCloud"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FF5500]/15 text-[#FF7733] border border-[#FF5500]/30 shrink-0"
                                >
                                  <SoundCloudBrandIcon
                                    size={12}
                                    className="shrink-0 inline-block align-middle"
                                  />
                                  <span className="leading-none">SoundCloud</span>
                                </span>
                              ) : track.source === 'spotify' ||
                                track.id.startsWith('sp-') ||
                                track.id.startsWith('spotify-') ? (
                                <span
                                  title="Spotify"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#1DB954]/15 text-[#1ED760] border border-[#1DB954]/30 shrink-0"
                                >
                                  <SpotifyBrandIcon
                                    size={12}
                                    className="shrink-0 inline-block align-middle"
                                  />
                                  <span className="leading-none">Spotify</span>
                                </span>
                              ) : null)}
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
                        </div>
                      </div>
                    </td>

                    {/* Album Column */}
                    {visibleColumns.album && (
                      <td className="text-xs text-gray-400 min-w-0 py-3 px-3">
                        <span className="truncate block hover:underline cursor-pointer">
                          {track.album || track.title}
                        </span>
                      </td>
                    )}

                    {/* Actions & Duration */}
                    {visibleColumns.duration && (
                      <td className="text-right w-28 shrink-0 py-3 px-3">
                        <div className="flex items-center justify-end gap-2.5">
                          {/* Like button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLikeTrack(track);
                            }}
                            title={liked ? 'Remove from Liked' : 'Save to Liked'}
                            className={`p-1 rounded-full transition-all ${
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
                            title="More actions"
                            className="p-1 rounded-full text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <MoreHorizontal size={15} />
                          </button>

                          <span className="text-xs text-gray-400 font-mono w-10 text-right">
                            {formatDuration(track.durationMs)}
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Load More Tracks Button */}
          {hasMoreTracks && (
            <div className="flex justify-center mt-8 pb-4">
              <button
                type="button"
                disabled={isLoadingMoreTracks}
                onClick={handleLoadMoreTracks}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 border border-white/5"
              >
                {isLoadingMoreTracks ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-purple-400" />
                    <span>Loading more tracks...</span>
                  </>
                ) : (
                  <span>Load more tracks</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. FILTER: PLAYLISTS */}
      {searchCategory === 'playlists' && !isEmpty && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {matchingPlaylists.map((playlist) => (
            <div
              key={playlist.id}
              onClick={() => handleOpenPlaylist(playlist.id)}
              onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
              className="group relative p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] transition-all cursor-pointer border border-white/5 hover:border-white/10 flex flex-col"
            >
              {/* Cover Art with Hover Play Button (Point 2, Screenshot 4) */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-lg bg-[#121216] shrink-0">
                {source === 'all' &&
                  (playlist.source === 'soundcloud' || playlist.id.startsWith('sc-pl-') ? (
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full backdrop-blur-md bg-black/80 border border-[#FF5500]/30 flex items-center gap-1.5 shadow-md pointer-events-none">
                      <SoundCloudBrandIcon
                        size={12}
                        className="shrink-0 inline-block align-middle"
                      />
                      <span className="text-[10px] font-bold text-[#FF7733] leading-none">
                        SoundCloud
                      </span>
                    </div>
                  ) : playlist.source === 'spotify' || playlist.id.startsWith('sp-pl-') ? (
                    <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full backdrop-blur-md bg-black/80 border border-[#1DB954]/30 flex items-center gap-1.5 shadow-md pointer-events-none">
                      <SpotifyBrandIcon size={12} className="shrink-0 inline-block align-middle" />
                      <span className="text-[10px] font-bold text-[#1ED760] leading-none">
                        Spotify
                      </span>
                    </div>
                  ) : null)}

                {playlist.coverUrl ? (
                  <img
                    src={playlist.coverUrl}
                    alt={playlist.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 bg-white/5">
                    <Music size={32} />
                  </div>
                )}

                {/* Hover Play Button */}
                <button
                  type="button"
                  disabled={loadingPlaylistId === playlist.id}
                  onClick={(e) => handlePlayPlaylist(playlist, e)}
                  aria-label={`Play playlist "${playlist.title}"`}
                  className="absolute bottom-2.5 right-2.5 w-11 h-11 rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] hover:from-[#9333EA] hover:to-[#6D28D9] text-white flex items-center justify-center shadow-xl shadow-purple-600/40 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-80"
                >
                  {loadingPlaylistId === playlist.id ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <Play size={18} className="fill-white ml-0.5" />
                  )}
                </button>
              </div>

              {/* Title with isolated navigation */}
              <h4
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPlaylist(playlist.id);
                }}
                className="text-sm font-bold text-white truncate mt-3 hover:underline cursor-pointer group-hover:text-purple-300 transition-colors"
              >
                {playlist.title}
              </h4>

              {/* Subtitle: "By [Creator]" */}
              <p className="text-xs text-gray-400 mt-1 truncate">
                By <span className="text-gray-300 font-medium">{playlist.creator}</span>
                {(playlist as any).trackCount ? (
                  <span className="text-gray-500 ml-1">
                    ({(playlist as any).trackCount} tracks)
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Load More Playlists Button */}
      {searchCategory === 'playlists' && !isEmpty && hasMorePlaylists && (
        <div className="flex justify-center mt-8 pb-4">
          <button
            type="button"
            disabled={isLoadingMorePlaylists}
            onClick={handleLoadMorePlaylists}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 border border-white/5"
          >
            {isLoadingMorePlaylists ? (
              <>
                <Loader2 size={14} className="animate-spin text-purple-400" />
                <span>Loading more playlists...</span>
              </>
            ) : (
              <span>Load more playlists</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
