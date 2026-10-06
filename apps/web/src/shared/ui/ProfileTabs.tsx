import React from 'react';
import { Bookmark, Film, Grid, Repeat } from 'lucide-react';

export type ProfileTabType = 'posts' | 'reposts' | 'reels' | 'saved';

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  setActiveTab: (tab: ProfileTabType) => void;
  showSavedTab?: boolean;
  hasProfileTheme?: boolean;
}

export default function ProfileTabs({
  activeTab,
  setActiveTab,
  showSavedTab = false,
  hasProfileTheme = false,
}: ProfileTabsProps) {
  const getTabButtonClass = (tab: ProfileTabType) => {
    const isActive = activeTab === tab;
    if (hasProfileTheme) {
      return isActive ? 'text-white font-bold' : 'text-gray-300 hover:text-white font-medium';
    }
    return isActive
      ? 'text-gray-900 dark:text-white font-semibold'
      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 font-semibold';
  };

  const indicatorClass = hasProfileTheme
    ? 'absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.75 bg-white rounded-full transition-all shadow-[0_0_8px_rgba(255,255,255,0.5)]'
    : 'absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.75 bg-gray-900 dark:bg-white rounded-full transition-all';

  return (
    <div
      className={
        hasProfileTheme
          ? 'flex bg-black/35 backdrop-blur-xl border-t border-white/10'
          : 'flex border-t border-black/10 dark:border-white/5'
      }
    >
      <button
        type="button"
        onClick={() => setActiveTab('posts')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm relative flex items-center justify-center gap-2 transition-colors ${getTabButtonClass(
          'posts',
        )}`}
      >
        <Grid size={15} />
        <span>Posts</span>
        {activeTab === 'posts' && <div className={indicatorClass} />}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('reposts')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm relative flex items-center justify-center gap-2 transition-colors ${getTabButtonClass(
          'reposts',
        )}`}
      >
        <Repeat size={15} />
        <span>Reposts</span>
        {activeTab === 'reposts' && <div className={indicatorClass} />}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('reels')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm relative flex items-center justify-center gap-2 transition-colors ${getTabButtonClass(
          'reels',
        )}`}
      >
        <Film size={15} />
        <span>Reels</span>
        {activeTab === 'reels' && <div className={indicatorClass} />}
      </button>

      {showSavedTab && (
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-4 cursor-pointer text-center text-sm relative flex items-center justify-center gap-2 transition-colors ${getTabButtonClass(
            'saved',
          )}`}
        >
          <Bookmark
            size={15}
            className={
              activeTab === 'saved'
                ? hasProfileTheme
                  ? 'fill-white'
                  : 'fill-gray-900 dark:fill-white'
                : ''
            }
          />
          <span>Saved</span>
          {activeTab === 'saved' && <div className={indicatorClass} />}
        </button>
      )}
    </div>
  );
}
