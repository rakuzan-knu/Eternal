import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, Volume2, Music2, Sparkles, Flame, Mic2 } from 'lucide-react';
import {
  useMusicHubStore,
  STARTER_RECOMMENDED_TRACKS,
  detectGenre,
} from '../model/useMusicHubStore';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { PlaylistActionMenu } from './PlaylistActionMenu';
import { TrackActionMenu } from './TrackActionMenu';
import type { MusicPlaylist, MusicRecentlyPlayedItem } from '../model/types';

interface TopGridItem {
  id: string;
  type: 'track' | 'playlist' | 'liked-songs';
  title: string;
  subtitle?: string;
  coverUrl?: string;
  isPlaying?: boolean;
  track?: SpotifyTrack;
  playlist?: MusicPlaylist;
}

export const MusicHomeOverview: React.FC = () => {
  const navigate = useNavigate();
  const {
    likedTracks,
    playlists,
    catalogPlaylists,
    recentlyPlayed,
    lastActiveGenre,
    lastActiveSeed,
    homeCategory,
    setHomeCategory,
    setSelectedPlaylistId,
  } = useMusicHubStore();

  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const { dockOffset } = useSpotifyDockOffset(24);

  // Dynamic recommendations based on user's last listened track/genre
  const [recommendedTracks, setRecommendedTracks] = useState<SpotifyTrack[]>(
    STARTER_RECOMMENDED_TRACKS,
  );
  const [_isLoadingRecs, setIsLoadingRecs] = useState(false);
  const recsCacheRef = useRef<Record<string, SpotifyTrack[]>>({});

  // Context menus state
  const [activePlaylistMenu, setActivePlaylistMenu] = useState<{
    playlist: MusicPlaylist;
    rect: DOMRect;
  } | null>(null);

  const [activeTrackMenu, setActiveTrackMenu] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
  } | null>(null);

  // 1. Fetch adaptive recommendations when seed or genre changes
  useEffect(() => {
    const seed = lastActiveGenre || lastActiveSeed;
    if (!seed) {
      setRecommendedTracks(STARTER_RECOMMENDED_TRACKS);
      return;
    }

    if (recsCacheRef.current[seed]) {
      setRecommendedTracks(recsCacheRef.current[seed]);
      return;
    }

    let active = true;
    setIsLoadingRecs(true);

    const query = seed.toLowerCase().includes('rock') ? 'Rock Classics' : seed;

    integrationsApi
      .searchSoundCloudCatalog(query, 8)
      .then((tracks) => {
        if (active && Array.isArray(tracks) && tracks.length > 0) {
          const mapped: SpotifyTrack[] = tracks.map((t: any) => ({
            id: t.id,
            title: t.title,
            artist: t.artist || t.user?.username || 'SoundCloud Artist',
            albumArt: t.albumArt || t.artwork_url || '',
            durationMs: t.durationMs || t.duration || 180000,
            previewUrl: null,
            spotifyUrl: t.spotifyUrl || t.permalink_url || `https://soundcloud.com`,
            source: 'soundcloud',
            streamUrl:
              t.streamUrl ||
              `/api/integrations/soundcloud/stream/${t.rawId || t.id.replace('sc-', '')}`,
            artistAvatar: t.artistAvatar || t.user?.avatar_url,
            releaseDate: t.releaseDate || '2024',
          }));
          recsCacheRef.current[seed] = mapped;
          setRecommendedTracks(mapped);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingRecs(false);
      });

    return () => {
      active = false;
    };
  }, [lastActiveGenre, lastActiveSeed]);

  // Liked songs playlist representation
  const _likedSongsPlaylist: MusicPlaylist = useMemo(
    () => ({
      id: 'liked-songs',
      title: 'Liked Songs',
      description: 'Your personal collection of tracks',
      coverUrl: '',
      tracks: likedTracks,
      creator: 'You',
      createdAt: '',
    }),
    [likedTracks],
  );

  const isLikedSongsPlaying = Boolean(
    isPlaying && currentTrack && likedTracks.some((t) => t.id === currentTrack.id),
  );

  // 2. Build Dynamic Top 6 Quick-Access Grid (2 rows × 3 cols)
  const topGridItems = useMemo<TopGridItem[]>(() => {
    const items: TopGridItem[] = [];
    const seenIds = new Set<string>();

    // Slot 0: If music is playing, slot 0 MUST feature the currently active item
    if (isPlaying && currentTrack) {
      // Check if currentTrack belongs to any playlist
      const parentPlaylist =
        playlists.find((p) => p.tracks.some((t) => t.id === currentTrack.id)) ||
        catalogPlaylists.find((p) => p.tracks.some((t) => t.id === currentTrack.id));

      if (parentPlaylist) {
        items.push({
          id: parentPlaylist.id,
          type: 'playlist',
          title: parentPlaylist.title,
          coverUrl: parentPlaylist.coverUrl,
          isPlaying: true,
          playlist: parentPlaylist,
        });
        seenIds.add(parentPlaylist.id);
      } else {
        items.push({
          id: currentTrack.id,
          type: 'track',
          title: currentTrack.title,
          subtitle: currentTrack.artist,
          coverUrl: currentTrack.albumArt,
          isPlaying: true,
          track: currentTrack,
        });
        seenIds.add(currentTrack.id);
      }
    }

    // Liked songs if user has liked tracks and not already added
    if (likedTracks.length > 0 && !seenIds.has('liked-songs') && items.length < 6) {
      items.push({
        id: 'liked-songs',
        type: 'liked-songs',
        title: 'Liked Songs',
        coverUrl: '',
        isPlaying: isLikedSongsPlaying,
      });
      seenIds.add('liked-songs');
    }

    // Add user's recently played items
    for (const rec of recentlyPlayed) {
      if (items.length >= 6) break;
      if (!seenIds.has(rec.id)) {
        if (rec.type === 'playlist') {
          const pl =
            playlists.find((p) => p.id === rec.id) || catalogPlaylists.find((p) => p.id === rec.id);
          items.push({
            id: rec.id,
            type: 'playlist',
            title: rec.title,
            coverUrl: rec.coverUrl || pl?.coverUrl,
            isPlaying:
              isPlaying &&
              Boolean(currentTrack && pl?.tracks.some((t) => t.id === currentTrack.id)),
            playlist: pl,
          });
        } else {
          items.push({
            id: rec.id,
            type: 'track',
            title: rec.title,
            subtitle: rec.artist,
            coverUrl: rec.coverUrl,
            isPlaying: isPlaying && currentTrack?.id === rec.id,
            track: rec.track,
          });
        }
        seenIds.add(rec.id);
      }
    }

    // Add user's custom / saved playlists
    for (const pl of playlists) {
      if (items.length >= 6) break;
      if (!seenIds.has(pl.id)) {
        items.push({
          id: pl.id,
          type: 'playlist',
          title: pl.title,
          coverUrl: pl.coverUrl,
          isPlaying:
            isPlaying && Boolean(currentTrack && pl.tracks.some((t) => t.id === currentTrack.id)),
          playlist: pl,
        });
        seenIds.add(pl.id);
      }
    }

    // Fallback fill to 6 from catalog playlists
    for (const pl of catalogPlaylists) {
      if (items.length >= 6) break;
      if (!seenIds.has(pl.id)) {
        items.push({
          id: pl.id,
          type: 'playlist',
          title: pl.title,
          coverUrl: pl.coverUrl,
          isPlaying:
            isPlaying && Boolean(currentTrack && pl.tracks.some((t) => t.id === currentTrack.id)),
          playlist: pl,
        });
        seenIds.add(pl.id);
      }
    }

    return items;
  }, [
    isPlaying,
    currentTrack,
    likedTracks,
    isLikedSongsPlaying,
    recentlyPlayed,
    playlists,
    catalogPlaylists,
  ]);

  // 3. Build Recently Played items for Section 1 (strictly tracks/playlists played by the user)
  const recentItems = useMemo<MusicRecentlyPlayedItem[]>(() => {
    return recentlyPlayed;
  }, [recentlyPlayed]);

  // Navigation handlers
  const handleOpenPlaylist = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    navigate(`/music/playlist/${playlistId}`);
  };

  const handleOpenTrack = (trackId: string) => {
    navigate(`/music/track/${trackId}`);
  };

  const handlePlayTopItem = (e: React.MouseEvent, item: TopGridItem) => {
    e.stopPropagation();

    if (item.type === 'liked-songs') {
      if (likedTracks.length === 0) {
        handleOpenPlaylist('liked-songs');
        return;
      }
      if (isLikedSongsPlaying) {
        togglePlay();
      } else {
        playTrack(likedTracks[0], likedTracks.slice(1), 'Liked Songs');
      }
      return;
    }

    if (item.type === 'playlist' && item.playlist) {
      const pl = item.playlist;
      if (pl.tracks.length === 0) return;
      const isThisPlaying =
        isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);
      if (isThisPlaying) {
        togglePlay();
      } else {
        playTrack(pl.tracks[0], pl.tracks.slice(1), pl.title);
        useMusicHubStore.getState().recordRecentlyPlayed({
          id: pl.id,
          type: 'playlist',
          title: pl.title,
          subtitle: pl.creator ? `Playlist • ${pl.creator}` : 'Playlist',
          coverUrl: pl.coverUrl,
          tracksCount: pl.tracks.length,
          playlistId: pl.id,
          genre: pl.title,
        });
      }
      return;
    }

    if (item.type === 'track' && item.track) {
      if (currentTrack?.id === item.track.id) {
        togglePlay();
      } else {
        playTrack(item.track, undefined, item.track.title);
        useMusicHubStore.getState().recordRecentlyPlayed({
          id: item.track.id,
          type: 'track',
          title: item.track.title,
          artist: item.track.artist,
          coverUrl: item.track.albumArt,
          genre: detectGenre(item.track),
          track: item.track,
        });
      }
    }
  };

  const handlePlayPlaylistCard = (e: React.MouseEvent, pl: MusicPlaylist) => {
    e.stopPropagation();
    if (pl.tracks.length === 0) return;
    const isThisPlaying =
      isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);
    if (isThisPlaying) {
      togglePlay();
    } else {
      playTrack(pl.tracks[0], pl.tracks.slice(1), pl.title);
      useMusicHubStore.getState().recordRecentlyPlayed({
        id: pl.id,
        type: 'playlist',
        title: pl.title,
        subtitle: pl.creator ? `Playlist • ${pl.creator}` : 'Playlist',
        coverUrl: pl.coverUrl,
        tracksCount: pl.tracks.length,
        playlistId: pl.id,
        genre: pl.title,
      });
    }
  };

  const handlePlayTrackCard = (
    e: React.MouseEvent,
    track: SpotifyTrack,
    queueList: SpotifyTrack[],
  ) => {
    e.stopPropagation();
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const q = queueList.filter((t) => t.id !== track.id);
      playTrack(track, q, track.title);
      useMusicHubStore.getState().recordRecentlyPlayed({
        id: track.id,
        type: 'track',
        title: track.title,
        artist: track.artist,
        coverUrl: track.albumArt,
        genre: detectGenre(track),
        track,
      });
    }
  };

  const handlePlaylistContextMenu = (e: React.MouseEvent, pl: MusicPlaylist) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTrackMenu(null);
    if (activePlaylistMenu?.playlist.id === pl.id) {
      setActivePlaylistMenu(null);
    } else {
      setActivePlaylistMenu({
        playlist: pl,
        rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
      });
    }
  };

  const handleTrackContextMenu = (e: React.MouseEvent, tr: SpotifyTrack) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePlaylistMenu(null);
    if (activeTrackMenu?.track.id === tr.id) {
      setActiveTrackMenu(null);
    } else {
      setActiveTrackMenu({
        track: tr,
        rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
      });
    }
  };

  // Adaptive supertitle
  const recsSupertitle = useMemo(() => {
    if (lastActiveGenre) {
      return `Based on recent activity: ${lastActiveGenre}`;
    }
    if (lastActiveSeed) {
      return `Based on recent activity: ${lastActiveSeed}`;
    }
    return 'Based on your preferences';
  }, [lastActiveGenre, lastActiveSeed]);

  return (
    <div
      style={{ paddingBottom: `${dockOffset + 48}px` }}
      className="p-6 overflow-y-auto custom-scrollbar select-none min-h-full"
    >
      {/* Category Pills: All / Music / Podcasts */}
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setHomeCategory('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            homeCategory === 'all'
              ? 'bg-white text-black shadow-md shadow-white/10'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setHomeCategory('music')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            homeCategory === 'music'
              ? 'bg-white text-black shadow-md shadow-white/10'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          Music
        </button>
        <button
          type="button"
          onClick={() => setHomeCategory('podcasts')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            homeCategory === 'podcasts'
              ? 'bg-white text-black shadow-md shadow-white/10'
              : 'bg-white/5 hover:bg-white/10 text-gray-300'
          }`}
        >
          Podcasts
        </button>
      </div>

      {/* When Podcasts category selected */}
      {homeCategory === 'podcasts' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
            <Mic2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Podcasts Coming Soon</h2>
          <p className="text-sm text-gray-400 max-w-sm">
            We're adding support for podcasts and audio shows. Return to the music section to listen
            to your favorite tracks.
          </p>
          <button
            type="button"
            onClick={() => setHomeCategory('music')}
            className="mt-6 px-5 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30"
          >
            Listen to Music
          </button>
        </div>
      )}

      {/* Main Music View */}
      {homeCategory !== 'podcasts' && (
        <div>
          {/* Top 6-Item Quick Access Grid (Screenshot 1 & 2: 2 rows × 3 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-9">
            {topGridItems.map((item, idx) => {
              const isFirstPlayingSlot = idx === 0 && isPlaying && item.isPlaying;

              return (
                <div
                  key={`top-${item.id}-${idx}`}
                  onClick={() => {
                    if (item.type === 'playlist') handleOpenPlaylist(item.id);
                    else if (item.type === 'liked-songs') handleOpenPlaylist('liked-songs');
                    else handleOpenTrack(item.id);
                  }}
                  onContextMenu={(e) => {
                    if (item.playlist) handlePlaylistContextMenu(e, item.playlist);
                    else if (item.track) handleTrackContextMenu(e, item.track);
                  }}
                  className={`group relative flex items-center justify-between rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl backdrop-blur-xl ${
                    isFirstPlayingSlot
                      ? 'bg-purple-950/40 border-purple-500/30 hover:bg-purple-900/40 hover:border-purple-500/50 shadow-lg shadow-purple-950/40'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    {/* Artwork */}
                    <div className="w-16 h-16 shrink-0 bg-black/40 overflow-hidden border-r border-white/5 flex items-center justify-center">
                      {item.type === 'liked-songs' ? (
                        <div className="w-full h-full bg-gradient-to-br from-[#450af5] to-[#8e8ee5] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <Heart size={24} className="text-white fill-white" />
                        </div>
                      ) : item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-purple-950/80 flex items-center justify-center">
                          <Music2 size={22} className="text-white/40" />
                        </div>
                      )}
                    </div>

                    {/* Title & Subtitle */}
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-white group-hover:text-purple-300 group-hover:underline transition-colors line-clamp-2 leading-tight">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {/* Right side: Animated Equalizer if Playing & Floating Play Button */}
                  <div className="pr-3 flex items-center gap-2 shrink-0">
                    {item.isPlaying && (
                      <Volume2 size={18} className="text-purple-400 animate-pulse shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => handlePlayTopItem(e, item)}
                      aria-label={`Play ${item.title}`}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/35 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                      {item.isPlaying ? (
                        <Pause size={18} className="fill-white" />
                      ) : (
                        <Play size={18} className="fill-white ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 1: "Recently Played" */}
          {recentItems.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Recently Played</h2>
                <button
                  type="button"
                  onClick={() => navigate('/music/section/0JQ5DAnM3wGh0gz1MXnukz')}
                  className="text-xs font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Show all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recentItems.slice(0, 6).map((item, idx) => {
                  const isThisPlaying =
                    isPlaying &&
                    currentTrack &&
                    (item.id === currentTrack.id || item.playlistId === currentTrack.contextName);

                  return (
                    <div
                      key={`recent-${item.id}-${idx}`}
                      onClick={() => {
                        if (item.type === 'playlist') handleOpenPlaylist(item.id);
                        else handleOpenTrack(item.id);
                      }}
                      onContextMenu={(e) => {
                        if (item.type === 'playlist') {
                          const pl =
                            catalogPlaylists.find((p) => p.id === item.id) ||
                            playlists.find((p) => p.id === item.id) ||
                            useMusicHubStore.getState().getPlaylistById(item.id);
                          if (pl) {
                            handlePlaylistContextMenu(e, pl);
                          }
                        } else {
                          const tr: SpotifyTrack = item.track || {
                            id: item.id,
                            title: item.title,
                            artist: item.artist || item.subtitle || 'Unknown Artist',
                            album: item.title,
                            albumArt: item.coverUrl || '',
                            durationMs: 180000,
                            previewUrl: null,
                            spotifyUrl: `https://open.spotify.com/track/${item.id}`,
                            source: 'soundcloud',
                          };
                          handleTrackContextMenu(e, tr);
                        }
                      }}
                      className="group relative p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
                    >
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-black/40 shadow-lg">
                        {item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-purple-950">
                            <Music2 size={32} className="text-white/40" />
                          </div>
                        )}

                        <div className="absolute right-2 bottom-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.track) {
                                handlePlayTrackCard(e, item.track, recommendedTracks);
                              } else {
                                const pl =
                                  catalogPlaylists.find((p) => p.id === item.id) ||
                                  playlists.find((p) => p.id === item.id);
                                if (pl) handlePlayPlaylistCard(e, pl);
                              }
                            }}
                            aria-label={`Play ${item.title}`}
                            className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/40 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95"
                          >
                            {isThisPlaying ? (
                              <Pause size={18} className="fill-white" />
                            ) : (
                              <Play size={18} className="fill-white ml-0.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 group-hover:underline transition-colors">
                        {item.title}
                      </h3>

                      <span className="text-xs text-gray-400 truncate mt-1">
                        {item.type === 'playlist'
                          ? item.subtitle ||
                            (item.artist ? `Playlist • ${item.artist}` : 'Playlist')
                          : item.artist || item.subtitle || 'Artist'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Adaptive Recommendations */}
          <div className="mb-10">
            <div className="mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" />
                {recsSupertitle}
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-0.5">
                Recommendations for Today
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recommendedTracks.slice(0, 6).map((tr, idx) => {
                const isThisPlaying = isPlaying && currentTrack?.id === tr.id;

                return (
                  <div
                    key={`home-rec-${tr.id}-${idx}`}
                    onClick={() => handleOpenTrack(tr.id)}
                    onContextMenu={(e) => handleTrackContextMenu(e, tr)}
                    className="group relative p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-black/40 shadow-lg">
                      {tr.albumArt ? (
                        <img
                          src={tr.albumArt}
                          alt={tr.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-950">
                          <Music2 size={32} className="text-white/40" />
                        </div>
                      )}

                      <div className="absolute right-2 bottom-2">
                        <button
                          type="button"
                          onClick={(e) => handlePlayTrackCard(e, tr, recommendedTracks)}
                          aria-label={`Play ${tr.title}`}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/40 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          {isThisPlaying ? (
                            <Pause size={18} className="fill-white" />
                          ) : (
                            <Play size={18} className="fill-white ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 group-hover:underline transition-colors">
                      {tr.title}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-1">{tr.artist}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Popular Playlists */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={18} className="text-purple-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Popular Playlists</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {catalogPlaylists.slice(0, 6).map((pl, idx) => {
                const isThisPlaying =
                  isPlaying && currentTrack && pl.tracks.some((t) => t.id === currentTrack.id);

                return (
                  <div
                    key={`home-pl-${pl.id}-${idx}`}
                    onClick={() => handleOpenPlaylist(pl.id)}
                    onContextMenu={(e) => handlePlaylistContextMenu(e, pl)}
                    className="group relative p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-white/10 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-black/40 shadow-lg">
                      {pl.coverUrl ? (
                        <img
                          src={pl.coverUrl}
                          alt={pl.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-950">
                          <Music2 size={32} className="text-white/40" />
                        </div>
                      )}

                      <div className="absolute right-2 bottom-2">
                        <button
                          type="button"
                          onClick={(e) => handlePlayPlaylistCard(e, pl)}
                          aria-label={`Play ${pl.title}`}
                          className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/40 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                          {isThisPlaying ? (
                            <Pause size={18} className="fill-white" />
                          ) : (
                            <Play size={18} className="fill-white ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white truncate group-hover:text-purple-300 group-hover:underline transition-colors">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-snug">
                      {pl.description || `Playlist by ${pl.creator}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Action Menu Portals */}
      {activePlaylistMenu && (
        <PlaylistActionMenu
          isOpen={Boolean(activePlaylistMenu)}
          onClose={() => setActivePlaylistMenu(null)}
          anchorRect={activePlaylistMenu.rect}
          playlist={activePlaylistMenu.playlist}
        />
      )}

      {activeTrackMenu && (
        <TrackActionMenu
          isOpen={Boolean(activeTrackMenu)}
          onClose={() => setActiveTrackMenu(null)}
          anchorRect={activeTrackMenu.rect}
          track={activeTrackMenu.track}
        />
      )}
    </div>
  );
};
