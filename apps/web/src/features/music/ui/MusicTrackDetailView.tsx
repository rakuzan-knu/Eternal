import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  MoreHorizontal,
  Music,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mic2,
  Loader2,
} from 'lucide-react';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicHubStore, CATALOG_PLAYLISTS } from '../model/useMusicHubStore';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { TrackActionMenu } from './TrackActionMenu';
import { isSoundCloudUrl } from '@/shared/lib/urlSecurity';

interface MusicTrackDetailViewProps {
  trackId: string;
}

export const MusicTrackDetailView: React.FC<MusicTrackDetailViewProps> = ({ trackId }) => {
  const navigate = useNavigate();
  const getTrackById = useMusicHubStore((s) => s.getTrackById);
  const cacheTrack = useMusicHubStore((s) => s.cacheTrack);
  const isTrackLiked = useMusicHubStore((s) => s.isTrackLiked);
  const toggleLikeTrack = useMusicHubStore((s) => s.toggleLikeTrack);

  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);

  const [track, setTrack] = useState<SpotifyTrack | null>(() => getTrackById(trackId) || null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(!track);

  // Lyrics state
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);

  // Recommendations state (5 tracks)
  const [recommendations, setRecommendations] = useState<SpotifyTrack[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);

  // Popular tracks by same artist
  const [authorTracks, setAuthorTracks] = useState<SpotifyTrack[]>([]);
  const [isAuthorTracksExpanded, setIsAuthorTracksExpanded] = useState(false);
  const [isLoadingAuthorTracks, setIsLoadingAuthorTracks] = useState(false);

  // Context Menu / 3-dots Menu state
  const [activeMenuState, setActiveMenuState] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
    triggerRef?: React.RefObject<HTMLElement | null>;
  } | null>(null);

  const heroThreeDotsBtnRef = useRef<HTMLButtonElement>(null);

  // 1. Resolve Track by ID
  useEffect(() => {
    let active = true;
    const local = getTrackById(trackId);
    if (local) {
      setTrack(local);
      setIsLoadingTrack(false);
      return;
    }

    // Try current player track
    const cur = useSpotifyPlayerStore.getState().currentTrack;
    if (cur && cur.id === trackId) {
      setTrack(cur);
      cacheTrack(cur);
      setIsLoadingTrack(false);
      return;
    }

    // Otherwise fetch via SoundCloud or Spotify
    setIsLoadingTrack(true);
    const fetchAsync = async () => {
      try {
        if (trackId.startsWith('sc-')) {
          const scNum = trackId.replace('sc-', '');
          const scTrack = await integrationsApi.getSoundCloudTrack(scNum);
          if (active && scTrack) {
            const fetchedTrack: SpotifyTrack = {
              id: trackId,
              title: scTrack.title,
              artist: scTrack.artist || 'Unknown',
              albumArt: scTrack.albumArt || '',
              durationMs: scTrack.durationMs || 180000,
              previewUrl: null,
              spotifyUrl: scTrack.spotifyUrl || `https://soundcloud.com`,
              source: 'soundcloud',
              streamUrl: scTrack.streamUrl || `/api/integrations/soundcloud/stream/${scNum}`,
              artistAvatar: scTrack.artistAvatar,
            };
            setTrack(fetchedTrack);
            cacheTrack(fetchedTrack);
          } else {
            // Fallback search
            const searchRes = await integrationsApi.searchSoundCloudCatalog(scNum, 1);
            if (active && Array.isArray(searchRes) && searchRes.length > 0) {
              const item = searchRes[0];
              const fetchedTrack: SpotifyTrack = {
                id: trackId,
                title: item.title,
                artist: item.artist || item.user?.username || 'Unknown',
                albumArt: item.albumArt || item.artwork_url || '',
                durationMs: item.durationMs || item.duration || 180000,
                previewUrl: null,
                spotifyUrl: item.permalink_url || `https://soundcloud.com`,
                source: 'soundcloud',
                streamUrl: `/api/integrations/soundcloud/stream/${scNum}`,
                artistAvatar: item.artistAvatar,
              };
              setTrack(fetchedTrack);
              cacheTrack(fetchedTrack);
            }
          }
        } else {
          // Spotify track fallback query
          const searchRes = await integrationsApi.searchSpotifyCatalog(trackId);
          if (active && Array.isArray(searchRes) && searchRes.length > 0) {
            const item = searchRes[0];
            const fetchedTrack: SpotifyTrack = {
              id: item.id || trackId,
              title: item.title || item.name,
              artist: item.artist,
              album: item.album?.name || item.album || item.title,
              albumArt: item.albumArt || item.album?.images?.[0]?.url || '',
              durationMs: item.durationMs || item.duration_ms || 180000,
              previewUrl: item.previewUrl || null,
              spotifyUrl: `https://open.spotify.com/track/${item.id || trackId}`,
              source: 'spotify',
            };
            setTrack(fetchedTrack);
            cacheTrack(fetchedTrack);
          }
        }
      } catch (err) {
        console.warn('TrackDetail: could not resolve track from network', err);
      } finally {
        if (active) setIsLoadingTrack(false);
      }
    };

    fetchAsync();

    return () => {
      active = false;
    };
  }, [trackId, getTrackById, cacheTrack]);

  // 2. Fetch Lyrics
  useEffect(() => {
    if (!track) return;
    let active = true;
    setIsLoadingLyrics(true);
    setLyricsLines([]);

    const fetchLyrics = async () => {
      try {
        const res = await integrationsApi.getSpotifyLyrics(
          track.title,
          track.artist,
          track.durationMs,
        );
        if (active && res && Array.isArray(res.lines) && res.lines.length > 0) {
          const lines = res.lines.map((l: any) =>
            typeof l === 'string' ? l : l.text || l.words || '',
          );
          setLyricsLines(lines.filter(Boolean));
        } else if (active) {
          setLyricsLines([]);
        }
      } catch {
        if (active) setLyricsLines([]);
      } finally {
        if (active) setIsLoadingLyrics(false);
      }
    };

    fetchLyrics();

    return () => {
      active = false;
    };
  }, [track]);

  // 3. Fetch Recommendations (5 real tracks)
  useEffect(() => {
    if (!track) return;
    let active = true;
    setIsLoadingRecs(true);

    const fetchRecs = async () => {
      try {
        const isTrackSoundCloud =
          track.source === 'soundcloud' ||
          Boolean(track.streamUrl) ||
          track.id.startsWith('sc-') ||
          track.id.startsWith('soundcloud-') ||
          isSoundCloudUrl(track.spotifyUrl);

        if (isTrackSoundCloud) {
          // Strict SoundCloud-only recommendations
          const cleanScId = track.id
            .replace(/^sc-/, '')
            .replace(/^soundcloud-/, '')
            .trim();
          let scTracks: any[] = [];
          try {
            const related = await integrationsApi.getSoundCloudRelated(
              cleanScId,
              [track.id, cleanScId],
              6,
            );
            if (Array.isArray(related) && related.length > 0) {
              scTracks = related;
            }
          } catch {
            // fallback to search
          }

          if (scTracks.length < 5) {
            const scQuery = `${track.artist} ${track.title}`.trim() || track.artist;
            if (scQuery) {
              try {
                const searchRes = await integrationsApi.searchSoundCloudCatalog(scQuery, 8);
                if (Array.isArray(searchRes) && searchRes.length > 0) {
                  scTracks = [...scTracks, ...searchRes];
                }
              } catch {}
            }
          }

          if (active && scTracks.length > 0) {
            const seen = new Set<string>([track.id, cleanScId, `sc-${cleanScId}`]);
            const mappedSc: SpotifyTrack[] = [];

            for (const s of scTracks) {
              if (!s || !s.title) continue;
              const rawId = String(s.id).replace(/^sc-/, '');
              const fullId = `sc-${rawId}`;
              if (
                seen.has(fullId) ||
                seen.has(rawId) ||
                s.title.toLowerCase() === track.title.toLowerCase()
              )
                continue;
              seen.add(fullId);
              seen.add(rawId);

              mappedSc.push({
                id: fullId,
                title: s.title,
                artist: s.artist || s.user?.username || track.artist,
                album: s.album || s.title,
                albumArt: s.albumArt || s.artwork_url || track.albumArt || '',
                durationMs: s.durationMs || s.duration || 180000,
                previewUrl: null,
                spotifyUrl: s.permalink_url || s.spotifyUrl || 'https://soundcloud.com',
                source: 'soundcloud',
                streamUrl: s.streamUrl || `/api/integrations/soundcloud/stream/${rawId}`,
              });

              if (mappedSc.length >= 5) break;
            }

            if (mappedSc.length > 0) {
              setRecommendations(mappedSc);
              setIsLoadingRecs(false);
              return;
            }
          }
        } else {
          // Spotify track: dual queue from backend getSpotifyQueue (high precision Spotify + SoundCloud)
          const res = await integrationsApi.getSpotifyQueue(track.id, track.artist, track.title, 0);

          if (active && res && Array.isArray(res.tracks) && res.tracks.length > 0) {
            const seenRecIds = new Set<string>([track.id]);
            const mapped: SpotifyTrack[] = [];
            for (const t of res.tracks) {
              if (!t || !t.title || !t.id || seenRecIds.has(t.id)) continue;
              seenRecIds.add(t.id);
              const isSc = t.source === 'soundcloud' || t.id.startsWith('sc-');
              mapped.push({
                id: t.id,
                title: t.title,
                artist: t.artist,
                album: t.album || t.title,
                albumArt:
                  t.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
                durationMs: t.durationMs || 180000,
                previewUrl: isSc ? null : t.previewUrl || null,
                spotifyUrl:
                  t.spotifyUrl ||
                  (isSc ? 'https://soundcloud.com' : `https://open.spotify.com/track/${t.id}`),
                source: (isSc ? 'soundcloud' : 'spotify') as 'spotify' | 'soundcloud',
                streamUrl: (t as any).streamUrl,
              });
              if (mapped.length >= 5) break;
            }

            if (mapped.length > 0) {
              setRecommendations(mapped);
              setIsLoadingRecs(false);
              return;
            }
          }
        }

        // Final fallback: related catalog tracks matching track source
        const seenCatIds = new Set<string>([track.id]);
        const catalogMatches = (CATALOG_PLAYLISTS || [])
          .flatMap((p) => p.tracks)
          .filter((t) => {
            if (!t || !t.id || seenCatIds.has(t.id)) return false;
            seenCatIds.add(t.id);
            if (isTrackSoundCloud) {
              return t.source === 'soundcloud' || Boolean(t.streamUrl) || t.id.startsWith('sc-');
            }
            return true;
          })
          .slice(0, 5);
        if (active) setRecommendations(catalogMatches);
      } catch (err) {
        console.warn('TrackDetail: could not fetch recommendations', err);
        const seenCatIds = new Set<string>([track.id]);
        const catalogMatches = (CATALOG_PLAYLISTS || [])
          .flatMap((p) => p.tracks)
          .filter((t) => {
            if (!t || !t.id || seenCatIds.has(t.id)) return false;
            seenCatIds.add(t.id);
            return true;
          })
          .slice(0, 5);
        if (active) setRecommendations(catalogMatches);
      } finally {
        if (active) setIsLoadingRecs(false);
      }
    };

    fetchRecs();

    return () => {
      active = false;
    };
  }, [track]);

  // 4. Fetch Popular Tracks by same Artist
  useEffect(() => {
    if (!track) return;
    let active = true;
    setIsLoadingAuthorTracks(true);

    const fetchAuthorTracks = async () => {
      try {
        const query = track.artist;
        const scRes = await integrationsApi.searchSoundCloudCatalog(query, 10);
        if (active && Array.isArray(scRes) && scRes.length > 0) {
          const seenAuthorIds = new Set<string>();
          const mapped: SpotifyTrack[] = [];
          for (const item of scRes) {
            const rawId = item?.id ? String(item.id).replace(/^sc-/, '') : '';
            const fullId = `sc-${rawId}`;
            if (!rawId || seenAuthorIds.has(fullId) || seenAuthorIds.has(rawId)) continue;
            seenAuthorIds.add(fullId);
            seenAuthorIds.add(rawId);
            mapped.push({
              id: fullId,
              title: item.title,
              artist: item.artist || item.user?.username || track.artist,
              album: item.album || item.title,
              albumArt: item.albumArt || item.artwork_url || '',
              durationMs: item.durationMs || item.duration || 180000,
              previewUrl: null,
              spotifyUrl: item.permalink_url || 'https://soundcloud.com',
              source: 'soundcloud' as const,
              streamUrl: item.streamUrl || `/api/integrations/soundcloud/stream/${rawId}`,
            });
            if (mapped.length >= 10) break;
          }

          if (mapped.length > 0) {
            setAuthorTracks(mapped);
            setIsLoadingAuthorTracks(false);
            return;
          }
        }

        // Fallback: match from local catalog
        const seenAuthorMatches = new Set<string>();
        const matches = (CATALOG_PLAYLISTS || [])
          .flatMap((p) => p.tracks)
          .filter((t) => {
            if (!t || !t.id || seenAuthorMatches.has(t.id)) return false;
            seenAuthorMatches.add(t.id);
            return t.artist.toLowerCase() === track.artist.toLowerCase();
          });
        if (active) {
          setAuthorTracks(matches.length > 0 ? matches : [track]);
        }
      } catch {
        if (active) setAuthorTracks([track]);
      } finally {
        if (active) setIsLoadingAuthorTracks(false);
      }
    };

    fetchAuthorTracks();

    return () => {
      active = false;
    };
  }, [track]);

  // Estimated plays based on duration or id hash (MUST be declared before early returns)
  const pseudoPlays = useMemo(() => {
    if (!track?.id) return '0';
    let hash = 0;
    for (let i = 0; i < track.id.length; i++) {
      hash = (hash << 5) - hash + track.id.charCodeAt(i);
      hash |= 0;
    }
    const num = (Math.abs(hash) % 80000000) + 1200000;
    return num.toLocaleString('ru-RU');
  }, [track?.id]);

  const releaseYear = useMemo(() => {
    if (track?.releaseDate) return track.releaseDate.slice(0, 4);
    return '2024';
  }, [track?.releaseDate]);

  if (isLoadingTrack) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <Loader2 size={32} className="animate-spin text-purple-500" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <Music size={48} className="text-gray-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Track Not Found</h3>
        <p className="text-sm text-gray-400 mb-6">
          This track may have been moved or removed from the catalog.
        </p>
        <button
          type="button"
          onClick={() => navigate('/music')}
          className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const isCurrentPlaying = currentTrack?.id === track.id && isPlaying;
  const isLiked = isTrackLiked(track.id);

  const formatDuration = (ms?: number) => {
    if (!ms) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleHeroPlayToggle = () => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, recommendations.length > 0 ? recommendations : undefined, track.title);
    }
  };

  const handleOpenContextMenu = (e: React.MouseEvent, targetTrack: SpotifyTrack) => {
    e.preventDefault();
    e.stopPropagation();

    if (activeMenuState?.track.id === targetTrack.id) {
      setActiveMenuState(null);
    } else {
      setActiveMenuState({
        track: targetTrack,
        rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
      });
    }
  };

  const handleOpenThreeDots = (
    e: React.MouseEvent,
    targetTrack: SpotifyTrack,
    ref?: React.RefObject<HTMLElement | null>,
  ) => {
    e.stopPropagation();
    if (activeMenuState?.track.id === targetTrack.id) {
      setActiveMenuState(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveMenuState({
      track: targetTrack,
      rect,
      triggerRef: ref,
    });
  };

  const handleNavigateToTrack = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigate(`/music/track/${id}`);
  };

  const isSoundCloud =
    track.source === 'soundcloud' || Boolean(track.streamUrl) || isSoundCloudUrl(track.spotifyUrl);

  const artistProfileUrl = isSoundCloud
    ? `https://soundcloud.com/search/people?q=${encodeURIComponent(track.artist)}`
    : `https://open.spotify.com/search/${encodeURIComponent(track.artist)}`;

  const visibleAuthorTracks = isAuthorTracksExpanded ? authorTracks : authorTracks.slice(0, 5);

  return (
    <div
      onContextMenu={(e) => handleOpenContextMenu(e, track)}
      className="flex-1 overflow-y-auto min-w-0 select-none pb-28 text-white relative"
    >
      {/* Ambient Hero Gradient */}
      <div className="relative p-6 md:p-8 bg-gradient-to-b from-purple-950/60 via-purple-900/20 to-transparent border-b border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8">
          {/* Cover Art (Screenshot 3) */}
          <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 bg-black/40 group">
            {track.albumArt ? (
              <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Music size={56} />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Track Header Meta */}
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300/90 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              Song
            </span>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mt-2.5 mb-3 line-clamp-2">
              {track.title}
            </h1>

            {/* Subtitle metadata row */}
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-gray-300 font-medium">
              {/* Artist Avatar & Name */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(artistProfileUrl, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-2 cursor-pointer hover:text-white group/artist"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-purple-500/20 border border-white/10 shrink-0">
                  {track.artistAvatar || track.albumArt ? (
                    <img
                      src={track.artistAvatar || track.albumArt}
                      alt={track.artist}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                      {track.artist.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="font-bold text-white group-hover/artist:underline">
                  {track.artist}
                </span>
              </div>

              <span className="text-gray-500">•</span>
              <span className="text-gray-300 truncate max-w-xs">{track.album || track.title}</span>

              <span className="text-gray-500">•</span>
              <span>{releaseYear}</span>

              <span className="text-gray-500">•</span>
              <span>{formatDuration(track.durationMs)}</span>

              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{pseudoPlays} plays</span>
            </div>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="max-w-6xl mx-auto flex items-center gap-4 mt-6">
          {/* Big Circular Play/Pause Button */}
          <button
            type="button"
            onClick={handleHeroPlayToggle}
            aria-label={isCurrentPlaying ? 'Pause' : 'Play'}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white flex items-center justify-center shadow-[0_8px_24px_rgba(139,92,246,0.4)] hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {isCurrentPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>

          {/* Like / Save Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleLikeTrack(track);
            }}
            aria-label={isLiked ? 'Remove from Liked' : 'Add to Liked'}
            title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isLiked
                ? 'text-purple-400 bg-purple-500/20 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Heart size={20} className={isLiked ? 'fill-purple-400' : ''} />
          </button>

          {/* 3 Dots Menu Button */}
          <button
            ref={heroThreeDotsBtnRef}
            type="button"
            data-menu-trigger="true"
            onClick={(e) => handleOpenThreeDots(e, track, heroThreeDotsBtnRef)}
            aria-label={`More actions for ${track.title}`}
            title={`More actions for ${track.title}`}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 space-y-12">
        {/* SECTION 1: LYRICS */}
        <div>
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            <span>Lyrics</span>
          </h2>

          <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 md:p-8 relative">
            {isLoadingLyrics ? (
              <div className="py-8 flex items-center justify-center text-purple-400 gap-2 text-xs">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading lyrics...</span>
              </div>
            ) : lyricsLines.length === 0 ? (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-purple-400 mb-3">
                  <Mic2 size={22} />
                </div>
                <p className="text-sm font-semibold text-white mb-1">
                  Lyrics are not available for this track yet
                </p>
                <p className="text-xs text-gray-400 max-w-sm">
                  Lyrics are automatically synchronized for verified catalog entries.
                </p>
              </div>
            ) : (
              <div>
                <div className="space-y-3 font-semibold text-sm md:text-base text-gray-300 leading-relaxed">
                  {(isLyricsExpanded ? lyricsLines : lyricsLines.slice(0, 6)).map((line, idx) => (
                    <p
                      key={idx}
                      className="hover:text-white transition-colors cursor-default select-text"
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {lyricsLines.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setIsLyricsExpanded((prev) => !prev)}
                    className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    <span>{isLyricsExpanded ? 'Show less' : '...More'}</span>
                    {isLyricsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: ARTIST */}
        <div>
          <div
            onClick={() => window.open(artistProfileUrl, '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-5 p-4 rounded-3xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all cursor-pointer group max-w-xl"
          >
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-black/40 border border-white/10 shadow-lg shrink-0">
              {track.albumArt ? (
                <img
                  src={track.albumArt}
                  alt={track.artist}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold">
                  {track.artist.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Artist
              </span>
              <h3 className="text-xl font-bold text-white truncate mt-0.5 group-hover:underline">
                {track.artist}
              </h3>
            </div>

            <div className="w-9 h-9 rounded-full bg-white/5 group-hover:bg-white/15 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
              <ExternalLink size={16} />
            </div>
          </div>
        </div>

        {/* SECTION 3: RECOMMENDATIONS */}
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Recommended</h2>
          <p className="text-xs text-gray-400 mb-4">Based on this song</p>

          <div className="space-y-1">
            {isLoadingRecs ? (
              <div className="py-6 flex items-center justify-center text-xs text-gray-500 gap-2">
                <Loader2 size={16} className="animate-spin text-purple-400" />
                <span>Finding recommendations...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-xs text-gray-500 py-4">No recommendations available</div>
            ) : (
              recommendations.map((rec, idx) => {
                const isRecPlaying = isPlaying && currentTrack?.id === rec.id;
                const recLiked = isTrackLiked(rec.id);

                return (
                  <div
                    key={`rec-${rec.id}-${idx}`}
                    onClick={() => playTrack(rec, recommendations, `Recommended: ${track.title}`)}
                    onContextMenu={(e) => handleOpenContextMenu(e, rec)}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.06] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Cover with Play Overlay */}
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                        {rec.albumArt ? (
                          <img
                            src={rec.albumArt}
                            alt={rec.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Music size={16} />
                          </div>
                        )}
                        <div
                          className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white transition-opacity ${
                            isRecPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {isRecPlaying ? (
                            <Pause size={16} />
                          ) : (
                            <Play size={16} className="ml-0.5" />
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Title with isolated hover:underline navigation */}
                        <p
                          onClick={(e) => handleNavigateToTrack(e, rec.id)}
                          className={`text-sm font-bold truncate hover:underline cursor-pointer ${
                            isRecPlaying ? 'text-purple-400' : 'text-white'
                          }`}
                        >
                          {rec.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{rec.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      <span className="hidden sm:inline-block text-gray-500 font-mono">
                        {formatDuration(rec.durationMs)}
                      </span>

                      {/* Like button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeTrack(rec);
                        }}
                        className={`p-1 rounded-lg transition-transform hover:scale-110 ${
                          recLiked
                            ? 'text-purple-400'
                            : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Heart size={16} className={recLiked ? 'fill-purple-400' : ''} />
                      </button>

                      {/* 3 Dots button */}
                      <button
                        type="button"
                        data-menu-trigger="true"
                        onClick={(e) => handleOpenThreeDots(e, rec)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-white hover:bg-white/10 transition-opacity"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SECTION 4: MORE BY ARTIST */}
        <div>
          <div className="mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Popular tracks:
            </span>
            <h2 className="text-2xl font-black text-white mt-0.5">{track.artist}</h2>
          </div>

          <div className="space-y-1">
            {isLoadingAuthorTracks ? (
              <div className="py-6 flex items-center justify-center text-xs text-gray-500 gap-2">
                <Loader2 size={16} className="animate-spin text-purple-400" />
                <span>Loading artist tracks...</span>
              </div>
            ) : authorTracks.length === 0 ? (
              <div className="text-xs text-gray-500 py-4">No other tracks found yet</div>
            ) : (
              visibleAuthorTracks.map((item, idx) => {
                const isItemPlaying = isPlaying && currentTrack?.id === item.id;
                const itemLiked = isTrackLiked(item.id);

                return (
                  <div
                    key={`author-${item.id}-${idx}`}
                    onClick={() => playTrack(item, authorTracks, `Artist: ${track.artist}`)}
                    onContextMenu={(e) => handleOpenContextMenu(e, item)}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/[0.06] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Rank / Play icon */}
                      <div className="w-6 text-center font-mono text-xs text-gray-500 group-hover:hidden">
                        {isItemPlaying ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse mx-auto" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="w-6 hidden group-hover:flex items-center justify-center text-white">
                        {isItemPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </div>

                      {/* Cover */}
                      <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                        {item.albumArt ? (
                          <img
                            src={item.albumArt}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Music size={14} />
                          </div>
                        )}
                      </div>

                      {/* Title with isolated hover:underline navigation */}
                      <div className="min-w-0 flex-1">
                        <p
                          onClick={(e) => handleNavigateToTrack(e, item.id)}
                          className={`text-sm font-bold truncate hover:underline cursor-pointer ${
                            isItemPlaying ? 'text-purple-400' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{item.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                      <span className="hidden sm:inline-block text-gray-500 font-mono">
                        {formatDuration(item.durationMs)}
                      </span>

                      {/* Like button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLikeTrack(item);
                        }}
                        className={`p-1 rounded-lg transition-transform hover:scale-110 ${
                          itemLiked
                            ? 'text-purple-400'
                            : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Heart size={16} className={itemLiked ? 'fill-purple-400' : ''} />
                      </button>

                      {/* 3 Dots button */}
                      <button
                        type="button"
                        data-menu-trigger="true"
                        onClick={(e) => handleOpenThreeDots(e, item)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-white hover:bg-white/10 transition-opacity"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {authorTracks.length > 5 && (
            <button
              type="button"
              onClick={() => setIsAuthorTracksExpanded((prev) => !prev)}
              className="mt-4 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 hover:text-white transition-colors"
            >
              {isAuthorTracksExpanded ? 'Show less' : 'More'}
            </button>
          )}
        </div>
      </div>

      {/* Track Action Menu */}
      {activeMenuState && (
        <TrackActionMenu
          isOpen={Boolean(activeMenuState)}
          onClose={() => setActiveMenuState(null)}
          anchorRect={activeMenuState.rect}
          track={activeMenuState.track}
          triggerRef={activeMenuState.triggerRef}
        />
      )}
    </div>
  );
};
