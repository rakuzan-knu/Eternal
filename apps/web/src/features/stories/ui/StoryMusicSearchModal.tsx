import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Music, Loader2 } from 'lucide-react';
import Hls from 'hls.js';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';

import { StoryMusicCustomizerModal } from './StoryMusicCustomizerModal';

export interface StoryMusicTrack {
  id: string;
  rawId?: string;
  title: string;
  artist: string;
  albumArt: string;
  durationMs?: number;
  streamUrl?: string;
  audioUrl?: string;
  isHls?: boolean;
  musicStyle?: 'none' | 'card' | 'cover' | 'vinyl';
  stickerColor?: string;
  startTimeMs?: number;
  clipDurationSeconds?: number;
}

interface StoryMusicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrack: (track: StoryMusicTrack) => void;
}

const QUICK_GENRES = ['For You', 'Trending', 'Phonk', 'Hip-hop', 'Electronic', 'Lofi / Chill'];

export const StoryMusicSearchModal: React.FC<StoryMusicSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTrack,
}) => {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('For You');
  const [tracks, setTracks] = useState<StoryMusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isLoadingPreviewId, setIsLoadingPreviewId] = useState<string | null>(null);
  const [customizingTrack, setCustomizingTrack] = useState<StoryMusicTrack | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resolvedStreamsRef = useRef<Map<string, { streamUrl: string; isHls: boolean }>>(new Map());
  const activeRequestIdRef = useRef<string | null>(null);

  const stopAudio = () => {
    activeRequestIdRef.current = null;
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    audioCoordinator.stop('story-music-preview');
    setPlayingTrackId(null);
    setIsLoadingPreviewId(null);
  };

  // Stop audio on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
    } else {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    return () => {
      stopAudio();
    };
  }, [isOpen]);

  // Initial load & search query
  useEffect(() => {
    if (!isOpen) return;

    const searchTerm = query.trim() || (activeGenre === 'For You' ? 'Top Hits 2026' : activeGenre);
    setIsLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const scData = await integrationsApi
          .searchSoundCloudCatalog(searchTerm, 15)
          .catch(() => []);
        if (Array.isArray(scData)) {
          const mapped: StoryMusicTrack[] = scData.map((t: any) => {
            const rawId = String(t.rawId || t.id)
              .replace(/^sc-/, '')
              .replace(/^soundcloud-/, '')
              .trim();
            const hasDirectStream =
              t.streamUrl &&
              !t.streamUrl.startsWith('/api') &&
              !t.streamUrl.startsWith('/integrations');
            return {
              id: String(t.id),
              rawId,
              title: t.title || 'SoundCloud Track',
              artist: t.artist || t.user?.username || 'Artist',
              albumArt: t.albumArt || t.artwork_url || '',
              durationMs: t.durationMs || t.duration || 180000,
              streamUrl: hasDirectStream ? t.streamUrl : undefined,
              audioUrl: t.previewUrl || (hasDirectStream ? t.streamUrl : undefined),
              isHls: t.isHls,
            };
          });
          setTracks(mapped);
        }
      } catch {
        setTracks([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [isOpen, query, activeGenre]);

  const handleTogglePreview = async (e: React.MouseEvent, track: StoryMusicTrack) => {
    e.stopPropagation();

    // If currently playing this track -> stop/pause it
    if (playingTrackId === track.id) {
      stopAudio();
      return;
    }

    // Stop previous track
    stopAudio();

    setIsLoadingPreviewId(track.id);
    activeRequestIdRef.current = track.id;

    try {
      let playUrl =
        track.audioUrl ||
        (track.streamUrl &&
        !track.streamUrl.startsWith('/api') &&
        !track.streamUrl.startsWith('/integrations')
          ? track.streamUrl
          : undefined);
      let isHls = track.isHls ?? false;

      // Check in-memory cache
      const cached = resolvedStreamsRef.current.get(track.id);
      if (cached) {
        playUrl = cached.streamUrl;
        isHls = cached.isHls;
      } else if (!playUrl) {
        const cleanId = (track.rawId || track.id)
          .replace(/^sc-/, '')
          .replace(/^soundcloud-/, '')
          .trim();
        const streamData = await integrationsApi.getSoundCloudStream(cleanId).catch(() => null);

        // Abort if another track was clicked while waiting
        if (activeRequestIdRef.current !== track.id) {
          return;
        }

        if (streamData?.streamUrl) {
          playUrl = streamData.streamUrl;
          isHls = Boolean(streamData.isHls) || playUrl.includes('.m3u8');
          resolvedStreamsRef.current.set(track.id, { streamUrl: playUrl, isHls });
        }
      }

      if (!playUrl || activeRequestIdRef.current !== track.id) {
        setIsLoadingPreviewId(null);
        return;
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.preload = 'auto';
      }

      const audio = audioRef.current;
      audio.volume = 0.85;

      audio.onended = () => {
        setPlayingTrackId(null);
        setIsLoadingPreviewId(null);
      };

      audio.onerror = (err) => {
        console.warn('[StoryMusic] Audio error:', err);
        stopAudio();
      };

      if (isHls || playUrl.includes('.m3u8')) {
        // Native HLS for Safari (iOS / macOS WebKit)
        if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          audio.src = playUrl;
          audioCoordinator.play(audio, 'story-music-preview');
          await audio.play();
          if (activeRequestIdRef.current === track.id) {
            setPlayingTrackId(track.id);
            setIsLoadingPreviewId(null);
          }
        } else if (Hls.isSupported()) {
          // Chrome, Edge, Firefox via Hls.js
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(playUrl);
          hls.attachMedia(audio);

          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            if (activeRequestIdRef.current !== track.id) return;
            try {
              audioCoordinator.play(audio, 'story-music-preview');
              await audio.play();
              if (activeRequestIdRef.current === track.id) {
                setPlayingTrackId(track.id);
              }
            } catch (playErr) {
              console.warn('[StoryMusic] HLS play error:', playErr);
              stopAudio();
            } finally {
              if (activeRequestIdRef.current === track.id) {
                setIsLoadingPreviewId(null);
              }
            }
          });

          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) {
              console.warn('[StoryMusic] HLS fatal error:', data);
              stopAudio();
            }
          });
        } else {
          audio.src = playUrl;
          audioCoordinator.play(audio, 'story-music-preview');
          await audio.play();
          if (activeRequestIdRef.current === track.id) {
            setPlayingTrackId(track.id);
            setIsLoadingPreviewId(null);
          }
        }
      } else {
        // Direct MP3
        audio.src = playUrl;
        audioCoordinator.play(audio, 'story-music-preview');
        await audio.play();
        if (activeRequestIdRef.current === track.id) {
          setPlayingTrackId(track.id);
          setIsLoadingPreviewId(null);
        }
      }
    } catch (err) {
      console.warn('[StoryMusic] Preview failed:', err);
      stopAudio();
    }
  };

  const handleSelect = async (track: StoryMusicTrack) => {
    stopAudio();

    let resolvedUrl =
      track.audioUrl ||
      (track.streamUrl &&
      !track.streamUrl.startsWith('/api') &&
      !track.streamUrl.startsWith('/integrations')
        ? track.streamUrl
        : undefined);
    const cached = resolvedStreamsRef.current.get(track.id);
    if (cached) {
      resolvedUrl = cached.streamUrl;
    }

    if (!resolvedUrl) {
      try {
        const cleanId = (track.rawId || track.id)
          .replace(/^sc-/, '')
          .replace(/^soundcloud-/, '')
          .trim();
        const streamData = await integrationsApi.getSoundCloudStream(cleanId).catch(() => null);
        if (streamData?.streamUrl) {
          resolvedUrl = streamData.streamUrl;
          resolvedStreamsRef.current.set(track.id, {
            streamUrl: streamData.streamUrl,
            isHls: Boolean(streamData.isHls),
          });
        }
      } catch {}
    }

    // Open Instagram-style Music Customizer Modal
    setCustomizingTrack({
      ...track,
      streamUrl: resolvedUrl,
      audioUrl: resolvedUrl,
      isHls: cached?.isHls ?? track.isHls,
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '0:30';
    const s = Math.floor((ms / 1000) % 60);
    const m = Math.floor(ms / 60000);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 select-none animate-fadeIn"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[440px] h-[85vh] sm:h-[680px] bg-[#101018]/95 backdrop-blur-3xl border border-white/15 rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-slideUp"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Music size={18} className="text-purple-400" />
              <h2 className="text-base font-bold tracking-tight">Music for Story</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 py-3">
            <div className="relative flex items-center bg-white/10 border border-white/15 rounded-full px-3.5 py-2">
              <Search size={16} className="text-gray-400 shrink-0 mr-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search music on SoundCloud..."
                className="w-full bg-transparent text-xs text-white placeholder-gray-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Genre Mood Filter Pills */}
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-none shrink-0">
            {QUICK_GENRES.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => {
                  setActiveGenre(genre);
                  setQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeGenre === genre && !query
                    ? 'bg-white text-black shadow-md scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Track List */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 scrollbar-thin">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin text-purple-400" />
                <span className="text-xs font-medium">Searching tracks...</span>
              </div>
            ) : tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
                <Music size={32} className="opacity-40" />
                <span className="text-xs font-medium">No tracks found</span>
              </div>
            ) : (
              tracks.map((track) => {
                const isPlaying = playingTrackId === track.id;
                const isLoadingThis = isLoadingPreviewId === track.id;

                return (
                  <div
                    key={track.id}
                    onClick={(e) => handleTogglePreview(e, track)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleSelect(track);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition-all cursor-pointer group ${
                      isPlaying
                        ? 'bg-purple-900/30 border border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                        : 'hover:bg-white/10 border border-transparent'
                    }`}
                    title="Click to preview. Click Add to select"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Album Art with Interactive Play/Pause/Loader Indicator */}
                      <div
                        onClick={(e) => handleTogglePreview(e, track)}
                        className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/10 shrink-0 border border-white/10 shadow-sm cursor-pointer"
                      >
                        {track.albumArt ? (
                          <img
                            src={track.albumArt}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-purple-800 to-pink-700">
                            <Music size={18} className="text-white/80" />
                          </div>
                        )}
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all ${
                            isPlaying || isLoadingThis
                              ? 'bg-black/60 opacity-100'
                              : 'bg-black/35 opacity-80 group-hover:opacity-100 group-hover:bg-black/50 text-white'
                          }`}
                        >
                          {isLoadingThis ? (
                            <Loader2 size={18} className="animate-spin text-purple-400" />
                          ) : isPlaying ? (
                            <div className="flex items-center gap-0.5 h-4">
                              <span className="w-1 h-full bg-purple-400 rounded-full animate-pulse" />
                              <span className="w-1 h-2.5 bg-purple-300 rounded-full animate-pulse delay-75" />
                              <span className="w-1 h-3.5 bg-purple-400 rounded-full animate-pulse delay-150" />
                            </div>
                          ) : (
                            <Play size={16} className="ml-0.5 fill-white/90 text-white/90" />
                          )}
                        </div>
                      </div>

                      {/* Titles (Clicking plays/pauses preview) */}
                      <div
                        onClick={(e) => handleTogglePreview(e, track)}
                        className="flex flex-col min-w-0 flex-1 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold truncate transition-colors ${
                              isPlaying
                                ? 'text-purple-300'
                                : 'text-white group-hover:text-purple-300'
                            }`}
                          >
                            {track.title}
                          </span>
                          {isLoadingThis && (
                            <span className="text-[10px] font-medium text-purple-400 animate-pulse shrink-0">
                              • Loading...
                            </span>
                          )}
                          {isPlaying && (
                            <span className="text-[10px] font-bold text-purple-400 animate-pulse tracking-wide shrink-0">
                              • Playing
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 truncate">
                          {track.artist} • {formatDuration(track.durationMs)}
                        </span>
                      </div>
                    </div>

                    {/* Explicit Add Button (Only this selects the track) */}
                    <div className="flex items-center gap-2 pl-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(track);
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white shadow-md hover:shadow-purple-500/40 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Story Music Customizer Modal */}
      {customizingTrack && (
        <StoryMusicCustomizerModal
          isOpen={Boolean(customizingTrack)}
          track={customizingTrack}
          onClose={() => setCustomizingTrack(null)}
          onConfirm={(config) => {
            const finalTrack = {
              ...customizingTrack,
              ...config,
              id: customizingTrack.id,
              rawId: customizingTrack.rawId,
            };
            setCustomizingTrack(null);
            onSelectTrack(finalTrack);
            onClose();
          }}
        />
      )}
    </>
  );
};
