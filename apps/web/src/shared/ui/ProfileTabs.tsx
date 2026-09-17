import React from 'react';
import { Bookmark, Film, Grid, Repeat } from 'lucide-react';

export type ProfileTabType = 'posts' | 'reposts' | 'reels' | 'saved';

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  setActiveTab: (tab: ProfileTabType) => void;
  showSavedTab?: boolean;
}

export default function ProfileTabs({
  activeTab,
  setActiveTab,
  showSavedTab = false,
}: ProfileTabsProps) {
  return (
    <div className="flex border-t border-white/5">
      <button
        type="button"
        onClick={() => setActiveTab('posts')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
          activeTab === 'posts' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Grid size={15} />
        <span>Posts</span>
        {activeTab === 'posts' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.75 bg-white rounded-full transition-all" />
        )}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('reposts')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
          activeTab === 'reposts' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Repeat size={15} />
        <span>Reposts</span>
        {activeTab === 'reposts' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.75 bg-white rounded-full transition-all" />
        )}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('reels')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
          activeTab === 'reels' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Film size={15} />
        <span>Reels</span>
        {activeTab === 'reels' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.75 bg-white rounded-full transition-all" />
        )}
      </button>

      {showSavedTab && (
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'saved' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Bookmark size={15} className={activeTab === 'saved' ? 'fill-white' : ''} />
          <span>Saved</span>
          {activeTab === 'saved' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.75 bg-white rounded-full transition-all" />
          )}
        </button>
      )}
    </div>
  );
}
