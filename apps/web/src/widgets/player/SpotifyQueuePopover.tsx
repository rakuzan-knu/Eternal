import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Trash2, ListMusic, Music, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { SoundCloudBrandIcon, SpotifyBrandIcon } from '@/shared/ui/BrandIcons';
import { useSpotifyPlayerStore } from '@/shared/model/useSpotifyPlayerStore';
import { unescapeHtml, isSoundCloudUrl } from '@/shared/lib/spotifyUrl';

const DEFAULT_ARTWORK_FALLBACK =
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80';

export interface SpotifyQueuePopoverProps {
  align?: 'center' | 'right';
}

export const SpotifyQueuePopover: React.FC<SpotifyQueuePopoverProps> = ({ align = 'center' }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const isQueueOpen = useSpotifyPlayerStore((s) => s.isQueueOpen);
  const setQueueOpen = useSpotifyPlayerStore((s) => s.setQueueOpen);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const queue = useSpotifyPlayerStore((s) => s.queue);
  const history = useSpotifyPlayerStore((s) => s.history);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const removeFromQueue = useSpotifyPlayerStore((s) => s.removeFromQueue);
  const clearQueue = useSpotifyPlayerStore((s) => s.clearQueue);
  const setQueue = useSpotifyPlayerStore((s) => s.setQueue);
  const isLoadingQueue = useSpotifyPlayerStore((s) => s.isLoadingQueue);
  const queueSource = useSpotifyPlayerStore((s) => s.queueSource);
  const loadInfiniteAudioQueue = useSpotifyPlayerStore((s) => s.loadInfiniteAudioQueue);

  // Smooth dismiss on outside click / tap
  useEffect(() => {
    if (!isQueueOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Ignore clicks inside the popover itself
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }

      // Ignore clicks on any queue toggle trigger button
      if (target.closest('[data-queue-toggle="true"]')) {
        return;
      }

      setQueueOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDownOutside);
    };
  }, [isQueueOpen, setQueueOpen]);

  useEffect(() => {
    if (isQueueOpen && queue.length === 0 && !isLoadingQueue && currentTrack) {
      loadInfiniteAudioQueue();
    }
  }, [isQueueOpen, queue.length, isLoadingQueue, currentTrack, loadInfiniteAudioQueue]);

  const isSoundCloud = Boolean(
    currentTrack?.source === 'soundcloud' ||
    currentTrack?.id?.startsWith('sc-') ||
    currentTrack?.id?.startsWith('soundcloud-') ||
    isSoundCloudUrl(currentTrack?.spotifyUrl),
  );

  const displayedQueue = queue.slice(0, 10);
  const displayedHistory = history.slice(0, 5);

  const isRight = align === 'right';

  return (
    <AnimatePresence>
      {isQueueOpen && (
        <motion.div
          ref={popoverRef}
          key="spotify-queue-popover"
          data-testid="spotify-queue-popover"
          initial={{ opacity: 0, scale: 0.92, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
          exit={{
            opacity: 0,
            scale: 0.92,
            y: 14,
            filter: 'blur(6px)',
            transition: {
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
          transition={{
            type: 'spring',
            damping: 26,
            stiffness: 380,
            mass: 0.75,
          }}
          className={`absolute bottom-full mb-3.5 ${
            isRight ? 'right-0 sm:-right-2' : 'left-1/2 -translate-x-1/2'
          } w-[350px] sm:w-[380px] max-w-[calc(100vw-32px)] max-h-[500px] sm:max-h-[540px] rounded-[26px] p-4 flex flex-col z-50 select-none overflow-hidden`}
          style={{
            transformOrigin: isRight ? '90% 100%' : '50% 100%',
            background:
              'linear-gradient(145deg, rgba(22, 23, 32, 0.88) 0%, rgba(11, 12, 18, 0.94) 100%)',
            backdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%) brightness(106%)',
            border: 'none',
            boxShadow:
              'inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.45), inset 0 -1px 1.5px 0 rgba(255, 255, 255, 0.1), inset 0 0 12px 2px rgba(255, 255, 255, 0.04), 0 24px 48px -12px rgba(0, 0, 0, 0.75), 0 8px 16px -4px rgba(0, 0, 0, 0.5)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Liquid Top Reflection Accent */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

          {/* Visual downward anchor notch pointing towards Queue button */}
          <div
            className={`absolute -bottom-1.5 ${
              isRight ? 'right-4' : 'left-1/2 -translate-x-1/2'
            } w-3 h-3 bg-[#13141a] rotate-45 border-r border-b border-white/10 pointer-events-none`}
          />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ListMusic
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'
                }`}
              />
              <span className="text-xs font-bold text-white tracking-wide uppercase truncate">
                Queue
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Refresh / Next 10 Infinite Audio button */}
              <button
                type="button"
                onClick={() => loadInfiniteAudioQueue(true)}
                disabled={isLoadingQueue}
                className={`p-1.5 rounded-lg text-gray-400 ${
                  isSoundCloud ? 'hover:text-[#FF5500]' : 'hover:text-[#1DB954]'
                } hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50`}
                title="Refresh recommendations (next 10)"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isLoadingQueue
                      ? `animate-spin ${isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'}`
                      : ''
                  }`}
                />
              </button>

              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="text-[11px] font-semibold text-gray-400 hover:text-red-400 px-2 py-0.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  title="Clear queue"
                >
                  Clear
                </button>
              )}

              <button
                type="button"
                onClick={() => setQueueOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content Scrollable Container */}
          <div
            className="flex-1 overflow-y-auto space-y-4 pr-1 mt-3 custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.15) transparent',
            }}
          >
            {/* Currently Playing Track */}
            {currentTrack && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Now Playing
                </span>
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/[0.06] border border-white/10 shadow-xs">
                  <img
                    src={currentTrack.albumArt || DEFAULT_ARTWORK_FALLBACK}
                    alt={currentTrack.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        currentTrack.artistAvatar || DEFAULT_ARTWORK_FALLBACK;
                    }}
                    className="w-10 h-10 rounded-xl object-cover shadow-sm shrink-0 border border-white/10"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">
                      {unescapeHtml(currentTrack.title)}
                    </h5>
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
                      <p className="text-[11px] text-gray-300 truncate">
                        {unescapeHtml(currentTrack.artist)}
                      </p>
                    </div>
                  </div>
                  {/* Live equalizer bars */}
                  <div className="flex items-end gap-0.5 h-3.5 px-1 shrink-0" title="Playing">
                    <span
                      className={`w-0.5 rounded-full h-full animate-[liveEqualizer_0.9s_ease-in-out_infinite] ${
                        isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                      }`}
                    />
                    <span
                      className={`w-0.5 rounded-full h-full animate-[liveEqualizer_0.7s_ease-in-out_infinite] ${
                        isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                      }`}
                    />
                    <span
                      className={`w-0.5 rounded-full h-full animate-[liveEqualizer_1.1s_ease-in-out_infinite] ${
                        isSoundCloud ? 'bg-[#FF5500]' : 'bg-[#1DB954]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Up Next in Queue (Max 10) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Next up ({displayedQueue.length}
                  {queue.length > 10 ? ` of ${queue.length}` : ''})
                </span>
                {queueSource === 'playlist' && queue.length > 0 && (
                  <span className="text-[10px] font-medium text-gray-400">From playlist</span>
                )}
              </div>

              {isLoadingQueue && displayedQueue.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-gray-400 text-xs">
                  <Loader2
                    className={`w-5 h-5 animate-spin ${
                      isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'
                    }`}
                  />
                  <span>Loading Infinite Audio recommendations...</span>
                </div>
              ) : displayedQueue.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                  <Music className="w-5 h-5 text-gray-600" />
                  <span>Queue is empty</span>
                  <button
                    type="button"
                    onClick={() => loadInfiniteAudioQueue(false)}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                      isSoundCloud
                        ? 'bg-[#FF5500]/20 hover:bg-[#FF5500]/30 border-[#FF5500]/40 text-[#FF5500] hover:text-white'
                        : 'bg-[#1DB954]/20 hover:bg-[#1DB954]/30 border-[#1DB954]/40 text-[#1DB954] hover:text-white'
                    }`}
                  >
                    <Sparkles
                      className={`w-3 h-3 ${isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'}`}
                    />
                    Generate Infinite Audio
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayedQueue.map((track, idx) => {
                    const itemIsSoundCloud = Boolean(
                      track.source === 'soundcloud' ||
                      track.id?.startsWith('sc-') ||
                      track.id?.startsWith('soundcloud-') ||
                      isSoundCloudUrl(track.spotifyUrl),
                    );

                    return (
                      <div
                        key={`${track.id}-${idx}`}
                        className="group/item flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer border border-transparent hover:border-white/5"
                        onClick={() => {
                          const nextQueue = queue.slice(idx + 1);
                          playTrack(track, nextQueue);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-semibold text-gray-500 w-4 text-center shrink-0">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </span>
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5 group-hover/item:border-white/20">
                            <img
                              src={track.albumArt || DEFAULT_ARTWORK_FALLBACK}
                              alt={track.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  track.artistAvatar || DEFAULT_ARTWORK_FALLBACK;
                              }}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-200 group-hover/item:text-white truncate">
                              {unescapeHtml(track.title)}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                              {itemIsSoundCloud ? (
                                <span className="text-[#FF5500] shrink-0" title="SoundCloud">
                                  <SoundCloudBrandIcon size={10} />
                                </span>
                              ) : (
                                <span className="text-[#1DB954] shrink-0" title="Spotify">
                                  <SpotifyBrandIcon size={9} />
                                </span>
                              )}
                              <p className="text-[10.5px] text-gray-400 truncate">
                                {unescapeHtml(track.artist)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-0 group/del group-hover/item:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(idx);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Load Next 10 button (either advances playlist queue or fetches next infinite audio batch) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (queue.length > 10) {
                        setQueue(queue.slice(10), queueSource);
                      } else {
                        loadInfiniteAudioQueue(true);
                      }
                    }}
                    disabled={isLoadingQueue}
                    className="w-full mt-2 py-2 px-3 text-center text-[11px] font-semibold text-gray-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${
                        isLoadingQueue
                          ? `animate-spin ${isSoundCloud ? 'text-[#FF5500]' : 'text-[#1DB954]'}`
                          : 'text-gray-400'
                      }`}
                    />
                    <span>
                      {queue.length > 10
                        ? `Show next 10 (${queue.length - 10} more)`
                        : 'Load next 10 tracks'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Recently Played History (Max 5) */}
            {displayedHistory.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Recently Played ({displayedHistory.length})
                </span>
                <div className="space-y-1">
                  {displayedHistory.map((track, idx) => {
                    const itemIsSoundCloud = Boolean(
                      track.source === 'soundcloud' ||
                      track.id?.startsWith('sc-') ||
                      track.id?.startsWith('soundcloud-') ||
                      isSoundCloudUrl(track.spotifyUrl),
                    );

                    return (
                      <div
                        key={`hist-${track.id}-${idx}`}
                        className="group/hist flex items-center justify-between p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer border border-transparent hover:border-white/5 opacity-80 hover:opacity-100"
                        onClick={() => playTrack(track)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-white/5">
                            <img
                              src={track.albumArt || DEFAULT_ARTWORK_FALLBACK}
                              alt={track.title}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  track.artistAvatar || DEFAULT_ARTWORK_FALLBACK;
                              }}
                              className="w-full h-full object-cover grayscale group-hover/hist:grayscale-0 transition-all"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/hist:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-3 h-3 text-white fill-white" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-gray-300 group-hover/hist:text-white truncate">
                              {unescapeHtml(track.title)}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5 min-w-0">
                              {itemIsSoundCloud ? (
                                <span className="text-[#FF5500]/80 shrink-0" title="SoundCloud">
                                  <SoundCloudBrandIcon size={9} />
                                </span>
                              ) : (
                                <span className="text-[#1DB954]/80 shrink-0" title="Spotify">
                                  <SpotifyBrandIcon size={8} />
                                </span>
                              )}
                              <p className="text-[9.5px] text-gray-500 truncate">
                                {unescapeHtml(track.artist)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
