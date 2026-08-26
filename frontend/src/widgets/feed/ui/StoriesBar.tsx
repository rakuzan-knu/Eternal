import React, { useRef, useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight, Eye, Sparkles } from 'lucide-react';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useStoriesFeed } from '@/features/stories/model/useStories';
import { useStoryEditorStore } from '@/features/stories/model/useStoryEditorStore';
import { useStoryViewerStore } from '@/features/stories/model/useStoryViewerStore';
import Avatar from '@/shared/ui/Avatar';
import type { UserStoriesGroup } from '@/features/stories/model/types';

export function StoriesBar() {
  const { data: currentUser } = useCurrentUser();
  const { data: feed = [], isLoading } = useStoriesFeed();
  const openEditor = useStoryEditorStore((s) => s.openEditor);
  const openViewer = useStoryViewerStore((s) => s.openViewer);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if current user has active stories in feed
  const ownGroup = currentUser ? feed.find((g) => g.user.id === currentUser.id) : null;
  const hasOwnStories = Boolean(ownGroup && ownGroup.stories.length > 0);

  // Other users' stories
  const otherGroups = currentUser ? feed.filter((g) => g.user.id !== currentUser.id) : feed;

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [feed]);

  // Click outside listener for own story dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = 320;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleOwnAvatarClick = () => {
    if (hasOwnStories) {
      setIsMenuOpen((v) => !v);
    } else {
      openEditor();
    }
  };

  const handleGroupClick = (group: UserStoriesGroup) => {
    const groupIndex = feed.findIndex((g) => g.user.id === group.user.id);
    if (groupIndex !== -1) {
      openViewer(feed, groupIndex);
    }
  };

  if (isLoading && feed.length === 0) {
    return (
      <div className="w-full bg-[#121216]/60 backdrop-blur-md border border-white/5 rounded-3xl p-3.5 flex items-center gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10" />
            <div className="w-12 h-2.5 rounded bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full bg-[#121216]/60 backdrop-blur-md border border-white/5 rounded-3xl p-3.5 shadow-xl select-none group/bar">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label="Scroll left"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#16161a]/90 backdrop-blur-md border border-white/15 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:bg-purple-600 transition-all"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label="Scroll right"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#16161a]/90 backdrop-blur-md border border-white/15 text-white flex items-center justify-center shadow-lg hover:scale-110 hover:bg-purple-600 transition-all"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Left / Right Fade Gradients */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#121216] to-transparent pointer-events-none z-10 rounded-l-3xl" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#121216] to-transparent pointer-events-none z-10 rounded-r-3xl" />
      )}

      {/* Horizontal Story Items List */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center gap-4 overflow-x-auto no-scrollbar py-0.5 px-1 scroll-smooth"
      >
        {/* Current User Item */}
        <div className="relative flex flex-col items-center gap-1.5 shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={handleOwnAvatarClick}
            className="group relative flex items-center justify-center rounded-full p-[2.5px] transition-transform duration-200 active:scale-95 cursor-pointer"
            style={
              hasOwnStories
                ? {
                    background: ownGroup?.hasCloseFriendsStory
                      ? 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #14b8a6 100%)'
                      : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #6366f1 100%)',
                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.45))',
                  }
                : undefined
            }
          >
            <div className="rounded-full bg-[#09090b] p-[2px]">
              <Avatar
                src={currentUser?.avatar}
                alt={currentUser?.displayName || 'Your story'}
                className="w-14 h-14"
              />
            </div>

            {/* Bottom-right Plus Icon Badge */}
            <div
              className={`absolute bottom-0 right-0 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#121216] shadow-md transition-transform duration-200 group-hover:scale-110 ${
                hasOwnStories
                  ? 'bg-purple-600 text-white'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-500 text-white'
              }`}
            >
              <Plus size={12} className="stroke-[3]" />
            </div>
          </button>

          <span className="text-[11px] font-medium text-gray-300 truncate max-w-[70px] text-center">
            {hasOwnStories ? 'Ваша история' : 'Добавить'}
          </span>

          {/* Own Story Dropdown Context Menu */}
          {isMenuOpen && hasOwnStories && (
            <div className="absolute top-full mt-2 left-0 z-50 min-w-[170px] bg-[#18181f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl animate-popIn">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  const groupIndex = feed.findIndex((g) => g.user.id === currentUser?.id);
                  if (groupIndex !== -1) openViewer(feed, groupIndex);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
              >
                <Eye size={15} className="text-purple-400" />
                <span>Посмотреть</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openEditor();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors text-left cursor-pointer"
              >
                <Sparkles size={15} className="text-pink-400" />
                <span>Новая история</span>
              </button>
            </div>
          )}
        </div>

        {/* Followed Users' Active Stories */}
        {otherGroups.map((group) => {
          const author = group.user;
          const isUnviewed = group.hasUnviewed;
          const isCloseFriendStory = group.hasCloseFriendsStory;

          return (
            <div
              key={author.id}
              onClick={() => handleGroupClick(group)}
              className="group flex flex-col items-center gap-1.5 shrink-0 cursor-pointer transition-transform duration-200 active:scale-95"
            >
              <div
                className={`relative rounded-full p-[2.5px] transition-all duration-300 group-hover:scale-105 ${
                  isUnviewed
                    ? isCloseFriendStory
                      ? 'shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'shadow-[0_0_12px_rgba(139,92,246,0.45)]'
                    : 'opacity-70 group-hover:opacity-100'
                }`}
                style={
                  isUnviewed
                    ? {
                        background: isCloseFriendStory
                          ? 'linear-gradient(135deg, #10b981 0%, #22c55e 50%, #14b8a6 100%)'
                          : 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #6366f1 100%)',
                      }
                    : {
                        background: 'rgba(255, 255, 255, 0.15)',
                      }
                }
              >
                <div className="rounded-full bg-[#09090b] p-[2px]">
                  <Avatar
                    src={author.avatar}
                    alt={author.displayName || author.username}
                    className="w-14 h-14"
                  />
                </div>

                {/* Close friend green badge */}
                {isCloseFriendStory && (
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-black rounded-full border-2 border-[#121216] flex items-center justify-center text-[9px] font-black shadow-sm"
                    title="Close Friends Story"
                  >
                    ★
                  </div>
                )}
              </div>

              <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors truncate max-w-[70px] text-center">
                {author.displayName || author.username}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
