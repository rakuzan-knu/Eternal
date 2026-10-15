import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserMinus, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFollowMutation } from '../model/useFollowMutation';
import { chatApi } from '@/entities/chat';

import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';

interface FollowButtonProps {
  authorId: string;
  isFollowing: boolean;
  followStatus?: string | undefined;
  isFriend?: boolean | undefined;
  followsYou?: boolean | undefined;
  className?: string | undefined;
}

export function FollowButton({
  authorId,
  isFollowing,
  followStatus,
  isFriend,
  followsYou,
  className = '',
}: FollowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isPending = followStatus?.toLowerCase() === 'pending';
  const effectiveIsFollowing = isFollowing || followStatus?.toLowerCase() === 'following';
  const mutation = useFollowMutation(authorId, effectiveIsFollowing || isPending);

  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();

  const isMutual = Boolean(isFriend || (effectiveIsFollowing && followsYou));

  // Compute position relative to viewport for portal menu
  const updateMenuCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = 92;
    const menuWidth = 160;

    // Check if button is scrolled out of viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsMenuOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight;

    const top = openUp ? rect.top - menuHeight - 6 : rect.bottom + 6;
    const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));

    setMenuCoords({ top, left, openUp });
  }, []);

  // Update coords and handle scroll/resize
  useEffect(() => {
    if (!isMenuOpen) return;
    updateMenuCoords();

    const handleScrollOrResize = () => {
      updateMenuCoords();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen, updateMenuCoords]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Never show follow button for oneself
  if (
    !authorId ||
    authorId === currentUserId ||
    (currentUser && (authorId === currentUser.id || authorId === currentUser.username))
  ) {
    return null;
  }

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMutual) {
      // Toggle dropdown menu for mutual friends instead of jarring instant unfollow
      if (!isMenuOpen) {
        updateMenuCoords();
      }
      setIsMenuOpen((prev) => !prev);
    } else {
      mutation.mutate();
    }
  };

  const handleStartChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    try {
      const conv = await chatApi.createDirectConversation(authorId);
      if (conv?.id) {
        navigate(`/messages/${conv.id}`);
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    }
  };

  const handleUnfriend = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    mutation.mutate();
  };

  const getLabel = () => {
    if (isPending) return isHovered ? 'Cancel' : 'Requested';
    if (!effectiveIsFollowing) return 'Follow';
    if (isMutual) return 'Friends';
    return isHovered ? 'Unfollow' : 'Following';
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleMainClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={mutation.isPending}
        className={`min-w-[94px] w-auto whitespace-nowrap text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ease-out cursor-pointer disabled:opacity-40 select-none flex items-center justify-center gap-1 active:scale-95 hover:-translate-y-0.5 ${
          effectiveIsFollowing || isPending
            ? isMutual
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/45 hover:shadow-[0_6px_20px_rgba(59,130,246,0.3)] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
              : isPending
                ? isHovered
                  ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/30 hover:shadow-[0_6px_20px_rgba(239,68,68,0.2)]'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                : isHovered
                  ? 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/30 hover:shadow-[0_6px_20px_rgba(239,68,68,0.2)]'
                  : 'bg-black/5 dark:bg-white/10 text-gray-800 dark:text-gray-200 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/15'
            : 'bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-100 border border-transparent shadow-sm'
        } ${className}`}
      >
        <span>{getLabel()}</span>
        {isMutual && (
          <ChevronDown
            size={11}
            className={`transition-transform duration-200 opacity-75 ${
              isMenuOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Floating Liquid Glass Options Dropdown via Portal */}
      {typeof document !== 'undefined' &&
        isMenuOpen &&
        isMutual &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[99999] min-w-[160px] glass-menu border border-black/10 dark:border-white/10 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex flex-col gap-1 text-left select-none text-gray-800 dark:text-gray-100 animate-menuIn"
          >
            <button
              type="button"
              onClick={handleStartChat}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
            >
              <MessageSquare size={13} className="text-blue-500 dark:text-blue-400" />
              <span>Send message</span>
            </button>
            <button
              type="button"
              onClick={handleUnfriend}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border-t border-black/5 dark:border-white/[0.05]"
            >
              <UserMinus size={13} className="text-rose-500 dark:text-rose-400" />
              <span>Unfriend</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
