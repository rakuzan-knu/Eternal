import React from 'react';

interface ProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: 'posts' | 'reposts') => void;
}

export default function ProfileTabs({ activeTab, setActiveTab }: ProfileTabsProps) {
  return (
    <div className="flex border-t border-white/[0.05]">
      <button
        onClick={() => setActiveTab('posts')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm font-semibold relative ${activeTab === 'posts' ? 'text-white' : 'text-gray-500'}`}
      >
        Пости
        {activeTab === 'posts' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-white rounded-full" />
        )}
      </button>
      <button
        onClick={() => setActiveTab('reposts')}
        className={`flex-1 py-4 cursor-pointer text-center text-sm font-semibold relative ${activeTab === 'reposts' ? 'text-white' : 'text-gray-500'}`}
      >
        Репости
        {activeTab === 'reposts' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] bg-white rounded-full" />
        )}
      </button>
    </div>
  );
}
