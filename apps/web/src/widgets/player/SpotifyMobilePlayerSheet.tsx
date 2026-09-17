import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  Mic2,
  ListMusic,
} from 'lucide-react';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { getSafeSpotifyTrackUrl, isSoundCloudUrl } from '@/shared/lib/spotifyUrl';

export const SpotifyMobilePlayerSheet: React.FC = () => {
  const isMobileExpanded = useSpotifyPlayerStore((s) => s.isMobileExpanded);
  const setMobileExpanded = useSpotifyPlayerStore((s) => s.setMobileExpanded);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const progressMs = useSpotifyPlayerStore((s) => s.progressMs);
  const durationMs = useSpotifyPlayerStore((s) => s.durationMs);
  const isLiked = useSpotifyPlayerStore((s) => s.isLiked);
  const repeatMode = useSpotifyPlayerStore((s) => s.repeatMode);
  const isShuffled = useSpotifyPlayerStore((s) => s.isShuffled);
  const volume = useSpotifyPlayerStore((s) => s.volume);
  const isMuted = useSpotifyPlayerStore((s) => s.isMuted);
  const isLyricsOpen = useSpotifyPlayerStore((s) => s.isLyricsOpen);

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

  if (!isMobileExpanded || !currentTrack) return null;

  const isSoundCloud = Boolean(
    (currentTrack as any)?.source === 'soundcloud' ||
    currentTrack?.id?.startsWith('sc-') ||
    currentTrack?.id?.startsWith('soundcloud-') ||
    isSoundCloudUrl(currentTrack?.spotifyUrl),
  );
  const externalTrackLink = isSoundCloud
    ? currentTrack?.spotifyUrl || 'https://soundcloud.com'
    : getSafeSpotifyTrackUrl(currentTrack);

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (progressMs / (durationMs || 1)) * 100));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed inset-0 z-50 flex flex-col justify-between p-6 select-none md:hidden overflow-y-auto"
        style={{
          background: 'rgba(12, 13, 18, 0.94)',
          backdropFilter: 'blur(50px) saturate(220%)',
          WebkitBackdropFilter: 'blur(50px) saturate(220%)',
        }}
      >
        {/* Ambient Color Reflection */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: isSoundCloud ? '#FF5500' : '#1DB954' }}
        />

        {/* Top Handle / Close Bar */}
        <div className="flex items-center justify-between pt-2 pb-4 shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => setMobileExpanded(false)}
            className="p-2 rounded-full bg-white/5 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              {currentTrack.contextName ||
                (isSoundCloud ? 'SoundCloud Playing' : 'Spotify Playing')}
            </span>
            <span className="text-xs font-semibold text-white">Apple Liquid Player</span>
          </div>

          <a
            href={externalTrackLink}
            target="_blank"
            rel="noreferrer"
            className={`p-2 rounded-full ${
              isSoundCloud
                ? 'bg-[#FF5500]/15 border border-[#FF5500]/30 text-[#FF5500]'
                : 'bg-[#1DB954]/15 border border-[#1DB954]/30 text-[#1DB954]'
            }`}
            title={isSoundCloud ? 'Open in SoundCloud' : 'Open in Spotify'}
          >
            {isSoundCloud ? <SoundCloudBrandIcon size={18} /> : <SpotifyBrandIcon size={18} />}
          </a>
        </div>

        {/* Center Artwork with Specular Border */}
        <div className="flex flex-col items-center justify-center my-auto py-4 relative z-10">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden shadow-2xl border border-white/20">
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>

        {/* Bottom Section: Info, Scrubber, Controls */}
        <div className="flex flex-col gap-5 pb-6 shrink-0 relative z-10">
          {/* Track Info & Like */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="text-xl font-bold text-white truncate">{currentTrack.title}</h2>
              <p className="text-sm text-gray-400 truncate mt-0.5">{currentTrack.artist}</p>
            </div>

            <button
              type="button"
              onClick={toggleLike}
              className={`p-3 rounded-full transition-transform active:scale-75 ${
                isLiked
                  ? isSoundCloud
                    ? 'text-[#FF5500]'
                    : 'text-[#1DB954]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart
                className={`w-7 h-7 ${
                  isLiked ? (isSoundCloud ? 'fill-[#FF5500]' : 'fill-[#1DB954]') : ''
                }`}
              />
            </button>
          </div>

          {/* Scrubber Slider */}
          <div className="flex flex-col gap-1.5">
            <div
              className="relative w-full h-2.5 bg-white/15 rounded-full cursor-pointer overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seek(pos * durationMs);
              }}
            >
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span>{formatTime(progressMs)}</span>
              <span>{formatTime(durationMs)}</span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex items-center justify-between px-2">
            {/* Shuffle */}
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-2 transition-colors ${
                isShuffled ? (isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]') : 'text-gray-400'
              }`}
            >
              <Shuffle className="w-5 h-5" />
            </button>

            {/* Prev */}
            <button
              type="button"
              onClick={prevTrack}
              className="p-2 text-white hover:opacity-80 active:scale-95 transition-transform"
            >
              <SkipBack className="w-8 h-8 fill-current" />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center active:scale-90 transition-transform shadow-xl"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 fill-black" />
              ) : (
                <Play className="w-8 h-8 fill-black ml-1" />
              )}
            </button>

            {/* Next */}
            <button
              type="button"
              onClick={nextTrack}
              className="p-2 text-white hover:opacity-80 active:scale-95 transition-transform"
            >
              <SkipForward className="w-8 h-8 fill-current" />
            </button>

            {/* Repeat (3-state) */}
            <button
              type="button"
              onClick={toggleRepeat}
              className={`relative p-2 transition-colors ${
                repeatMode > 0
                  ? isSoundCloud
                    ? 'text-[#FF5500]'
                    : 'text-[#1DB954]'
                  : 'text-gray-400'
              }`}
            >
              <Repeat className="w-5 h-5" />
              {repeatMode === 2 && (
                <span
                  className={`absolute -top-0.5 right-0.5 text-[9px] font-black text-black w-3 h-3 rounded-full flex items-center justify-center ${
                    isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                  }`}
                >
                  1
                </span>
              )}
            </button>
          </div>

          {/* Bottom Utilities: Lyrics, Volume, Queue */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 px-4">
            <button
              type="button"
              onClick={toggleLyrics}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-semibold border transition-all ${
                isLyricsOpen
                  ? isSoundCloud
                    ? 'bg-[#FF5500]/20 border-[#FF5500]/40 text-[#FF5500]'
                    : 'bg-[#1DB954]/20 border-[#1DB954]/40 text-[#1DB954]'
                  : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>Lyrics</span>
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-2 flex-1 max-w-[140px] mx-4">
              <button type="button" onClick={toggleMute} className="text-gray-400 hover:text-white">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className={`w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer ${
                  isSoundCloud ? 'accent-[#FF5500]' : 'accent-[#1DB954]'
                }`}
              />
            </div>

            <button
              type="button"
              onClick={toggleQueue}
              className="p-2 rounded-full bg-white/5 text-gray-300 hover:text-white border border-white/10"
              title="Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
