import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, Play, FileText, AtSign } from 'lucide-react';
import { apiClient as api } from '@/shared/api/httpClient';
import { postsApi } from '@/entities/post/api/postsApi';
import { PostType } from '@/entities/post/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useFollowMutation } from '@/features/follow/model/useFollowMutation';
import { chatApi } from '@/features/chat/api/chatApi';
import { useUIStore } from '@/shared/model/useUIStore';
import { VerifiedCheckmark } from './VerifiedCheckmark';

interface MiniProfileData {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  banner?: string | null;
  bannerPosition?: number;
  bio: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  isFollowing: boolean;
  followsYou?: boolean;
  isFriend?: boolean;
}

function formatCount(num?: number): string {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`.replace('.0M', 'M');
  if (num >= 10_000) return `${(num / 1_000).toFixed(1)}K`.replace('.0K', 'K');
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

interface MiniProfileHoverCardProps {
  username: string;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function MiniProfileHoverCard({
  username,
  children,
  align = 'left',
  side = 'top',
}: MiniProfileHoverCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHoveredFollow, setIsHoveredFollow] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  const [resolvedSide, setResolvedSide] = useState<'top' | 'bottom' | 'left' | 'right'>(side);
  const [resolvedAlign, setResolvedAlign] = useState<'left' | 'center' | 'right'>(align);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const enterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserId = useAuthStore((s) => s.userId);
  const openCommentModal = useUIStore((s) => s.openCommentModal);
  const navigate = useNavigate();

  const cleanUsername = username.replace(/^@+/, '').trim();

  // Dynamic viewport space calculation
  const updatePlacement = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const cardHeight = 390;
    const cardWidth = 340;

    let nextSide = side;
    let nextAlign = align;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    if (side === 'top' || side === 'bottom') {
      if (side === 'top' && spaceAbove < cardHeight && spaceBelow > spaceAbove) {
        nextSide = 'bottom';
      } else if (side === 'bottom' && spaceBelow < cardHeight && spaceAbove > spaceBelow) {
        nextSide = 'top';
      }

      // Horizontal edge safety
      if (align === 'left' && rect.left + cardWidth > window.innerWidth - 16) {
        nextAlign = 'right';
      } else if (align === 'right' && rect.right - cardWidth < 16) {
        nextAlign = 'left';
      }
    } else if (side === 'left' || side === 'right') {
      if (side === 'left' && spaceLeft < cardWidth && spaceRight > spaceLeft) {
        nextSide = 'right';
      } else if (side === 'right' && spaceRight < cardWidth && spaceLeft > spaceRight) {
        nextSide = 'left';
      }
    }

    setResolvedSide(nextSide);
    setResolvedAlign(nextAlign);
  }, [side, align]);

  // Fetch User Profile
  const { data: profile, isLoading: isProfileLoading } = useQuery<MiniProfileData>({
    queryKey: ['miniProfile', cleanUsername],
    queryFn: async () => {
      const res = await api.get<MiniProfileData>(`/users/by-username/${cleanUsername}`);
      return res.data;
    },
    enabled: isOpen && !!cleanUsername,
    staleTime: 60 * 1000,
  });

  // Fetch 3 most recent posts
  const { data: userPostsData } = useQuery({
    queryKey: ['miniProfilePosts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const res = await postsApi.getUserPosts(profile.id, undefined);
      return res.posts.slice(0, 3);
    },
    enabled: isOpen && !!profile?.id,
    staleTime: 60 * 1000,
  });

  const recentPosts: PostType[] = userPostsData ?? [];

  const isFollowing = profile?.isFollowing ?? false;
  const followMutation = useFollowMutation(profile?.id ?? '', isFollowing);

  const handleMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    enterTimerRef.current = setTimeout(() => {
      updatePlacement();
      setIsOpen(true);
    }, 180);
  };

  const handleMouseLeave = () => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    // Safe zone close delay to allow moving cursor across gap into card
    leaveTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  useEffect(() => {
    if (isOpen) {
      updatePlacement();
    }
  }, [isOpen, updatePlacement]);

  const handleMessageClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile?.id) return;
    try {
      setIsStartingChat(true);
      const conv = await chatApi.createDirectConversation(profile.id);
      if (conv?.id) {
        navigate(`/messages/${conv.id}`);
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    followMutation.mutate();
  };

  const alignClasses =
    resolvedAlign === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : resolvedAlign === 'right'
        ? 'right-0'
        : 'left-0';

  const positionClasses =
    resolvedSide === 'left'
      ? 'right-full mr-2.5 top-0'
      : resolvedSide === 'right'
        ? 'left-full ml-2.5 top-0'
        : resolvedSide === 'bottom'
          ? `top-full mt-2.5 ${alignClasses}`
          : `bottom-full mb-2.5 ${alignClasses}`;

  return (
    <span
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute z-50 w-[330px] sm:w-[350px] max-w-[calc(100vw-24px)] ${positionClasses} rounded-[26px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.12)] border border-white/[0.14] bg-[#090a0f]/85 backdrop-blur-2xl animate-fadeIn text-left select-none`}
        >
          {/* Safe Hover Area Bridge to prevent premature closing */}
          <div className="absolute -inset-2.5 pointer-events-auto -z-20" />

          {/* 1. Linux Rice Frosted Background Banner Overlay with Deep Blur */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[26px]">
            {profile?.banner ? (
              <img
                src={profile.banner}
                alt="Banner"
                className="w-full h-full object-cover opacity-35 scale-110 filter blur-xl"
                style={{
                  objectPosition: `center ${profile.bannerPosition ?? 50}%`,
                }}
              />
            ) : profile?.avatar ? (
              <img
                src={profile.avatar}
                alt="Ambient"
                className="w-full h-full object-cover opacity-25 scale-125 filter blur-2xl"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-950/30 via-indigo-950/20 to-[#090a0f]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#090a0f]/75 to-[#090a0f]/95" />
          </div>

          {/* 2. Card Content */}
          <div className="relative z-10 p-4 sm:p-5 flex flex-col gap-3.5">
            {isProfileLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : profile ? (
              <>
                {/* Header: Clean Avatar (No Story Ring Border) + Names */}
                <div className="flex items-center gap-3.5">
                  <Link
                    to={`/profile/${profile.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="relative shrink-0 group/avatar cursor-pointer"
                  >
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[#111115] shadow-lg group-hover/avatar:scale-105 transition-transform duration-200">
                      {profile.avatar ? (
                        <img
                          src={profile.avatar}
                          alt={profile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-base sm:text-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                          {profile.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-col min-w-0 flex-1">
                    <Link
                      to={`/profile/${profile.username}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 group/name"
                    >
                      <span className="font-bold text-base text-white group-hover/name:underline truncate">
                        {profile.username}
                      </span>
                      {profile.isVerified && <VerifiedCheckmark size="sm" />}
                    </Link>

                    {profile.displayName && (
                      <span className="text-xs text-gray-400 truncate">{profile.displayName}</span>
                    )}

                    {/* Threads / Handle pill */}
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] text-gray-300 font-medium">
                        <AtSign size={11} className="text-gray-400" />
                        <span className="truncate max-w-[140px]">{profile.username}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio text (if available) */}
                {profile.bio && (
                  <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed px-0.5">
                    {profile.bio}
                  </p>
                )}

                {/* 3. Liquid Glass Statistics Bar */}
                <div className="grid grid-cols-3 gap-2 bg-white/[0.04] backdrop-blur-md rounded-2xl border border-white/[0.08] p-2.5 sm:p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold text-sm text-white tracking-tight">
                      {formatCount(profile.postsCount ?? recentPosts.length)}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">posts</span>
                  </div>
                  <div className="flex flex-col items-center border-x border-white/[0.06]">
                    <span className="font-extrabold text-sm text-white tracking-tight">
                      {formatCount(profile.followersCount)}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">followers</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-extrabold text-sm text-white tracking-tight">
                      {formatCount(profile.followingCount)}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">following</span>
                  </div>
                </div>

                {/* 4. Three Most Recent Posts Preview */}
                {recentPosts.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden border border-white/[0.06] bg-black/35 backdrop-blur-md p-1">
                    {recentPosts.map((post) => {
                      const mediaItem =
                        post.media?.[0] ??
                        (post.image ? { type: 'image' as const, url: post.image } : null);
                      const isVideo =
                        mediaItem?.type === 'video' ||
                        mediaItem?.type === 'VIDEO' ||
                        Boolean(mediaItem?.url && mediaItem.url.match(/\.(mp4|webm|mov)(\?.*)?$/i));

                      return (
                        <div
                          key={post.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCommentModal(post);
                          }}
                          className="aspect-square relative rounded-xl overflow-hidden bg-[#111115] border border-white/[0.04] group/thumb cursor-pointer select-none transition-transform hover:scale-[1.03]"
                        >
                          {mediaItem?.url ? (
                            <>
                              {isVideo ? (
                                <video
                                  src={mediaItem.url}
                                  poster={mediaItem.poster ?? undefined}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={mediaItem.url}
                                  alt={post.text || 'Post preview'}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              )}

                              {isVideo && (
                                <div className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur-sm rounded-md p-0.5 text-white shadow-sm">
                                  <Play size={10} className="fill-white" />
                                </div>
                              )}
                            </>
                          ) : (
                            /* Liquid glass text card preview */
                            <div className="w-full h-full bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-2 flex flex-col justify-between text-left">
                              <FileText size={12} className="text-purple-400 opacity-80" />
                              <p className="text-[10px] text-gray-300 line-clamp-3 leading-tight font-medium">
                                {post.text || 'Post'}
                              </p>
                            </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-[11px] font-bold">
                            <span className="flex items-center gap-1">
                              ❤️ {formatCount(post.likes)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. Action Buttons: Message & Follow */}
                {currentUserId !== profile.id && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Message Button */}
                    <button
                      type="button"
                      onClick={handleMessageClick}
                      disabled={isStartingChat}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 active:scale-95 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-50 select-none whitespace-nowrap"
                    >
                      <Send size={13} className="fill-white" />
                      <span>Message</span>
                    </button>

                    {/* Follow / Following / Friends Button */}
                    <button
                      type="button"
                      onClick={handleFollowClick}
                      onMouseEnter={() => setIsHoveredFollow(true)}
                      onMouseLeave={() => setIsHoveredFollow(false)}
                      disabled={followMutation.isPending}
                      className={`w-full min-w-[94px] whitespace-nowrap flex items-center justify-center py-2 px-3 rounded-2xl font-semibold text-xs border transition-all duration-200 ease-out cursor-pointer disabled:opacity-50 select-none active:scale-95 hover:-translate-y-0.5 ${
                        isFollowing
                          ? isHoveredFollow
                            ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:shadow-[0_6px_20px_rgba(239,68,68,0.2)]'
                            : profile?.isFriend || (isFollowing && profile?.followsYou)
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:shadow-[0_6px_20px_rgba(59,130,246,0.3)]'
                              : 'bg-white/[0.08] text-white border-white/[0.1] hover:bg-white/[0.12] hover:shadow-[0_6px_20px_rgba(255,255,255,0.08)]'
                          : 'bg-white text-black border-transparent hover:bg-gray-100 shadow-md hover:shadow-[0_6px_20px_rgba(255,255,255,0.15)]'
                      }`}
                    >
                      {isFollowing
                        ? isHoveredFollow
                          ? 'Unfollow'
                          : profile?.isFriend || (isFollowing && profile?.followsYou)
                            ? 'Friends'
                            : 'Following'
                        : 'Follow'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-gray-400 py-6 text-center">User not found</div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
