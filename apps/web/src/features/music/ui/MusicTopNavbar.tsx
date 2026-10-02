import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, Bell, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import Avatar from '@/shared/ui/Avatar';
import Tooltip from '@/shared/ui/Tooltip';
import { useMusicHubStore } from '../model/useMusicHubStore';
import { MusicHistoryDrawer } from './MusicHistoryDrawer';
import type { MusicCatalogSource } from '../model/types';
import { SpotifyBrandIcon, SoundCloudBrandIcon } from '@/shared/ui/BrandIcons';

const SpotifyHomeIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 22,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M13.5 1.515a3 3 0 0 0-3 0L3 5.845a2 2 0 0 0-1 1.732V21a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6h4v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7.577a2 2 0 0 0-1-1.732l-7.5-4.33z" />
  </svg>
);

interface MusicTopNavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeSource: MusicCatalogSource;
  onSourceChange: (source: MusicCatalogSource) => void;
}

export const MusicTopNavbar: React.FC<MusicTopNavbarProps> = ({
  searchQuery,
  onSearchChange,
  activeSource,
  onSourceChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentUser } = useCurrentUser();
  const setSelectedPlaylistId = useMusicHubStore((s) => s.setSelectedPlaylistId);

  const isLibraryFullWidth = useMusicHubStore((s) => s.isLibraryFullWidth);
  const setLibraryFullWidth = useMusicHubStore((s) => s.setLibraryFullWidth);

  const isContentFeedActive = Boolean(
    location.pathname.includes('/content-feed') || location.pathname.includes('/feed'),
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleHomeClick = () => {
    setSelectedPlaylistId(null);
    onSearchChange('');
    if (isLibraryFullWidth) {
      setLibraryFullWidth(false);
    }
    navigate('/music');
  };

  const handleProfileClick = () => {
    if (currentUser?.username) {
      navigate(`/${currentUser.username}`);
    } else {
      navigate('/profile');
    }
  };

  return (
    <>
      <header className="h-16 shrink-0 grid grid-cols-[1fr_auto_1fr] items-center px-6 glass-panel border-b border-black/10 dark:border-white/10 z-20 select-none">
        {/* Left: Navigation History (< and >) like Apple Music, Spotify & Discord */}
        <div className="justify-self-start flex items-center gap-1.5">
          <Tooltip label="Back" position="bottom">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] active:bg-black/[0.12] text-gray-700 hover:text-gray-950 dark:bg-white/[0.06] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.20] dark:text-gray-300 dark:hover:text-white border border-black/10 dark:border-white/10 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft size={16} />
            </button>
          </Tooltip>
          <Tooltip label="Forward" position="bottom">
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label="Forward"
              className="w-8 h-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] active:bg-black/[0.12] text-gray-700 hover:text-gray-950 dark:bg-white/[0.06] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.20] dark:text-gray-300 dark:hover:text-white border border-black/10 dark:border-white/10 backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <ChevronRight size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Center: Home Button + Global Pill Search Bar (Spotify layout, wide and centered in both directions) */}
        <div className="justify-self-center flex items-center gap-3 w-full max-w-[720px] xl:max-w-[820px] 2xl:max-w-[920px] justify-center px-2">
          {/* Home Button (Authentic Spotify filled house icon inside adaptive rounded circle) */}
          <Tooltip label="Home" position="bottom">
            <button
              type="button"
              onClick={handleHomeClick}
              aria-label="Home"
              className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center bg-black/[0.05] hover:bg-black/[0.10] text-gray-800 hover:text-gray-950 border border-black/10 dark:bg-white/[0.08] dark:hover:bg-white/[0.16] dark:text-white dark:border-white/15 backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_4px_16px_rgba(0,0,0,0.15)] cursor-pointer"
            >
              <SpotifyHomeIcon size={22} className="text-current" />
            </button>
          </Tooltip>

          {/* Global Pill Search Bar with SoundCloud & Spotify selector */}
          <div className="relative flex-1 flex items-center min-w-[380px] w-full">
            {/* Search Icon with Tooltip */}
            <div className="absolute left-4 z-10 flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">
              <Tooltip label="Search" position="bottom">
                <span className="flex items-center justify-center cursor-default">
                  <Search size={20} />
                </span>
              </Tooltip>
            </div>

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                onSearchChange(val);
                if (val.trim() && location.pathname !== '/music') {
                  navigate('/music');
                }
              }}
              placeholder="What do you want to play?"
              className="w-full h-12 pl-12 pr-32 rounded-full bg-black/[0.04] hover:bg-black/[0.08] border border-black/10 hover:border-black/20 text-sm text-gray-900 placeholder:text-gray-500 dark:bg-white/[0.06] dark:hover:bg-white/[0.10] dark:border-white/12 dark:hover:border-white/20 dark:text-white dark:placeholder:text-gray-400 backdrop-blur-2xl focus:outline-none focus:border-purple-500/50 dark:focus:border-white/30 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.15),inset_0_1px_1px_rgba(255,255,255,0.1)]"
            />

            {/* Right side controls: Clear X button + Divider + Source Logos */}
            <div className="absolute right-1.5 inset-y-1.5 flex items-center gap-1.5 z-10">
              {/* Clear Search Query button with Tooltip */}
              {searchQuery && (
                <Tooltip label="Clear search input" position="bottom">
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange('');
                      if (location.pathname !== '/music') {
                        navigate('/music');
                      }
                    }}
                    aria-label="Clear search input"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-black/5 dark:hover:text-white dark:hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </Tooltip>
              )}

              {/* Divider if clear button is visible */}
              {searchQuery && <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-0.5" />}

              {/* Source Switcher: SoundCloud & Spotify LOGOS ONLY with Tooltips */}
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/[0.08] p-0.5 rounded-full border border-black/10 dark:border-white/12 shadow-inner backdrop-blur-md">
                {/* SoundCloud Logo Only */}
                <Tooltip
                  label={
                    activeSource === 'soundcloud'
                      ? 'SoundCloud (active, click to reset)'
                      : 'SoundCloud'
                  }
                  position="bottom"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onSourceChange(activeSource === 'soundcloud' ? 'all' : 'soundcloud')
                    }
                    aria-label="SoundCloud"
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeSource === 'soundcloud'
                        ? 'bg-[#FF5500] text-white shadow-md shadow-[#FF5500]/40 scale-105 ring-1 ring-white/30'
                        : 'opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <SoundCloudBrandIcon size={14} />
                  </button>
                </Tooltip>

                {/* Spotify Logo Only */}
                <Tooltip
                  label={
                    activeSource === 'spotify' ? 'Spotify (active, click to reset)' : 'Spotify'
                  }
                  position="bottom"
                >
                  <button
                    type="button"
                    onClick={() => onSourceChange(activeSource === 'spotify' ? 'all' : 'spotify')}
                    aria-label="Spotify"
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeSource === 'spotify'
                        ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/40 scale-105 ring-1 ring-white/30'
                        : 'opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <SpotifyBrandIcon size={14} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Right Corner: What's new, History, Profile Avatar */}
        <div className="justify-self-end flex items-center gap-3">
          <Tooltip label="What's new?" position="bottom">
            <button
              type="button"
              onClick={() => {
                if (isContentFeedActive) {
                  navigate('/music');
                } else {
                  navigate('/music/content-feed');
                }
              }}
              aria-label="What's new?"
              className={`p-2 rounded-full transition-all cursor-pointer ${
                isContentFeedActive
                  ? 'bg-purple-600/25 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/40'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              <Bell
                size={18}
                className={
                  isContentFeedActive
                    ? 'fill-purple-600 dark:fill-purple-400 text-purple-600 dark:text-purple-400'
                    : ''
                }
              />
            </button>
          </Tooltip>

          <Tooltip label="Recently played" position="bottom">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              aria-label="Recently played"
              className="p-2 rounded-full text-gray-600 hover:text-gray-950 hover:bg-black/5 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Clock size={18} />
            </button>
          </Tooltip>

          {/* User Profile Avatar */}
          <Tooltip
            label={`Profile (${currentUser?.displayName || currentUser?.username || 'My Account'})`}
            position="bottom"
          >
            <button
              type="button"
              onClick={handleProfileClick}
              className="relative p-0.5 rounded-full border border-black/10 dark:border-white/10 hover:border-emerald-400/80 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Avatar src={currentUser?.avatar} size="sm" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#09090d]" />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Drawers */}
      <MusicHistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </>
  );
};
