import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Play, Pause, Music, MoreHorizontal } from 'lucide-react';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { TrackActionMenu } from './TrackActionMenu';
import type { MusicRecentlyPlayedItem } from '../model/types';
import { isSameTrackId } from '@/shared/lib/spotifyUrl';

interface MusicHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatTimeAgo = (timestamp?: number): string => {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const MusicHistoryDrawer: React.FC<MusicHistoryDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const recentlyPlayed = useMusicHubStore((s) => s.recentlyPlayed);
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const isPlaying = useSpotifyPlayerStore((s) => s.isPlaying);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const togglePlay = useSpotifyPlayerStore((s) => s.togglePlay);

  const [activeMenu, setActiveMenu] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
  } | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePlayItem = (item: MusicRecentlyPlayedItem) => {
    if (item.type === 'playlist') {
      navigate(`/music/playlist/${item.id}`);
      onClose();
      return;
    }

    const trackObj: SpotifyTrack = item.track || {
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

    if (currentTrack && isSameTrackId(currentTrack.id, trackObj.id)) {
      togglePlay();
    } else {
      playTrack(trackObj, undefined, 'Recently Played');
    }
  };

  const handleItemContextMenu = (e: React.MouseEvent, item: MusicRecentlyPlayedItem) => {
    e.preventDefault();
    e.stopPropagation();
    const trackObj: SpotifyTrack = item.track || {
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

    setActiveMenu({
      track: trackObj,
      rect: DOMRectReadOnly.fromRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 }),
    });
  };

  const handleMoreClick = (e: React.MouseEvent, item: MusicRecentlyPlayedItem) => {
    e.stopPropagation();
    const btnRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const trackObj: SpotifyTrack = item.track || {
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

    setActiveMenu({
      track: trackObj,
      rect: btnRect,
    });
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop with smooth fade in & fade out */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Slide-in drawer with smooth spring exit & enter */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative w-full max-w-sm h-full glass-panel border-l border-black/10 dark:border-white/10 p-5 shadow-2xl backdrop-blur-3xl flex flex-col text-gray-900 dark:text-white z-10 select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-black/10 dark:border-white/10 mb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-black/5 dark:border-white/5">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Recently Played
                    </h3>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Your recent listening history
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close history"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {recentlyPlayed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-56 text-center text-gray-500">
                    <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-center mb-3 text-gray-400">
                      <Music size={24} className="opacity-60" />
                    </div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      History is currently empty
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-[200px]">
                      Play a track and it will appear here
                    </p>
                  </div>
                ) : (
                  recentlyPlayed.map((item, idx) => {
                    const isCurrent = Boolean(
                      currentTrack && isSameTrackId(currentTrack.id, item.id),
                    );
                    const isThisPlaying = isCurrent && isPlaying;
                    const isSoundCloud = Boolean(
                      item.id.startsWith('sc-') || item.track?.source === 'soundcloud',
                    );

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => handlePlayItem(item)}
                        onContextMenu={(e) => handleItemContextMenu(e, item)}
                        className={`group relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                            : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Artwork with play button overlay */}
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/40 shadow">
                            {item.coverUrl ? (
                              <img
                                src={item.coverUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500 bg-purple-950/40">
                                <Music size={16} />
                              </div>
                            )}

                            <div
                              className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                                isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              {isThisPlaying ? (
                                <Pause size={14} className="text-white fill-white" />
                              ) : (
                                <Play size={14} className="text-white fill-white ml-0.5" />
                              )}
                            </div>
                          </div>

                          {/* Titles */}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-xs font-bold truncate transition-colors ${
                                isCurrent
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : 'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300'
                              }`}
                            >
                              {item.title}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1.5 mt-0.5">
                              <span className="truncate">
                                {item.type === 'playlist'
                                  ? 'Playlist'
                                  : item.artist || item.subtitle || 'Artist'}
                              </span>
                              <span className="opacity-40">•</span>
                              {isSoundCloud ? (
                                <span className="text-[#FF5500] text-[9px] font-semibold tracking-wide">
                                  SC
                                </span>
                              ) : (
                                <span className="text-[#1DB954] text-[9px] font-semibold tracking-wide">
                                  Spotify
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right: Timestamp and 3-dots */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                            {formatTimeAgo(item.playedAt)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleMoreClick(e, item)}
                            aria-label="Actions"
                            className="p-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-black/10 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Track Action Menu */}
      {activeMenu && (
        <TrackActionMenu
          isOpen={Boolean(activeMenu)}
          onClose={() => setActiveMenu(null)}
          anchorRect={activeMenu.rect}
          track={activeMenu.track}
        />
      )}
    </>
  );
};
