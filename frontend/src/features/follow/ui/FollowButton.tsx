import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserMinus, ChevronDown } from 'lucide-react';
import { useFollowMutation } from '../model/useFollowMutation';
import { chatApi } from '@/features/chat/api/chatApi';

import { useAuthStore } from '@/shared/model/useAuthStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';

interface FollowButtonProps {
  authorId: string;
  isFollowing: boolean;
  isFriend?: boolean;
  followsYou?: boolean;
  className?: string;
}

export function FollowButton({
  authorId,
  isFollowing,
  isFriend,
  followsYou,
  className = '',
}: FollowButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const mutation = useFollowMutation(authorId, isFollowing);

  const currentUserId = useAuthStore((s) => s.userId);
  const { data: currentUser } = useCurrentUser();

  const isMutual = Boolean(isFriend || (isFollowing && followsYou));

  // Close dropdown on outside click
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
    if (!isFollowing) return 'Follow';
    if (isMutual) return 'Friends';
    return isHovered ? 'Unfollow' : 'Following';
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleMainClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={mutation.isPending}
        className={`min-w-[94px] w-auto whitespace-nowrap text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ease-out cursor-pointer disabled:opacity-40 select-none flex items-center justify-center gap-1 active:scale-95 hover:-translate-y-0.5 ${
          isFollowing
            ? isMutual
              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/45 hover:shadow-[0_6px_20px_rgba(59,130,246,0.3)] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
              : isHovered
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:shadow-[0_6px_20px_rgba(239,68,68,0.2)]'
                : 'bg-white/10 text-gray-200 border-white/10 hover:bg-white/15 hover:shadow-[0_6px_20px_rgba(255,255,255,0.08)]'
            : 'bg-white text-black border-transparent hover:bg-gray-100 hover:shadow-[0_6px_20px_rgba(255,255,255,0.15)] shadow-sm'
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

      {/* Subtle Liquid Glass Options Dropdown */}
      {isMenuOpen && isMutual && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-2 z-50 min-w-[150px] bg-[#0c0c10]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl p-1.5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] animate-fadeIn flex flex-col gap-1 text-left select-none"
        >
          <button
            type="button"
            onClick={handleStartChat}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-200 hover:text-white hover:bg-white/[0.08] rounded-xl transition-colors cursor-pointer"
          >
            <MessageSquare size={13} className="text-blue-400" />
            <span>Send message</span>
          </button>
          <button
            type="button"
            onClick={handleUnfriend}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer border-t border-white/[0.05]"
          >
            <UserMinus size={13} className="text-rose-400" />
            <span>Unfriend</span>
          </button>
        </div>
      )}
    </div>
  );
}
