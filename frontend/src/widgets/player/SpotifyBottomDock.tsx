import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Volume1,
  Mic2,
  ListMusic,
  Gamepad2,
  X,
  Minus,
  ChevronUp,
  Radio,
} from 'lucide-react';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { MarqueeText } from '@/shared/ui/MarqueeText';
import { SpotifyQueuePopover } from './SpotifyQueuePopover';
import { JamRoomPopover } from './JamRoomPopover';
import { JamAutoplayBanner } from './JamAutoplayBanner';
import { useJamStore } from '@/features/music/model/useJamStore';
import { useJamSession } from '@/features/music/model/useJamSession';
import { usePlatformMusicPresence } from '@/features/music/model/usePlatformMusicPresence';
import { getSafeSpotifyTrackUrl, unescapeHtml, isSoundCloudUrl } from '@/shared/lib/spotifyUrl';

export const SpotifyBottomDock: React.FC = () => {
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isDockVisible = useSpotifyPlayerStore((s) => s.isDockVisible);
  const isDockMinimized = useSpotifyPlayerStore((s) => s.isDockMinimized);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const progressMs = useSpotifyPlayerStore((s) => s.progressMs);
  const durationMs = useSpotifyPlayerStore((s) => s.durationMs);
  const volume = useSpotifyPlayerStore((s) => s.volume);
  const isMuted = useSpotifyPlayerStore((s) => s.isMuted);
  const repeatMode = useSpotifyPlayerStore((s) => s.repeatMode);
  const isShuffled = useSpotifyPlayerStore((s) => s.isShuffled);
  const isLiked = useSpotifyPlayerStore((s) => s.isLiked);
  const isLyricsOpen = useSpotifyPlayerStore((s) => s.isLyricsOpen);
  const isQueueOpen = useSpotifyPlayerStore((s) => s.isQueueOpen);

  const isSoundCloud = Boolean(
    (currentTrack as any)?.source === 'soundcloud' ||
    currentTrack?.id?.startsWith('sc-') ||
    currentTrack?.id?.startsWith('soundcloud-') ||
    isSoundCloudUrl(currentTrack?.spotifyUrl),
  );
  const externalTrackLink = isSoundCloud
    ? currentTrack?.spotifyUrl || 'https://soundcloud.com'
    : getSafeSpotifyTrackUrl(currentTrack);
  const spotifyLink = externalTrackLink;
  const isVolumeOpen = useSpotifyPlayerStore((s) => s.isVolumeOpen);

  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);
  const seek = useSpotifyPlayerStore((s) => s.seek);
  const seekRelative = useSpotifyPlayerStore((s) => s.seekRelative);
  const prevTrack = useSpotifyPlayerStore((s) => s.prevTrack);
  const nextTrack = useSpotifyPlayerStore((s) => s.nextTrack);
  const toggleRepeat = useSpotifyPlayerStore((s) => s.toggleRepeat);
  const toggleShuffle = useSpotifyPlayerStore((s) => s.toggleShuffle);
  const toggleLike = useSpotifyPlayerStore((s) => s.toggleLike);
  const setVolume = useSpotifyPlayerStore((s) => s.setVolume);
  const toggleMute = useSpotifyPlayerStore((s) => s.toggleMute);
  const toggleLyrics = useSpotifyPlayerStore((s) => s.toggleLyrics);
  const toggleQueue = useSpotifyPlayerStore((s) => s.toggleQueue);
  const setVolumeOpen = useSpotifyPlayerStore((s) => s.setVolumeOpen);
  const setMobileExpanded = useSpotifyPlayerStore((s) => s.setMobileExpanded);
  const closeDock = useSpotifyPlayerStore((s) => s.closeDock);
  const toggleDockMinimized = useSpotifyPlayerStore((s) => s.toggleDockMinimized);
  const setDockMinimized = useSpotifyPlayerStore((s) => s.setDockMinimized);
  const isGameModeOpen = useSpotifyPlayerStore((s) => s.isGameModeOpen);
  const toggleGameMode = useSpotifyPlayerStore((s) => s.toggleGameMode);
  const needsSpotifyPermissions = useSpotifyPlayerStore((s) => s.needsSpotifyPermissions);
  const reauthorizeSpotify = useSpotifyPlayerStore((s) => s.reauthorizeSpotify);

  // Broadcast real-time platform music activity across network
  usePlatformMusicPresence();

  // Jam / Listen Along state & session hook
  const {
    isJamActive,
    isHost,
    hostUsername,
    isPausedLocally,
    handleLocalResume,
    handleLocalPause,
    emitManualHostSync,
    leaveJam,
  } = useJamSession();
  const isJamPopoverOpen = useJamStore((s) => s.isJamPopoverOpen);
  const toggleJamPopover = useJamStore((s) => s.toggleJamPopover);

  const volumeTimeoutRef = useRef<any>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isDockVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isEditable =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isEditable) return;

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (isJamActive && !isHost) {
          if (isPlaying) {
            handleLocalPause();
          } else {
            handleLocalResume();
          }
        } else {
          togglePlay();
          if (isHost) setTimeout(emitManualHostSync, 50);
        }
      }

      // Shift + Right Arrow: seek forward 5 seconds
      if (e.shiftKey && e.code === 'ArrowRight') {
        e.preventDefault();
        if (isJamActive && !isHost) return; // Prevent listener timeline scrubbing
        seekRelative(5);
        if (isHost) setTimeout(emitManualHostSync, 50);
      }

      // Shift + Left Arrow: seek backward 5 seconds
      if (e.shiftKey && e.code === 'ArrowLeft') {
        e.preventDefault();
        if (isJamActive && !isHost) return; // Prevent listener timeline scrubbing
        seekRelative(-5);
        if (isHost) setTimeout(emitManualHostSync, 50);
      }

      // M: Mute / Unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isDockVisible,
    togglePlay,
    seekRelative,
    toggleMute,
    isJamActive,
    isHost,
    isPlaying,
    handleLocalPause,
    handleLocalResume,
    emitManualHostSync,
  ]);

  if (!isDockVisible || !currentTrack) return null;

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (progressMs / (durationMs || 1)) * 100));

  const handleVolumeMouseEnter = () => {
    if (volumeTimeoutRef.current) clearTimeout(volumeTimeoutRef.current);
    setVolumeOpen(true);
  };

  const handleVolumeMouseLeave = () => {
    volumeTimeoutRef.current = setTimeout(() => {
      setVolumeOpen(false);
    }, 450);
  };

  return (
    <AnimatePresence initial={false}>
      {isDockMinimized ? (
        <motion.div
          key="spotify-dock-minimized"
          data-testid="spotify-dock-minimized"
          initial={{ y: 40, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          onClick={() => setDockMinimized(false)}
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 select-none cursor-pointer group"
          title="Expand player"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setDockMinimized(false);
            }
          }}
        >
          {/* Minimized Bottom Tab with Specular Liquid Glass Border */}
          <div
            className={`relative h-8 sm:h-9 px-3 flex items-center gap-2 rounded-t-2xl sm:rounded-t-[20px] border-t border-x border-white/20 min-w-[200px] max-w-[290px] sm:max-w-[380px] shadow-[0_-8px_24px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all duration-200 group-hover:bg-[#14151e]/95 ${
              isSoundCloud ? 'group-hover:border-[#FF5500]/60' : 'group-hover:border-emerald-500/50'
            }`}
            style={{
              background:
                'linear-gradient(135deg, rgba(22, 23, 31, 0.9) 0%, rgba(11, 12, 16, 0.96) 100%)',
              backdropFilter: 'blur(32px) saturate(210%) brightness(108%)',
              WebkitBackdropFilter: 'blur(32px) saturate(210%) brightness(108%)',
            }}
          >
            {/* Top Specular Reflection Highlight */}
            <div className="absolute inset-x-3 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none rounded-t-full" />

            {/* Left Indicator: Expand chevron + Equalizer bars / state dot */}
            <div
              className={`flex items-center gap-1.5 shrink-0 text-gray-300 transition-colors ${
                isSoundCloud ? 'group-hover:text-orange-400' : 'group-hover:text-emerald-400'
              }`}
            >
              <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
              {isPlaying ? (
                <div className="flex items-end gap-[2px] h-2.5 shrink-0" title="Playing">
                  <span
                    className={`w-[2px] h-2.5 rounded-full animate-equalizerBar ${
                      isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                    }`}
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className={`w-[2px] h-1.5 rounded-full animate-equalizerBar ${
                      isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                    }`}
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className={`w-[2px] h-2 rounded-full animate-equalizerBar ${
                      isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                    }`}
                    style={{ animationDelay: '400ms' }}
                  />
                </div>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" title="Paused" />
              )}
            </div>

            {/* Center: Track Title with Smooth Text Marquee & Edge Gradient Mask */}
            <div
              className="relative flex-1 min-w-0 overflow-hidden text-center px-1"
              style={{
                maskImage:
                  'linear-gradient(to right, transparent 0%, black 12px, black calc(100% - 12px), transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, black 12px, black calc(100% - 12px), transparent 100%)',
              }}
            >
              <MarqueeText
                text={
                  unescapeHtml(currentTrack.title) +
                  (currentTrack.artist ? ` • ${unescapeHtml(currentTrack.artist)}` : '')
                }
                align="center"
                className="text-[11px] sm:text-xs font-medium text-gray-200 group-hover:text-white transition-colors"
                containerClassName="w-full flex justify-center"
              />
            </div>

            {/* Right: Discreet Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeDock();
              }}
              className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Close player"
              aria-label="Close player"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="spotify-dock-full"
          data-testid="spotify-bottom-dock"
          initial={{ y: 130, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 130, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-[880px] xl:max-w-[940px] select-none"
          onClick={(e) => {
            // On mobile (<768px), tapping the bar expands full player sheet
            if (window.innerWidth < 768) {
              setMobileExpanded(true);
            }
          }}
        >
          {/* Apple Liquid Glass Container with bubble lens refraction border */}
          <div
            className="relative rounded-2xl sm:rounded-[26px] p-2.5 sm:px-4 sm:py-2.5 h-[64px] sm:h-[72px] flex items-center justify-between gap-3 sm:gap-4 overflow-visible"
            style={{
              background:
                'linear-gradient(135deg, rgba(24, 25, 34, 0.72) 0%, rgba(12, 13, 18, 0.82) 50%, rgba(18, 19, 26, 0.76) 100%)',
              backdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
              WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
              border: 'none',
              boxShadow:
                'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1.5px 0 rgba(255, 255, 255, 0.1), inset 0 0 12px 2px rgba(255, 255, 255, 0.04), 0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 8px 16px -4px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* 1-Click Spotify Premium Permissions Badge */}
            {needsSpotifyPermissions && !isSoundCloud && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  reauthorizeSpotify();
                }}
                className="absolute -top-11 left-1/2 -translate-x-1/2 bg-[#1DB954]/25 hover:bg-[#1DB954]/35 text-white text-[11px] font-medium px-3.5 py-1.5 rounded-full shadow-[0_12px_28px_rgba(0,0,0,0.6)] backdrop-blur-2xl border border-[#1DB954]/40 flex items-center gap-2 cursor-pointer z-30 transition-all select-none whitespace-nowrap group/perm hover:scale-105"
                title="Click to grant Spotify Web Playback SDK permission to play audio"
              >
                <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping shrink-0" />
                <span className="text-gray-200">Spotify Premium:</span>
                <span className="font-bold text-[#1DB954] group-hover/perm:underline flex items-center gap-1">
                  Confirm audio access in 1 click →
                </span>
              </div>
            )}

            {/* Subtle Chromatic & Specular Top Reflection Sweep */}
            <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none rounded-t-full" />
            <div className="absolute inset-x-12 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none rounded-b-full" />

            {/* Discreet Control Cluster at top-right edge: Minimize & Close */}
            <div className="absolute -top-3 -right-2 sm:-top-2.5 sm:-right-2 flex items-center gap-1.5 z-20">
              {/* Minimize button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDockMinimized();
                }}
                className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-gray-300 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer group"
                title="Minimize player"
                aria-label="Minimize player"
              >
                <Minus className="w-3 h-3 group-hover:scale-110 transition-transform" />
              </button>

              {/* Close button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeDock();
                }}
                className="w-6 h-6 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-gray-300 hover:text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer group"
                title="Close player"
                aria-label="Close player"
              >
                <X className="w-3 h-3 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* =========================================================================
              LEFT CLUSTER: Album Cover, Title & Artist, Interactive Heart (Spotify Like)
             ========================================================================= */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 max-w-[200px] sm:max-w-[230px] md:max-w-[260px] shrink-0">
              {/* Thumbnail with subtle glass depth shadow */}
              <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] group/art">
                <img
                  src={currentTrack.albumArt}
                  alt={currentTrack.title}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      currentTrack.artistAvatar ||
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';
                  }}
                  className="w-full h-full object-cover group-hover/art:scale-105 transition-transform duration-300"
                />
                <a
                  href={externalTrackLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/art:opacity-100 flex items-center justify-center transition-opacity"
                  title={isSoundCloud ? 'Open in SoundCloud' : 'Open in Spotify'}
                >
                  {isSoundCloud ? (
                    <SoundCloudBrandIcon size={18} />
                  ) : (
                    <SpotifyBrandIcon size={16} />
                  )}
                </a>
              </div>

              {/* Song title & Artist */}
              <div className="flex flex-col min-w-0 justify-center">
                <a
                  href={externalTrackLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`text-xs sm:text-[13px] font-bold text-white truncate hover:underline transition-colors ${
                    isSoundCloud ? 'hover:text-[#FF5500]' : 'hover:text-[#1DB954]'
                  }`}
                  title={unescapeHtml(currentTrack.title)}
                >
                  {unescapeHtml(currentTrack.title)}
                </a>
                <span
                  className="text-[10.5px] sm:text-[11.5px] text-gray-400 truncate mt-0.5 font-medium"
                  title={unescapeHtml(currentTrack.artist)}
                >
                  {unescapeHtml(currentTrack.artist)}
                </span>
              </div>

              {/* Like Heart Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike();
                }}
                className={`p-1.5 rounded-full transition-all cursor-pointer shrink-0 active:scale-75 ${
                  isLiked ? 'text-[#1DB954] hover:text-[#1ed760]' : 'text-gray-400 hover:text-white'
                }`}
                title={isLiked ? 'Remove from Liked' : 'Save to Liked Songs'}
              >
                <Heart
                  className={`w-4 h-4 transition-all ${
                    isLiked ? 'fill-[#1DB954] scale-110' : 'hover:scale-110'
                  }`}
                />
              </button>
            </div>

            {/* =========================================================================
              CENTER CLUSTER: Spotify Controls Row & Draggable Scrubber Slider
             ========================================================================= */}
            <div
              className="flex flex-col items-center justify-center flex-1 max-w-[430px] min-w-0 px-1 sm:px-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Listener Catch-Up Banner (when paused locally) */}
              {isJamActive && !isHost && isPausedLocally && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  onClick={handleLocalResume}
                  className="mb-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all cursor-pointer active:scale-95"
                  title="Click to sync with host"
                >
                  <Play size={10} className="fill-amber-300" />
                  <span>You are behind live audio — Click Play to catch up</span>
                </motion.button>
              )}

              {/* Listener In-Sync Badge */}
              {isJamActive && !isHost && !isPausedLocally && (
                <div className="mb-1 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-medium flex items-center gap-1.5 shadow-[0_0_8px_rgba(168,85,247,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="truncate max-w-[200px]">
                    Synced with @{hostUsername || 'host'}
                  </span>
                  <button
                    type="button"
                    onClick={leaveJam}
                    className="ml-1 p-0.5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Leave Jam"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* Controls Row */}
              <div className="flex items-center gap-3 sm:gap-4.5 mb-1 sm:mb-1.5">
                {/* 1. Shuffle */}
                <button
                  type="button"
                  onClick={toggleShuffle}
                  disabled={isJamActive && !isHost}
                  className={`p-1 rounded-full transition-colors relative ${
                    isJamActive && !isHost
                      ? 'text-gray-600 opacity-40 cursor-not-allowed'
                      : isShuffled
                        ? isSoundCloud
                          ? 'text-[#FF5500] cursor-pointer'
                          : 'text-[#1DB954] cursor-pointer'
                        : 'text-gray-400 hover:text-white cursor-pointer'
                  }`}
                  title={
                    isJamActive && !isHost
                      ? `Controlled by @${hostUsername || 'host'}`
                      : 'Shuffle tracks'
                  }
                >
                  <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {isShuffled && (
                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                      }`}
                    />
                  )}
                </button>

                {/* 2. Previous Track */}
                <button
                  type="button"
                  onClick={() => {
                    if (isJamActive && !isHost) return;
                    prevTrack();
                    if (isHost) setTimeout(emitManualHostSync, 50);
                  }}
                  disabled={isJamActive && !isHost}
                  className={`p-1 transition-all ${
                    isJamActive && !isHost
                      ? 'text-gray-600 opacity-40 cursor-not-allowed'
                      : 'text-gray-300 hover:text-white active:scale-95 cursor-pointer'
                  }`}
                  title={
                    isJamActive && !isHost
                      ? `Controlled by @${hostUsername || 'host'}`
                      : 'Previous / Restart'
                  }
                >
                  <SkipBack className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
                </button>

                {/* 3. Play / Pause Button - Apple Liquid Glass Lens Circle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isJamActive && !isHost) {
                      if (isPlaying) {
                        handleLocalPause();
                      } else {
                        handleLocalResume();
                      }
                      return;
                    }
                    togglePlay();
                    if (isHost) setTimeout(emitManualHostSync, 50);
                  }}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.14] hover:bg-white/[0.24] text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.5),inset_0_-1px_1px_rgba(255,255,255,0.1),0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                  title={
                    isJamActive && !isHost
                      ? isPlaying
                        ? 'Pause locally'
                        : 'Resume & sync with host'
                      : isPlaying
                        ? 'Pause'
                        : 'Play'
                  }
                >
                  {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white" />
                  ) : (
                    <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white text-white ml-0.5" />
                  )}
                </button>

                {/* 4. Next Track */}
                <button
                  type="button"
                  onClick={() => {
                    if (isJamActive && !isHost) return;
                    nextTrack();
                    if (isHost) setTimeout(emitManualHostSync, 50);
                  }}
                  disabled={isJamActive && !isHost}
                  className={`p-1 transition-all ${
                    isJamActive && !isHost
                      ? 'text-gray-600 opacity-40 cursor-not-allowed'
                      : 'text-gray-300 hover:text-white active:scale-95 cursor-pointer'
                  }`}
                  title={
                    isJamActive && !isHost
                      ? `Controlled by @${hostUsername || 'host'}`
                      : 'Next track'
                  }
                >
                  <SkipForward className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-current" />
                </button>

                {/* 5. Repeat Button */}
                <button
                  type="button"
                  onClick={toggleRepeat}
                  disabled={isJamActive && !isHost}
                  className={`p-1 rounded-full transition-colors relative ${
                    isJamActive && !isHost
                      ? 'text-gray-600 opacity-40 cursor-not-allowed'
                      : repeatMode > 0
                        ? isSoundCloud
                          ? 'text-[#FF5500] cursor-pointer'
                          : 'text-[#1DB954] cursor-pointer'
                        : 'text-gray-400 hover:text-white cursor-pointer'
                  }`}
                  title={
                    isJamActive && !isHost
                      ? `Controlled by @${hostUsername || 'host'}`
                      : repeatMode === 2
                        ? 'Repeat one track (loop)'
                        : repeatMode === 1
                          ? 'Repeat queue'
                          : 'Repeat off'
                  }
                >
                  <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {repeatMode === 1 && (
                    <span
                      className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                      }`}
                    />
                  )}
                  {repeatMode === 2 && (
                    <span
                      className={`absolute -top-1 -right-1 text-[8.5px] font-black text-black w-2.5 h-2.5 rounded-full flex items-center justify-center leading-none ${
                        isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                      }`}
                    >
                      1
                    </span>
                  )}
                </button>
              </div>

              {/* Scrubber Progress Bar Row with Apple Glass Thumb Knob */}
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] font-mono text-gray-400 w-8 text-right shrink-0">
                  {formatTime(progressMs)}
                </span>

                <div
                  className={`relative flex-1 h-2 flex items-center ${
                    isJamActive && !isHost
                      ? 'cursor-not-allowed opacity-80'
                      : 'cursor-pointer group/scrubber'
                  }`}
                  title={
                    isJamActive && !isHost
                      ? `Timeline controlled by @${hostUsername || 'host'}`
                      : undefined
                  }
                  onClick={(e) => {
                    if (isJamActive && !isHost) return; // Rubber-Banding protection
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    seek(pos * durationMs);
                    if (isHost) emitManualHostSync();
                  }}
                >
                  {/* Background track */}
                  <div className="w-full h-1 sm:h-1.5 bg-white/15 rounded-full overflow-hidden relative">
                    {/* Track filled bar */}
                    <div
                      className={`h-full bg-white rounded-full transition-all duration-150 ${
                        isSoundCloud
                          ? 'group-hover/scrubber:bg-[#FF5500]'
                          : 'group-hover/scrubber:bg-[#1DB954]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Apple Glass Thumb Knob */}
                  <span
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.5)] transition-transform group-hover/scrubber:scale-125 pointer-events-none"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>

                <span className="text-[10px] font-mono text-gray-400 w-8 shrink-0">
                  {formatTime(durationMs)}
                </span>
              </div>
            </div>

            {/* =========================================================================
              RIGHT CLUSTER: Equalizer Waveform, Lyrics, Queue, Volume, Gamepad, Spotify
             ========================================================================= */}
            <div
              className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated Waveform Bars (Apple Style Visualizer) */}
              <div
                className="hidden lg:flex items-end gap-0.5 h-4 w-5 px-0.5 mr-1"
                title={isPlaying ? 'Music playing' : 'Paused'}
              >
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                  } ${
                    isPlaying ? 'h-full animate-[liveEqualizer_0.9s_ease-in-out_infinite]' : 'h-1.5'
                  }`}
                  style={{ transformOrigin: 'bottom', animationDelay: '0s' }}
                />
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                  } ${
                    isPlaying ? 'h-full animate-[liveEqualizer_0.75s_ease-in-out_infinite]' : 'h-3'
                  }`}
                  style={{ transformOrigin: 'bottom', animationDelay: '-0.25s' }}
                />
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                  } ${
                    isPlaying ? 'h-full animate-[liveEqualizer_1.1s_ease-in-out_infinite]' : 'h-2'
                  }`}
                  style={{ transformOrigin: 'bottom', animationDelay: '-0.1s' }}
                />
                <span
                  className={`w-0.5 rounded-full transition-all ${
                    isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                  } ${
                    isPlaying ? 'h-full animate-[liveEqualizer_0.8s_ease-in-out_infinite]' : 'h-1'
                  }`}
                  style={{ transformOrigin: 'bottom', animationDelay: '-0.4s' }}
                />
              </div>

              {/* 6. Lyrics Karaoke Button */}
              <button
                type="button"
                onClick={toggleLyrics}
                className={`p-1.5 rounded-xl transition-all cursor-pointer relative ${
                  isLyricsOpen
                    ? isSoundCloud
                      ? 'bg-[#FF5500]/20 text-[#FF5500] shadow-[0_0_12px_rgba(255,85,0,0.3)]'
                      : 'bg-[#1DB954]/20 text-[#1DB954] shadow-[0_0_12px_rgba(29,185,84,0.3)]'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Lyrics (Karaoke)"
              >
                <Mic2 className="w-4 h-4" />
              </button>

              {/* 7. Queue Popover Button */}
              <div className="relative">
                <button
                  type="button"
                  data-queue-toggle="true"
                  onClick={toggleQueue}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                    isQueueOpen
                      ? isSoundCloud
                        ? 'bg-[#FF5500]/20 text-[#FF5500] shadow-[0_0_12px_rgba(255,85,0,0.3)]'
                        : 'bg-[#1DB954]/20 text-[#1DB954] shadow-[0_0_12px_rgba(29,185,84,0.3)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Playback queue"
                >
                  <ListMusic className="w-4 h-4" />
                </button>

                {/* Liquid Glass Queue Popover */}
                <SpotifyQueuePopover />
              </div>

              {/* 8. Speaker & Volume Hover Slider */}
              <div
                className="relative hidden sm:block"
                onMouseEnter={handleVolumeMouseEnter}
                onMouseLeave={handleVolumeMouseLeave}
              >
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                {/* Liquid Glass Floating Volume Slider Popover */}
                <AnimatePresence>
                  {isVolumeOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.18 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-2.5 rounded-2xl flex items-center gap-2.5 z-50 shadow-xl"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(24, 25, 34, 0.82) 0%, rgba(13, 14, 20, 0.88) 100%)',
                        backdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
                        border: 'none',
                        boxShadow:
                          'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1.5px 0 rgba(255, 255, 255, 0.1), inset 0 0 12px 2px rgba(255, 255, 255, 0.04), 0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 8px 16px -4px rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className={`w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer ${
                          isSoundCloud ? 'accent-[#FF5500]' : 'accent-[#1DB954]'
                        }`}
                      />
                      <span className="text-[10px] font-mono text-gray-300 w-7 text-right">
                        {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 9. Gamepad Mode Button */}
              <button
                type="button"
                data-testid="spotify-game-mode-button"
                onClick={toggleGameMode}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  isGameModeOpen
                    ? isSoundCloud
                      ? 'bg-[#FF5500]/25 text-[#FF5500] shadow-[0_0_12px_rgba(255,85,0,0.4)]'
                      : 'bg-[#1DB954]/25 text-[#1DB954] shadow-[0_0_12px_rgba(29,185,84,0.4)]'
                    : isSoundCloud
                      ? 'text-gray-400 hover:text-[#FF5500] hover:bg-white/10'
                      : 'text-gray-400 hover:text-[#1DB954] hover:bg-white/10'
                }`}
                title={isGameModeOpen ? 'Exit Game Mode' : 'Open Game Mode'}
              >
                <Gamepad2 className="w-4 h-4" />
              </button>

              {/* 10. Jam Session Button */}
              <div className="relative">
                <button
                  type="button"
                  data-jam-toggle="true"
                  onClick={toggleJamPopover}
                  className={`p-1.5 rounded-xl transition-all cursor-pointer relative ${
                    isJamPopoverOpen || isJamActive
                      ? 'bg-purple-500/25 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                      : 'text-gray-400 hover:text-purple-400 hover:bg-white/10'
                  }`}
                  title={isJamActive ? 'Manage Jam' : 'Listen Together'}
                >
                  <Radio
                    className={`w-4 h-4 ${isJamActive ? 'animate-pulse text-purple-400' : ''}`}
                  />
                  {isJamActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-500 ring-2 ring-[#121316] animate-ping" />
                  )}
                </button>

                {/* Liquid Glass Jam Popover */}
                <JamRoomPopover align="right" />
              </div>

              {/* Dynamic Branding Badge: SoundCloud vs Spotify */}
              {isSoundCloud ? (
                <a
                  href={externalTrackLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#FF5500]/15 hover:bg-[#FF5500]/25 text-[#FF5500] text-[10.5px] font-bold border border-[#FF5500]/30 transition-all cursor-pointer shadow-xs ml-1"
                  title="Listen on SoundCloud"
                >
                  <SoundCloudBrandIcon size={13} />
                  <span className="hidden xl:inline">SoundCloud</span>
                </a>
              ) : (
                <a
                  href={externalTrackLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#1DB954]/15 hover:bg-[#1DB954]/25 text-[#1DB954] text-[10.5px] font-bold border border-[#1DB954]/30 transition-all cursor-pointer shadow-xs ml-1"
                  title="Listen on Spotify"
                >
                  <SpotifyBrandIcon size={13} />
                  <span className="hidden xl:inline">Spotify</span>
                </a>
              )}
            </div>
          </div>

          {/* Autoplay Rejection Recovery Banner */}
          <JamAutoplayBanner />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
