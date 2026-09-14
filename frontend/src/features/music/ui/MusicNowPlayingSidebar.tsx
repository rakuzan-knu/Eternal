import React, { useState, useRef } from 'react';
import {
  X,
  Music,
  ExternalLink,
  Heart,
  ChevronLeft,
  PanelRightClose,
  MoreHorizontal,
} from 'lucide-react';
import Tooltip from '@/shared/ui/Tooltip';
import { useSpotifyPlayerStore, type SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';
import { getSafeSpotifyTrackUrl, isSoundCloudUrl } from '@/shared/lib/spotifyUrl';
import { useMusicPanelResizer } from '../model/useMusicPanelResizer';
import { TrackActionMenu } from './TrackActionMenu';

export const MusicNowPlayingSidebar: React.FC = () => {
  const currentTrack = useSpotifyPlayerStore((s) => s.currentTrack);
  const queue = useSpotifyPlayerStore((s) => s.queue);
  const playTrack = useSpotifyPlayerStore((s) => s.playTrack);
  const toggleQueue = useSpotifyPlayerStore((s) => s.toggleQueue);
  const isLiked = useSpotifyPlayerStore((s) => s.isLiked);
  const toggleLike = useSpotifyPlayerStore((s) => s.toggleLike);

  const isNowPlayingPanelOpen = useMusicHubStore((s) => s.isNowPlayingPanelOpen);
  const setNowPlayingPanelOpen = useMusicHubStore((s) => s.setNowPlayingPanelOpen);

  const [isHovered, setIsHovered] = useState(false);
  const threeDotsButtonRef = useRef<HTMLButtonElement>(null);

  // Context Menu State
  const [activeMenuState, setActiveMenuState] = useState<{
    track: SpotifyTrack;
    rect: DOMRect;
    triggerRef?: React.RefObject<HTMLElement | null>;
  } | null>(null);

  // Resizer: width ranges from 240px to 340px (default 290px, ~290 ± 50px)
  const {
    width: nowPlayingWidth,
    isResizing: isNowPlayingResizing,
    isHandleHovered: isNowPlayingHandleHovered,
    setIsHandleHovered: setIsNowPlayingHandleHovered,
    handleResizeStart: handleNowPlayingResizeStart,
  } = useMusicPanelResizer({
    min: 240,
    max: 340,
    defaultWidth: 290,
    direction: 'left',
    storageKey: 'eternal_music_now_playing_width',
  });

  if (!currentTrack) return null;

  const isSoundCloud = Boolean(
    currentTrack.source === 'soundcloud' ||
    currentTrack.id.startsWith('sc-') ||
    currentTrack.id.startsWith('soundcloud-') ||
    isSoundCloudUrl(currentTrack.spotifyUrl),
  );

  const externalLink = isSoundCloud
    ? currentTrack.spotifyUrl || 'https://soundcloud.com'
    : getSafeSpotifyTrackUrl(currentTrack);

  const nextTrack = queue.length > 0 ? queue[0] : null;

  // Handler for context menu via 3-dots button
  const handleThreeDotsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!threeDotsButtonRef.current) return;
    const rect = threeDotsButtonRef.current.getBoundingClientRect();
    setActiveMenuState({
      track: currentTrack,
      rect,
      triggerRef: threeDotsButtonRef,
    });
  };

  // Handler for right-click context menu on artwork or title
  const handleTrackContextMenu = (
    e: React.MouseEvent,
    targetTrack: SpotifyTrack = currentTrack,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = new DOMRect(e.clientX, e.clientY, 0, 0);
    setActiveMenuState({
      track: targetTrack,
      rect,
    });
  };

  const handlePlayNext = () => {
    if (!nextTrack) return;
    playTrack(nextTrack, queue.slice(1), undefined, true);
  };

  return (
    <>
      <aside
        data-testid={
          isNowPlayingPanelOpen ? 'music-now-playing-sidebar' : 'music-now-playing-collapsed-tab'
        }
        onClick={() => {
          if (!isNowPlayingPanelOpen) {
            setNowPlayingPanelOpen(true);
          }
        }}
        style={{
          width: isNowPlayingPanelOpen ? nowPlayingWidth : 20,
          transition: isNowPlayingResizing ? 'none' : 'width 300ms cubic-bezier(0.16,1,0.3,1)',
          cursor: isNowPlayingPanelOpen ? 'default' : 'pointer',
        }}
        className="hidden xl:flex h-full flex-shrink-0 flex-col bg-[#111116]/85 backdrop-blur-2xl border-l border-white/5 select-none z-10 relative overflow-hidden"
      >
        {/* Closed State Tab (narrow 20px strip with centered chevron, Screenshot 3) */}
        <div
          onClick={() => setNowPlayingPanelOpen(true)}
          className={`w-full h-full flex flex-col items-center justify-center hover:bg-[#16161d] transition-opacity duration-300 cursor-pointer group select-none ${
            isNowPlayingPanelOpen ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'
          }`}
          title="Expand Now Playing panel"
          aria-label="Expand Now Playing panel"
        >
          <button
            type="button"
            aria-label="Expand Now Playing panel"
            className="w-full h-16 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft
              size={16}
              className="group-hover:-translate-x-0.5 transition-transform duration-200"
            />
          </button>
        </div>

        {/* Expanded Panel Content: smooth slide and fade, fixed width to prevent text wrapping during slide */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ width: nowPlayingWidth }}
          className={`h-full flex flex-col p-4 pb-4 overflow-y-auto custom-scrollbar relative flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isNowPlayingPanelOpen
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
        >
          {/* Resizer Handle on Left Border (cursor: col-resize with thin white line on hover) */}
          <div
            data-testid="now-playing-resizer-handle"
            onMouseDown={handleNowPlayingResizeStart}
            onMouseEnter={() => setIsNowPlayingHandleHovered(true)}
            onMouseLeave={() => setIsNowPlayingHandleHovered(false)}
            className="absolute top-0 left-0 h-full w-2 flex items-center justify-center z-30"
            style={{ cursor: 'col-resize' }}
          >
            <div
              className={`h-full w-px transition-colors duration-150 ${
                isNowPlayingHandleHovered || isNowPlayingResizing ? 'bg-white' : 'bg-transparent'
              }`}
            />
          </div>

          {/* Header Row with Smooth Slide-in Collapse Button and 3-Dots */}
          <div className="flex items-center justify-between mb-4 relative min-h-[32px]">
            {/* Left: Collapse Button + Title (Title smoothly shifts right when button appears) */}
            <div className="flex items-center min-w-0 flex-1 overflow-hidden">
              <div
                className={`flex items-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isHovered
                    ? 'w-7 opacity-100 mr-2 translate-x-0'
                    : 'w-0 opacity-0 mr-0 -translate-x-3 pointer-events-none'
                }`}
              >
                <Tooltip label="Hide Now Playing panel" position="bottom">
                  <button
                    type="button"
                    data-testid="now-playing-collapse-btn"
                    onClick={() => setNowPlayingPanelOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Hide Now Playing panel"
                  >
                    <PanelRightClose size={18} />
                  </button>
                </Tooltip>
              </div>

              <h3 className="text-sm font-bold text-white tracking-tight truncate transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                Now Playing
              </h3>
            </div>

            {/* Right Action Cluster: Animated 3-Dots + Close X */}
            <div className="flex items-center gap-1 shrink-0">
              <div
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isHovered
                    ? 'w-7 opacity-100 mr-0.5 scale-100'
                    : 'w-0 opacity-0 mr-0 scale-90 pointer-events-none'
                }`}
              >
                <Tooltip label="More actions" position="bottom">
                  <button
                    ref={threeDotsButtonRef}
                    type="button"
                    data-menu-trigger="true"
                    data-testid="now-playing-threedots-btn"
                    onClick={handleThreeDotsClick}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="More actions"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </Tooltip>
              </div>

              <button
                type="button"
                onClick={() => setNowPlayingPanelOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Large Album Artwork (Right-click opens Context Menu) */}
          <div
            onContextMenu={(e) => handleTrackContextMenu(e, currentTrack)}
            className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-4 group bg-black/40 cursor-pointer"
            title="Right-click for options"
          >
            {currentTrack.albumArt ? (
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Music size={48} />
              </div>
            )}

            {/* Ambient Backglow */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none blur-xl"
              style={{
                backgroundColor: isSoundCloud ? '#FF5500' : '#1DB954',
              }}
            />
          </div>

          {/* Track Info (Green checkmark removed per user instruction) */}
          <div className="flex items-start justify-between gap-2 mb-4">
            <div
              onContextMenu={(e) => handleTrackContextMenu(e, currentTrack)}
              className="min-w-0 cursor-pointer group/title"
              title="Right-click for options"
            >
              <h2 className="text-base font-black text-white truncate leading-tight group-hover/title:underline">
                {currentTrack.title}
              </h2>
              <p className="text-xs text-gray-400 truncate mt-0.5">{currentTrack.artist}</p>
            </div>

            {/* Like Heart Button */}
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <button
                type="button"
                onClick={toggleLike}
                className={`p-1 rounded-full hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                  isLiked ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
                }`}
                title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
              >
                <Heart size={18} className={isLiked ? 'fill-emerald-400' : ''} />
              </button>
            </div>
          </div>

          {/* Track Details / Credits Card */}
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 space-y-3 text-xs mb-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="font-bold text-gray-400">Credits</span>
              <a
                href={externalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
              >
                <span>Open</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-gray-400">
                <span>Source</span>
                <span className="font-bold text-white flex items-center gap-1">
                  {isSoundCloud ? (
                    <>
                      <SoundCloudBrandIcon size={12} />
                      SoundCloud
                    </>
                  ) : (
                    <>
                      <SpotifyBrandIcon size={12} />
                      Spotify
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-gray-400">
                <span>Artist</span>
                <span className="text-white truncate max-w-[140px] font-medium">
                  {currentTrack.artist}
                </span>
              </div>

              {currentTrack.contextName && (
                <div className="flex items-center justify-between text-gray-400">
                  <span>Context</span>
                  <span className="text-white truncate max-w-[140px] font-medium">
                    {currentTrack.contextName}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Next in Queue Card */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/5 p-3.5 select-none mt-auto">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-white tracking-tight">Next in Queue</h4>
              <button
                type="button"
                onClick={toggleQueue}
                className="text-[11px] font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer hover:underline"
              >
                Open Queue
              </button>
            </div>

            {nextTrack ? (
              <div
                onClick={handlePlayNext}
                onContextMenu={(e) => handleTrackContextMenu(e, nextTrack)}
                className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group/next"
                title={`Play: ${nextTrack.title} — ${nextTrack.artist}`}
              >
                <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-md">
                  {nextTrack.albumArt ? (
                    <img
                      src={nextTrack.albumArt}
                      alt={nextTrack.title}
                      className="w-full h-full object-cover group-hover/next:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Music size={16} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate group-hover/next:underline leading-snug">
                    {nextTrack.title}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{nextTrack.artist}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1.5 text-[11px] text-gray-400">
                <span>Playback queue is empty</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Track Action Menu Portal */}
      {activeMenuState && (
        <TrackActionMenu
          isOpen={Boolean(activeMenuState)}
          onClose={() => setActiveMenuState(null)}
          anchorRect={activeMenuState.rect}
          track={activeMenuState.track}
          triggerRef={activeMenuState.triggerRef}
        />
      )}
    </>
  );
};
