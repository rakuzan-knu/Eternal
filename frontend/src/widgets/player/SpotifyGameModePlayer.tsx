import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Heart,
  Volume1,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
  Maximize2,
  Minimize2,
  Sparkles,
  Gamepad2,
  Headphones,
  Search,
} from 'lucide-react';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { extractDominantColors, type AmbientPalette } from '@/shared/lib/extractDominantColors';
import { unescapeHtml, isSoundCloudUrl } from '@/shared/lib/spotifyUrl';
import { SpotifyQueuePopover } from './SpotifyQueuePopover';
import { SpotifyLiquidSearchModal } from './SpotifyLiquidSearchModal';

const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const SpotifyGameModePlayer: React.FC = () => {
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);
  const setGameModeOpen = useSpotifyPlayerStore((s) => s.setGameModeOpen);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const progressMs = useSpotifyPlayerStore((s) => s.progressMs);
  const durationMs = useSpotifyPlayerStore((s) => s.durationMs);
  const volume = useSpotifyPlayerStore((s) => s.volume);
  const isMuted = useSpotifyPlayerStore((s) => s.isMuted);
  const repeatMode = useSpotifyPlayerStore((s) => s.repeatMode);
  const isShuffled = useSpotifyPlayerStore((s) => s.isShuffled);
  const isLiked = useSpotifyPlayerStore((s) => s.isLiked);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const seek = useSpotifyPlayerStore((s) => s.seek);
  const prevTrack = useSpotifyPlayerStore((s) => s.prevTrack);
  const nextTrack = useSpotifyPlayerStore((s) => s.nextTrack);
  const toggleRepeat = useSpotifyPlayerStore((s) => s.toggleRepeat);
  const toggleShuffle = useSpotifyPlayerStore((s) => s.toggleShuffle);
  const toggleLike = useSpotifyPlayerStore((s) => s.toggleLike);
  const setVolume = useSpotifyPlayerStore((s) => s.setVolume);
  const toggleMute = useSpotifyPlayerStore((s) => s.toggleMute);
  const toggleLyrics = useSpotifyPlayerStore((s) => s.toggleLyrics);
  const toggleQueue = useSpotifyPlayerStore((s) => s.toggleQueue);
  const isLyricsOpen = useSpotifyPlayerStore((s) => s.isLyricsOpen);
  const isQueueOpen = useSpotifyPlayerStore((s) => s.isQueueOpen);
  const queueSource = useSpotifyPlayerStore((s) => s.queueSource);

  const isSoundCloud = Boolean(
    currentTrack?.source === 'soundcloud' ||
    currentTrack?.id?.startsWith('sc-') ||
    currentTrack?.id?.startsWith('soundcloud-') ||
    isSoundCloudUrl(currentTrack?.spotifyUrl),
  );

  // Dynamic ambient palette state
  const [palette, setPalette] = useState<AmbientPalette>({
    primary: 'rgb(24, 34, 52)',
    secondary: 'rgb(12, 16, 26)',
    glow: 'rgba(24, 34, 52, 0.4)',
    bgGradient:
      'radial-gradient(circle at 50% 30%, rgb(24, 34, 52) 0%, rgb(12, 16, 26) 65%, #08090d 100%)',
  });

  // Dual-layer static gradient state for buttery smooth opacity crossfades (0% continuous GPU usage)
  const [gradientA, setGradientA] = useState(palette.bgGradient);
  const [gradientB, setGradientB] = useState(palette.bgGradient);
  const [currentLayer, setCurrentLayer] = useState<'A' | 'B'>('A');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Apple Liquid Glass Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Scrubber dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);

  // Dynamic Cover Art state with smart artistAvatar fallback and error prevention
  const [coverSrc, setCoverSrc] = useState<string>(
    currentTrack?.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
  );
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setCoverSrc(
      currentTrack?.albumArt || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
    );
    setHasImageError(false);
  }, [currentTrack?.id, currentTrack?.albumArt]);

  const handleImageError = () => {
    // If track has artistAvatar and it's different from the failed coverSrc, attempt that first
    if (currentTrack?.artistAvatar && coverSrc !== currentTrack.artistAvatar) {
      setCoverSrc(currentTrack.artistAvatar);
    } else {
      setHasImageError(true);
    }
  };

  const layerRef = useRef<'A' | 'B'>('A');

  // Extract vibrant colors from album art in real time on track change (only when game mode is active)
  useEffect(() => {
    if (!isGameModeOpen || !coverSrc) return;

    let isMounted = true;
    extractDominantColors(coverSrc, currentTrack?.title).then((extracted) => {
      if (isMounted) {
        setPalette(extracted);
        // Alternate layers for a seamless 1.2s crossfade without GPU blur load
        if (layerRef.current === 'A') {
          setGradientB(extracted.bgGradient);
          layerRef.current = 'B';
          setCurrentLayer('B');
        } else {
          setGradientA(extracted.bgGradient);
          layerRef.current = 'A';
          setCurrentLayer('A');
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [coverSrc, currentTrack?.id, isGameModeOpen]);

  // Global Keyboard handlers (Escape to close submodals first, Cmd+K / Ctrl+K to search)
  useEffect(() => {
    if (!isGameModeOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape' && isGameModeOpen) {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          return;
        }
        if (isLyricsOpen) {
          toggleLyrics();
          return;
        }
        if (isQueueOpen) {
          toggleQueue();
          return;
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setGameModeOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isGameModeOpen,
    setGameModeOpen,
    isSearchOpen,
    isLyricsOpen,
    isQueueOpen,
    toggleLyrics,
    toggleQueue,
  ]);

  // Lock body/html scroll and eliminate scrollbar gutter to prevent any black or white edge lines
  useEffect(() => {
    if (!isGameModeOpen) return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlGutter = html.style.scrollbarGutter;
    const prevHtmlWidth = html.style.width;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyGutter = body.style.scrollbarGutter;
    const prevBodyWidth = body.style.width;

    html.classList.add('game-mode-active');
    body.classList.add('game-mode-active');
    html.style.overflow = 'hidden';
    html.style.scrollbarGutter = 'auto';
    html.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.scrollbarGutter = 'auto';
    body.style.width = '100%';

    return () => {
      html.classList.remove('game-mode-active');
      body.classList.remove('game-mode-active');
      html.style.overflow = prevHtmlOverflow;
      html.style.scrollbarGutter = prevHtmlGutter;
      html.style.width = prevHtmlWidth;
      body.style.overflow = prevBodyOverflow;
      body.style.scrollbarGutter = prevBodyGutter;
      body.style.width = prevBodyWidth;
    };
  }, [isGameModeOpen]);

  // Track Fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setGameModeOpen(false);
  };

  const activeProgress = isDragging ? dragProgress : progressMs;
  const progressRatio = durationMs > 0 ? Math.min(1, Math.max(0, activeProgress / durationMs)) : 0;
  const remainingMs = Math.max(0, durationMs - activeProgress);

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDragProgress(val);
  };

  const handleScrubberCommit = (
    e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>,
  ) => {
    setIsDragging(false);
    const targetMs = parseFloat((e.target as HTMLInputElement).value);
    seek(targetMs);
  };

  if (!isGameModeOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="spotify-game-mode-fullscreen"
        data-testid="spotify-game-mode-player"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 w-full h-full z-50 flex flex-col justify-between select-none overflow-hidden bg-[#08090d]"
      >
        {/* Layer A static gradient with smooth opacity crossfade */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{
            background: gradientA,
            opacity: currentLayer === 'A' ? 1 : 0,
          }}
        />

        {/* Layer B static gradient with smooth opacity crossfade */}
        <div
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
          style={{
            background: gradientB,
            opacity: currentLayer === 'B' ? 1 : 0,
          }}
        />

        {/* Subtle Static Ambient Glass Top & Bottom Shines (0 GPU cycle overhead, no 60fps CSS animation) */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* TOP BAR: Header with Centered Badge and Symmetrical Left/Right Actions */}
        <header className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto">
          {/* Left: Apple Liquid Glass Search Trigger */}
          <div className="flex items-center justify-start w-[88px] sm:w-[96px]">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/80 hover:text-white border border-white/15 backdrop-blur-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-md text-xs font-medium group"
              title={
                isSoundCloud ? 'Search on SoundCloud & Spotify' : 'Search on Spotify & SoundCloud'
              }
            >
              <Search
                className={`w-4 h-4 transition-colors duration-300 group-hover:scale-110 ${
                  isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'
                }`}
              />
              <span className="font-medium tracking-wide">Search</span>
            </button>
          </div>

          {/* Centered Game Mode HUD Badge (clean, no green dot, no 'Ultra Performance') */}
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 backdrop-blur-2xl text-xs font-semibold text-white/90 shadow-md transition-all">
              <Gamepad2
                className={`w-3.5 h-3.5 transition-colors duration-300 ${
                  isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'
                }`}
              />
              <span className="tracking-wide">Game Mode</span>
            </div>
          </div>

          {/* Action cluster: Fullscreen F11 & Close X (Total width matches left side: w-[88px] sm:w-[96px]) */}
          <div className="flex items-center justify-end gap-2 w-[88px] sm:w-[96px]">
            {/* Native Fullscreen API button */}
            <button
              type="button"
              onClick={toggleNativeFullscreen}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-white/80 hover:text-white border border-white/15 backdrop-blur-2xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer shadow-md"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F11)'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Apple Liquid Glass Close X */}
            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.22] text-white/90 hover:text-white border border-white/20 backdrop-blur-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg group"
              title="Exit Game Mode (Esc)"
              aria-label="Exit Game Mode"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </header>

        {/* MAIN CENTER COLUMN (Constrained to max-w-xl, dynamically fits windowed & fullscreen) */}
        <main className="relative z-10 flex-1 flex flex-col justify-center max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl mx-auto w-full px-6 py-2">
          {/* Large Album Art with Apple-style dynamic depth shadow (True 1:1 square, significantly taller & never squeezed) */}
          <div className="relative mx-auto my-auto w-[min(300px,36vh)] h-[min(300px,36vh)] sm:w-[min(350px,40vh)] sm:h-[min(350px,40vh)] md:w-[min(390px,44vh)] md:h-[min(390px,44vh)] aspect-square flex items-center justify-center group shrink-0">
            {/* Ambient Backglow */}
            <div
              className="absolute inset-4 rounded-[32px] filter blur-2xl opacity-40 transition-all duration-1000 pointer-events-none"
              style={{ backgroundColor: palette.primary }}
            />

            {/* Album Cover */}
            {hasImageError ? (
              <motion.div
                key={`fallback-${currentTrack?.id || 'empty'}`}
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: isPlaying ? 1 : 0.94, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full h-full rounded-[24px] sm:rounded-[32px] border border-white/15 aspect-square flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-br from-white/15 via-white/[0.04] to-black/75 backdrop-blur-2xl"
                style={{
                  boxShadow: `0 24px 60px rgba(0,0,0,0.8), 0 0 45px ${isSoundCloud ? 'rgba(255,85,0,0.22)' : 'rgba(29,185,84,0.22)'}`,
                }}
              >
                {/* Concentric subtle vinyl grooves */}
                <div className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-25 flex items-center justify-center">
                  <div className="w-[85%] h-[85%] rounded-full border border-white/15" />
                  <div className="absolute w-[60%] h-[60%] rounded-full border border-white/15" />
                  <div className="absolute w-[35%] h-[35%] rounded-full border border-white/15" />
                </div>

                {/* Platform Brand Icon with glow */}
                <div
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center mb-3 shadow-2xl backdrop-blur-xl border transition-transform ${
                    isSoundCloud
                      ? 'bg-[#FF5500]/20 border-[#FF5500]/40 text-[#FF5500] shadow-[0_0_30px_rgba(255,85,0,0.35)]'
                      : 'bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1DB954] shadow-[0_0_30px_rgba(29,185,84,0.35)]'
                  }`}
                >
                  {isSoundCloud ? (
                    <SoundCloudBrandIcon size={48} />
                  ) : (
                    <SpotifyBrandIcon size={44} />
                  )}
                </div>

                {/* Track & Artist in fallback card */}
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight line-clamp-2 px-2">
                  {unescapeHtml(currentTrack?.title) || 'Audio Track'}
                </h3>
                <p className="text-xs text-white/60 font-medium truncate max-w-[85%] mt-1">
                  {unescapeHtml(currentTrack?.artist) || (isSoundCloud ? 'SoundCloud' : 'Spotify')}
                </p>
              </motion.div>
            ) : (
              <motion.img
                key={currentTrack?.id || 'cover'}
                src={coverSrc}
                alt={currentTrack?.title || 'Album Art'}
                onError={handleImageError}
                initial={{ scale: 0.94, opacity: 0 }}
                animate={{ scale: isPlaying ? 1 : 0.94, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full h-full object-cover rounded-[24px] sm:rounded-[32px] shadow-[0_24px_60px_rgba(0,0,0,0.8),0_8px_24px_rgba(0,0,0,0.5)] border border-white/15 aspect-square"
              />
            )}
          </div>

          {/* Track Info & Like Star */}
          {(() => {
            const isSoundCloud = Boolean(
              currentTrack?.source === 'soundcloud' ||
              currentTrack?.id?.startsWith('sc-') ||
              currentTrack?.id?.startsWith('soundcloud-'),
            );

            return (
              <div className="mt-3 sm:mt-4 mb-2 sm:mb-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate leading-tight">
                    {unescapeHtml(currentTrack?.title) || 'No track'}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5 min-w-0">
                    <p className="text-xs sm:text-sm md:text-base text-white/70 font-medium truncate">
                      {unescapeHtml(currentTrack?.artist) ||
                        (isSoundCloud ? 'SoundCloud' : 'Spotify')}
                    </p>
                    {isSoundCloud ? (
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#FF5500] bg-[#FF5500]/15 border border-[#FF5500]/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 shrink-0">
                        <SoundCloudBrandIcon size={12} />
                        SoundCloud
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#1DB954] bg-[#1DB954]/15 border border-[#1DB954]/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 shrink-0">
                        <SpotifyBrandIcon size={12} />
                        Spotify
                      </span>
                    )}
                  </div>
                </div>

                {/* Like Heart Button */}
                <button
                  type="button"
                  onClick={toggleLike}
                  className={`p-2 rounded-full transition-all hover:scale-110 cursor-pointer ${
                    isLiked
                      ? isSoundCloud
                        ? 'text-[#FF5500] bg-[#FF5500]/20 shadow-[0_0_16px_rgba(255,85,0,0.4)]'
                        : 'text-[#1DB954] bg-[#1DB954]/20 shadow-[0_0_16px_rgba(29,185,84,0.4)]'
                      : 'text-white/60 hover:text-white bg-white/[0.08] hover:bg-white/15'
                  }`}
                  title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
                >
                  <Heart
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      isLiked ? (isSoundCloud ? 'fill-[#FF5500]' : 'fill-[#1DB954]') : ''
                    }`}
                  />
                </button>
              </div>
            );
          })()}

          {/* Timeline Scrubber (Clean, without Lossless badge) */}
          <div className="w-full space-y-1">
            <div className="relative group/scrub flex items-center py-1">
              <input
                type="range"
                min="0"
                max={durationMs || 180000}
                step="100"
                value={activeProgress}
                onChange={handleScrubberChange}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onMouseUp={handleScrubberCommit}
                onTouchEnd={handleScrubberCommit}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none accent-white cursor-pointer transition-all group-hover/scrub:h-2"
                style={{
                  background: `linear-gradient(to right, #ffffff ${progressRatio * 100}%, rgba(255,255,255,0.2) ${
                    progressRatio * 100
                  }%)`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono font-medium text-white/60 px-0.5">
              <span>{formatTime(activeProgress)}</span>
              <span>-{formatTime(remainingMs)}</span>
            </div>
          </div>

          {/* Unified Controls Row: [Mic2] [Shuffle] [Prev] [Play/Pause] [Next] [Repeat] [Queue] */}
          <div className="flex items-center justify-between mt-3 sm:mt-4 px-1">
            {/* 1. Karaoke Lyrics */}
            <button
              type="button"
              onClick={toggleLyrics}
              className={`p-2 sm:p-2.5 rounded-full border border-white/10 backdrop-blur-2xl transition-all cursor-pointer ${
                isLyricsOpen
                  ? isSoundCloud
                    ? 'bg-[#FF5500]/25 text-[#FF5500] shadow-[0_0_16px_rgba(255,85,0,0.35)]'
                    : 'bg-[#1DB954]/25 text-[#1DB954] shadow-[0_0_16px_rgba(29,185,84,0.35)]'
                  : 'bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/15'
              }`}
              title="Lyrics (Karaoke)"
            >
              <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* 2. Shuffle */}
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-2 sm:p-2.5 rounded-full transition-all cursor-pointer ${
                isShuffled
                  ? isSoundCloud
                    ? 'text-[#FF5500] bg-[#FF5500]/20'
                    : 'text-[#1DB954] bg-[#1DB954]/20'
                  : 'text-white/60 hover:text-white'
              }`}
              title={isShuffled ? 'Shuffle on' : 'Shuffle off'}
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* 3. Skip Back */}
            <button
              type="button"
              onClick={prevTrack}
              className="p-2 sm:p-2.5 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Previous track"
            >
              <SkipBack className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            </button>

            {/* 4. Big Play / Pause Circle (Apple Music hero button) */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-white text-black hover:scale-105 active:scale-95 shadow-[0_8px_30px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-7 sm:h-7 fill-black text-black" />
              ) : (
                <Play className="w-5 h-5 sm:w-7 sm:h-7 fill-black text-black translate-x-0.5" />
              )}
            </button>

            {/* 5. Skip Forward */}
            <button
              type="button"
              onClick={nextTrack}
              className="p-2 sm:p-2.5 text-white/80 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title="Next track"
            >
              <SkipForward className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            </button>

            {/* 6. Repeat */}
            <button
              type="button"
              onClick={toggleRepeat}
              className={`p-2 sm:p-2.5 rounded-full transition-all cursor-pointer relative ${
                repeatMode > 0
                  ? isSoundCloud
                    ? 'text-[#FF5500] bg-[#FF5500]/20'
                    : 'text-[#1DB954] bg-[#1DB954]/20'
                  : 'text-white/60 hover:text-white'
              }`}
              title={
                repeatMode === 2
                  ? 'Repeat one track'
                  : repeatMode === 1
                    ? 'Repeat queue'
                    : 'Repeat off'
              }
            >
              <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />
              {repeatMode === 2 && (
                <span
                  className={`absolute top-1 right-1 text-[8px] font-bold text-black w-3 h-3 rounded-full flex items-center justify-center ${
                    isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                  }`}
                >
                  1
                </span>
              )}
            </button>

            {/* 7. Queue Popover Button */}
            <div className="relative">
              <button
                type="button"
                data-queue-toggle="true"
                onClick={toggleQueue}
                className={`p-2 sm:p-2.5 rounded-full border border-white/10 backdrop-blur-2xl transition-all cursor-pointer ${
                  isQueueOpen
                    ? 'bg-white/25 text-white shadow-[0_0_16px_rgba(255,255,255,0.3)]'
                    : 'bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/15'
                }`}
                title="Playback queue"
              >
                <ListMusic className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Embedded Queue Popover with right alignment */}
              <SpotifyQueuePopover align="right" />
            </div>
          </div>

          {/* Volume Slider (Apple Music style, directly below controls - always visible in windowed and fullscreen) */}
          <div className="flex items-center gap-3 mt-4 sm:mt-5 px-3 pb-2">
            <button
              type="button"
              onClick={toggleMute}
              className="text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume1 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none accent-white cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${
                  (isMuted ? 0 : volume) * 100
                }%)`,
              }}
            />

            <button
              type="button"
              onClick={() => setVolume(1)}
              className="text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* Apple Liquid Glass Spotify Search Spotlight Modal */}
        <SpotifyLiquidSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </motion.div>
    </AnimatePresence>
  );
};
