import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Mic2, SkipBack, SkipForward } from 'lucide-react';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { getSafeSpotifyTrackUrl, unescapeHtml, isSoundCloudUrl } from '@/shared/lib/spotifyUrl';

const DEFAULT_ARTWORK_FALLBACK =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';

interface LyricLine {
  timeMs: number;
  text: string;
}

export const SpotifyLyricsModal: React.FC = () => {
  const isLyricsOpen = useSpotifyPlayerStore((s) => s.isLyricsOpen);
  const setLyricsOpen = useSpotifyPlayerStore((s) => s.setLyricsOpen);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const progressMs = useSpotifyPlayerStore((s) => s.progressMs);
  const durationMs = useSpotifyPlayerStore((s) => s.durationMs);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const seek = useSpotifyPlayerStore((s) => s.seek);
  const prevTrack = useSpotifyPlayerStore((s) => s.prevTrack);
  const nextTrack = useSpotifyPlayerStore((s) => s.nextTrack);

  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const linesContainerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLDivElement | null>(null);

  const isSoundCloud = Boolean(
    currentTrack?.source === 'soundcloud' ||
    currentTrack?.id?.startsWith('sc-') ||
    currentTrack?.id?.startsWith('soundcloud-') ||
    isSoundCloudUrl(currentTrack?.spotifyUrl),
  );

  // Fetch lyrics whenever currentTrack changes or lyrics modal opens
  useEffect(() => {
    if (!currentTrack || !isLyricsOpen) return;

    let isMounted = true;
    setLoading(true);

    integrationsApi
      .getSpotifyLyrics(currentTrack.title, currentTrack.artist, currentTrack.durationMs)
      .then((res) => {
        if (isMounted) {
          setLyrics(res.lines || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLyrics([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack, isLyricsOpen]);

  // Find active line index
  let activeIndex = 0;
  for (let i = 0; i < lyrics.length; i++) {
    if (progressMs >= lyrics[i].timeMs) {
      activeIndex = i;
    } else {
      break;
    }
  }

  // Capture-phase Escape key handler to strictly close only Karaoke without bubbling to Game Mode
  useEffect(() => {
    if (!isLyricsOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setLyricsOpen(false);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, true);
    return () => window.removeEventListener('keydown', handleWindowKeyDown, true);
  }, [isLyricsOpen, setLyricsOpen]);

  // Smooth auto-scroll to active line
  useEffect(() => {
    if (!activeLineRef.current || !linesContainerRef.current) return;
    const container = linesContainerRef.current;
    const activeEl = activeLineRef.current;

    const targetScroll =
      activeEl.offsetTop -
      container.offsetTop -
      container.clientHeight / 2 +
      activeEl.clientHeight / 2;

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    } else {
      container.scrollTop = targetScroll;
    }
  }, [activeIndex]);

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (progressMs / (durationMs || 1)) * 100));

  if (!isLyricsOpen || !currentTrack) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xl animate-fadeIn select-none"
        onClick={() => setLyricsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl h-[620px] max-h-[88vh] rounded-[32px] sm:rounded-[40px] flex flex-col overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(13, 14, 20, 0.88)',
            backdropFilter: 'blur(48px) saturate(230%)',
            WebkitBackdropFilter: 'blur(48px) saturate(230%)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: `0 32px 80px -16px rgba(0, 0, 0, 0.9), inset 0 2px 2px 0 rgba(255, 255, 255, 0.45), inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.5), 0 0 40px ${
              isSoundCloud ? 'rgba(255, 85, 0, 0.2)' : 'rgba(29, 185, 84, 0.2)'
            }`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Album Glow In Background */}
          <div
            className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700"
            style={{ backgroundColor: isSoundCloud ? '#FF5500' : '#1DB954' }}
          />

          {/* Liquid Glass Top Refraction Highlight Rim */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

          {/* Modal Header */}
          <div className="relative flex items-center justify-between p-5 sm:p-6 border-b border-white/[0.08] shrink-0 z-10">
            <div className="flex items-center gap-3.5 min-w-0">
              <img
                src={currentTrack.albumArt || DEFAULT_ARTWORK_FALLBACK}
                alt={currentTrack.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    currentTrack.artistAvatar || DEFAULT_ARTWORK_FALLBACK;
                }}
                className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {unescapeHtml(currentTrack.title)}
                  </h3>
                  {isSoundCloud ? (
                    <a
                      href={currentTrack.spotifyUrl || 'https://soundcloud.com'}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-[#FF5500] transition-colors shrink-0"
                      title="Open in SoundCloud"
                    >
                      <SoundCloudBrandIcon size={16} />
                    </a>
                  ) : (
                    <a
                      href={getSafeSpotifyTrackUrl(currentTrack)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-[#1DB954] transition-colors shrink-0"
                      title="Open in Spotify"
                    >
                      <SpotifyBrandIcon size={14} />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  {isSoundCloud ? (
                    <span className="text-[#FF5500] shrink-0" title="SoundCloud">
                      <SoundCloudBrandIcon size={12} />
                    </span>
                  ) : (
                    <span className="text-[#1DB954] shrink-0" title="Spotify">
                      <SpotifyBrandIcon size={11} />
                    </span>
                  )}
                  <p className="text-xs text-gray-400 truncate font-medium">
                    {unescapeHtml(currentTrack.artist)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  isSoundCloud
                    ? 'bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500]'
                    : 'bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954]'
                }`}
              >
                <Mic2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Karaoke</span>
              </div>
              <button
                type="button"
                onClick={() => setLyricsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Karaoke Lyrics Scrolling Area */}
          <div
            ref={linesContainerRef}
            className="flex-1 overflow-y-auto px-6 sm:px-10 py-12 space-y-6 scrollbar-none relative text-center z-10"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div
                  className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${
                    isSoundCloud ? 'border-[#FF5500]' : 'border-[#1DB954]'
                  }`}
                />
                <span className="text-xs">Loading synchronized lyrics...</span>
              </div>
            ) : lyrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div
                  className={`p-4 rounded-full ${
                    isSoundCloud
                      ? 'bg-[#FF5500]/10 text-[#FF5500]'
                      : 'bg-[#1DB954]/10 text-[#1DB954]'
                  }`}
                >
                  <Mic2 className="w-8 h-8" />
                </div>
                <p className="text-base font-semibold text-white">Lyrics are not available yet</p>
                <p className="text-xs text-gray-400 max-w-xs text-center">
                  No synchronized lyrics available for this track, or it is an instrumental piece
                </p>
              </div>
            ) : (
              lyrics.map((line, idx) => {
                const isActive = idx === activeIndex;
                const isPast = idx < activeIndex;

                return (
                  <div
                    key={`lyric-${idx}`}
                    ref={isActive ? activeLineRef : null}
                    onClick={() => seek(line.timeMs)}
                    className={`transition-all duration-300 cursor-pointer py-1.5 px-4 rounded-2xl ${
                      isActive
                        ? `text-white text-2xl sm:text-3xl font-extrabold scale-[1.04] bg-white/[0.04] ${
                            isSoundCloud
                              ? 'drop-shadow-[0_0_24px_rgba(255,85,0,0.5)]'
                              : 'drop-shadow-[0_0_24px_rgba(29,185,84,0.5)]'
                          }`
                        : isPast
                          ? 'text-white/40 text-lg sm:text-xl font-medium hover:text-white/80'
                          : 'text-white/20 text-lg sm:text-xl font-normal hover:text-white/60'
                    }`}
                  >
                    {line.text}
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-black/30 backdrop-blur-md shrink-0 flex flex-col gap-2.5 z-10">
            {/* Scrubber */}
            <div className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-mono text-gray-400 w-10 text-right">
                {formatTime(progressMs)}
              </span>
              <div
                className="relative flex-1 h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group/scrub"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seek(pos * durationMs);
                }}
              >
                <div
                  className={`h-full rounded-full transition-all ${
                    isSoundCloud
                      ? 'bg-[#FF5500] group-hover/scrub:bg-[#ff6a1a]'
                      : 'bg-[#1DB954] group-hover/scrub:bg-[#1ed760]'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-gray-400 w-10">
                {formatTime(durationMs)}
              </span>
            </div>

            {/* Quick Playback Bar */}
            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={prevTrack}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Previous track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              <button
                type="button"
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-black text-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Next track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
