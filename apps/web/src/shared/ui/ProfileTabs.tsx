import React, { useId, useRef } from 'react';
import { Bookmark, Film, Grid, Repeat } from 'lucide-react';

export type ProfileTabType = 'posts' | 'reposts' | 'reels' | 'saved';

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  setActiveTab: (tab: ProfileTabType) => void;
  showSavedTab?: boolean;
  idPrefix?: string;
  panelId?: string;
}

export default function ProfileTabs({
  activeTab,
  setActiveTab,
  showSavedTab = false,
  idPrefix,
  panelId,
}: ProfileTabsProps) {
  const generatedId = useId();
  const prefix = idPrefix ?? generatedId;
  const buttons = useRef(new Map<ProfileTabType, HTMLButtonElement>());
  const tabs: ProfileTabType[] = showSavedTab
    ? ['posts', 'reposts', 'reels', 'saved']
    : ['posts', 'reposts', 'reels'];
  const tabProps = (tab: ProfileTabType) => ({
    role: 'tab',
    id: `${prefix}-${tab}`,
    'aria-selected': activeTab === tab,
    'aria-controls': panelId,
    tabIndex: activeTab === tab ? 0 : -1,
    ref: (element: HTMLButtonElement | null) => {
      if (element) buttons.current.set(tab, element);
      else buttons.current.delete(tab);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const index = tabs.indexOf(tab);
      let nextIndex: number;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      buttons.current.get(tabs[nextIndex])?.focus();
      setActiveTab(tabs[nextIndex]);
    },
  });
  return (
    <div
      role="tablist"
      aria-label="Profile content"
      className="flex overflow-x-auto tabs-scrollbar border-t border-white/5"
    >
      <button
        type="button"
        {...tabProps('posts')}
        onClick={() => setActiveTab('posts')}
        className={`flex-1 shrink-0 whitespace-nowrap py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
          activeTab === 'posts' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
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
        {...tabProps('reposts')}
        onClick={() => setActiveTab('reposts')}
        className={`flex-1 shrink-0 whitespace-nowrap py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
          activeTab === 'reposts' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
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
        {...tabProps('reels')}
        onClick={() => setActiveTab('reels')}
        className={`flex-1 shrink-0 whitespace-nowrap py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
          activeTab === 'reels' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
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
          {...tabProps('saved')}
          onClick={() => setActiveTab('saved')}
          className={`flex-1 shrink-0 whitespace-nowrap py-4 cursor-pointer text-center text-sm font-semibold relative flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'saved' ? 'text-white' : 'text-gray-400 hover:text-gray-300'
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
