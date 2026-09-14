import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Users,
  Search,
  X,
  ChevronDown,
  Sparkles,
  MapPin,
  Gamepad2,
  Music,
  Pause,
} from 'lucide-react';
import { useFriends } from '@/features/follow/model/useFriends';
import {
  useSuggestedUsers,
  useDismissSuggestedUser,
} from '@/entities/user/model/useSuggestedUsers';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useConversations } from '@/features/chat/model/useConversations';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { MiniProfileHoverCard } from '@/entities/profile/ui/MiniProfileHoverCard';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import Avatar from '@/shared/ui/Avatar';
import StoryAvatar from '@/shared/ui/StoryAvatar';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import { chatApi } from '@/features/chat/api/chatApi';
import { getSocket } from '@/shared/api/socket';
import { FRIENDS_KEY } from '@/shared/api/queryKeys';
import { formatShortDuration, useLiveElapsedTimer } from '@/shared/lib/activityTimer';
import { SteamBrandIcon, DiscordGamepadIcon } from '@/shared/ui/BrandIcons';
import type { ParticipantView } from '@/entities/chat/model/types';
import type {
  FollowUserSummary,
  RecommendationMutualFriend,
} from '@/features/follow/api/followApi';

interface FriendRowItemProps {
  friend: FollowUserSummary;
  isOnline: boolean;
  unreadCount: number;
  onStartChat: (e: React.MouseEvent, friendId: string) => void;
  onNavigate: (username: string) => void;
}

const FriendRowItem: React.FC<FriendRowItemProps> = ({
  friend,
  isOnline,
  unreadCount,
  onStartChat,
  onNavigate,
}) => {
  const isPlaying = Boolean(
    isOnline &&
    friend.activityStatus &&
    (friend.activityStatus.type === 'gaming' ||
      friend.activityStatus.isSteam ||
      (friend.activityStatus.title && friend.activityStatus.type !== 'spotify')),
  );
  const isListening = Boolean(
    isOnline &&
    !isPlaying &&
    friend.activityStatus &&
    (friend.activityStatus.type === 'spotify' || Boolean(friend.activityStatus.trackId)),
  );
  const elapsed = useLiveElapsedTimer(isPlaying ? friend.activityStatus?.startedAt : null);
  const displayName = friend.displayName || friend.username;

  return (
    <div
      onClick={() => onNavigate(friend.username)}
      className={`group flex flex-col p-2 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/[0.06] ${
        isOnline ? 'text-gray-200' : 'text-gray-400 opacity-80 hover:opacity-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Story Avatar with Status Dot */}
          <MiniProfileHoverCard username={friend.username} side="left">
            <div className="relative shrink-0">
              <StoryAvatar
                src={friend.avatar}
                alt={displayName}
                userId={friend.id}
                username={friend.username}
                size="sm"
              />
              {isPlaying ? (
                <div
                  className="absolute -bottom-1 -right-1 flex items-center justify-center pointer-events-none drop-shadow-[0_0_6px_rgba(35,165,90,0.85)] z-10"
                  title={`Playing ${friend.activityStatus?.title}`}
                >
                  <DiscordGamepadIcon size={13} className="text-[#23a55a]" />
                </div>
              ) : isListening ? (
                <div
                  className={`absolute -bottom-1 -right-1 flex items-center justify-center pointer-events-none z-10 ${
                    (friend.activityStatus as any)?.isPaused
                      ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.85)]'
                      : 'drop-shadow-[0_0_6px_rgba(29,185,84,0.85)]'
                  }`}
                  title={
                    (friend.activityStatus as any)?.isPaused
                      ? `Paused: ${friend.activityStatus?.title}`
                      : `Listening to ${friend.activityStatus?.title}`
                  }
                >
                  {(friend.activityStatus as any)?.isPaused ? (
                    <Pause size={12} className="text-amber-400 fill-amber-400/40" />
                  ) : (
                    <Music size={13} className="text-[#1DB954]" />
                  )}
                </div>
              ) : (
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#070709] pointer-events-none ${
                    isOnline
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                      : 'bg-gray-500'
                  }`}
                />
              )}
            </div>
          </MiniProfileHoverCard>

          {/* User Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <MiniProfileHoverCard username={friend.username} side="left">
                <span className="text-xs font-semibold truncate group-hover:text-white transition-colors hover:underline">
                  {displayName}
                </span>
              </MiniProfileHoverCard>
              <VerifiedCheckmark
                isVerified={friend.isVerified}
                primaryBadge={friend.primaryBadge}
                size="xs"
              />
            </div>
            {isPlaying ? (
              <span className="text-[10px] text-emerald-400 font-medium truncate flex items-center gap-1">
                {friend.activityStatus?.title} —{' '}
                {formatShortDuration(friend.activityStatus?.startedAt)}
              </span>
            ) : isListening ? (
              <span className="text-[10px] text-[#1DB954] font-medium truncate flex items-center gap-1">
                {(friend.activityStatus as any)?.isPaused ? (
                  <span className="text-amber-400 flex items-center gap-1 min-w-0">
                    <Pause size={10} className="shrink-0" />
                    <span className="truncate">Paused: {friend.activityStatus?.title}</span>
                  </span>
                ) : (
                  <span className="truncate">Listening to {friend.activityStatus?.title}</span>
                )}
              </span>
            ) : (
              <span className="text-[10px] text-gray-500 truncate">@{friend.username}</span>
            )}
          </div>
        </div>

        {/* Right Game / Music Icon & Action Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isPlaying && (
            <div
              className="w-5 h-5 rounded-md overflow-hidden bg-black/40 border border-white/10 p-0.5 flex items-center justify-center shrink-0 shadow-xs"
              title={`Playing ${friend.activityStatus?.title}`}
            >
              <img
                src={friend.activityStatus?.imageUrl || '/icons/brands/steam.png'}
                alt={friend.activityStatus?.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icons/brands/steam.png';
                }}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {isListening && (
            <div
              className="w-5 h-5 rounded-md overflow-hidden bg-black/40 border border-[#1DB954]/40 p-0.5 flex items-center justify-center shrink-0 shadow-xs"
              title={`Listening to ${friend.activityStatus?.title}`}
            >
              <img
                src={friend.activityStatus?.imageUrl || '/icons/brands/spotify.png'}
                alt={friend.activityStatus?.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icons/brands/spotify.png';
                }}
                className="w-full h-full object-cover rounded-xs"
              />
            </div>
          )}

          {unreadCount > 0 ? (
            <span
              onClick={(e) => onStartChat(e, friend.id)}
              title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
              className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-[0_0_12px_rgba(139,92,246,0.7)] animate-pulse hover:scale-105 transition-transform"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => onStartChat(e, friend.id)}
              title={`Message @${friend.username}`}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-blue-500 text-gray-300 hover:text-white transition-all shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Discord-style Active Game Subcard */}
      {isPlaying && (
        <div className="mt-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2.5 shadow-xs">
          <div className="relative w-8 h-8 rounded-lg overflow-visible bg-black/40 border border-white/10 shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={friend.activityStatus?.imageUrl || '/icons/brands/steam.png'}
                alt={friend.activityStatus?.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icons/brands/steam.png';
                }}
                className="w-full h-full object-cover"
              />
            </div>
            {friend.activityStatus?.isSteam && (
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#1e1f22] border border-[#121316] flex items-center justify-center">
                <SteamBrandIcon size={8} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-bold text-white truncate">
              {friend.activityStatus?.title}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-[#23a55a]">
              <DiscordGamepadIcon size={14} className="text-[#23a55a]" />
              <span className="text-[10px] font-semibold font-mono tracking-wide">
                {elapsed || '0:00'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function OnlineFriendsSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(false);
  const [suggestedVisibleCount, setSuggestedVisibleCount] = useState(3);

  const queryClient = useQueryClient();
  const { data: friends, isLoading: isFriendsLoading } = useFriends();
  const { data: suggestedUsers = [], isLoading: isSuggestedLoading } = useSuggestedUsers(15);
  const dismissMutation = useDismissSuggestedUser();
  const { data: conversations } = useConversations();
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const currentUserId = useAuthStore((s) => s.userId);
  const navigate = useNavigate();

  // Listen to real-time game activity changes via WebSockets
  useEffect(() => {
    let socket: ReturnType<typeof getSocket> | null = null;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    const handleActivityChanged = (payload: { userId: string; activityStatus: any }) => {
      if (!payload?.userId) return;
      usePresenceStore.getState().setUserActivity(payload.userId, payload.activityStatus ?? null);
      queryClient.setQueryData<FollowUserSummary[]>([FRIENDS_KEY], (old) => {
        if (!old) return old;
        return old.map((f) =>
          f.id === payload.userId ? { ...f, activityStatus: payload.activityStatus ?? null } : f,
        );
      });
    };

    socket.on('user:activity:changed', handleActivityChanged);

    return () => {
      socket?.off('user:activity:changed', handleActivityChanged);
    };
  }, [queryClient]);

  // Sync initial friends activityStatus into usePresenceStore
  useEffect(() => {
    if (friends && friends.length > 0) {
      friends.forEach((f) => {
        if (f.activityStatus) {
          usePresenceStore.getState().setUserActivity(f.id, f.activityStatus);
        }
      });
    }
  }, [friends]);

  // Map user ID -> unread direct message count
  const unreadCountsByUserId = useMemo(() => {
    const map = new Map<string, number>();
    if (!conversations || !currentUserId) return map;

    for (const conv of conversations) {
      if (conv.type === 'DIRECT' && conv.unreadCount > 0) {
        const otherParticipant = conv.participants?.find(
          (p: ParticipantView) => p.user?.id !== currentUserId,
        );
        if (otherParticipant?.user?.id) {
          map.set(otherParticipant.user.id, conv.unreadCount);
        }
      }
    }
    return map;
  }, [conversations, currentUserId]);

  // Filter and sort friends
  const { onlineFriends, offlineFriends, hasFilter } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = friends ?? [];

    const filtered = q
      ? list.filter(
          (f: FollowUserSummary) =>
            f.username.toLowerCase().includes(q) ||
            (f.displayName && f.displayName.toLowerCase().includes(q)),
        )
      : list;

    const online: FollowUserSummary[] = [];
    const offline: FollowUserSummary[] = [];

    for (const friend of filtered) {
      if (onlineUserIds.has(friend.id)) {
        online.push(friend);
      } else {
        offline.push(friend);
      }
    }

    const sortFn = (a: FollowUserSummary, b: FollowUserSummary) => {
      const nameA = a.displayName || a.username;
      const nameB = b.displayName || b.username;
      return nameA.localeCompare(nameB);
    };

    online.sort(sortFn);
    offline.sort(sortFn);

    return {
      onlineFriends: online,
      offlineFriends: offline,
      hasFilter: Boolean(q),
    };
  }, [friends, onlineUserIds, searchQuery]);

  const handleStartChat = async (e: React.MouseEvent, friendId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const conv = await chatApi.createDirectConversation(friendId);
      if (conv?.id) {
        navigate(`/messages/${conv.id}`);
      } else {
        navigate('/messages');
      }
    } catch {
      navigate('/messages');
    }
  };

  // Group online friends by game (when 2 or more play the same game)
  const gameAggregators = useMemo(() => {
    const map = new Map<
      string,
      { title: string; imageUrl?: string | null; friends: FollowUserSummary[] }
    >();
    for (const f of onlineFriends) {
      if (f.activityStatus?.type === 'gaming' && f.activityStatus.title) {
        const title = f.activityStatus.title;
        if (!map.has(title)) {
          map.set(title, {
            title,
            imageUrl: f.activityStatus.imageUrl,
            friends: [],
          });
        }
        map.get(title)!.friends.push(f);
      }
    }
    return Array.from(map.values()).filter((g) => g.friends.length >= 2);
  }, [onlineFriends]);

  const displayedOffline = isOfflineExpanded ? offlineFriends : offlineFriends.slice(0, 5);
  const hasHiddenOffline = offlineFriends.length > 5;

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-4 self-start animate-fadeIn select-none">
      {/* 1. Recommended users to follow block (Always visible above Friends, scrolls away with page) */}
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-4 shadow-xl flex flex-col gap-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-gray-200 tracking-wider uppercase">
              Suggested for you
            </span>
          </div>
        </div>

        {/* List of Suggested Users */}
        {isSuggestedLoading ? (
          <div className="flex flex-col gap-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/[0.05]" />
                  <div className="flex flex-col gap-1">
                    <div className="w-20 h-3 rounded bg-white/[0.05]" />
                    <div className="w-14 h-2 rounded bg-white/[0.05]" />
                  </div>
                </div>
                <div className="w-16 h-6 rounded-full bg-white/[0.05]" />
              </div>
            ))}
          </div>
        ) : suggestedUsers && suggestedUsers.length > 0 ? (
          <div className="flex flex-col gap-2">
            {suggestedUsers.slice(0, suggestedVisibleCount).map((user: FollowUserSummary) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MiniProfileHoverCard username={user.username} side="left">
                    <Link to={`/profile/${user.username}`} className="shrink-0">
                      <Avatar src={user.avatar} alt={user.displayName || user.username} size="sm" />
                    </Link>
                  </MiniProfileHoverCard>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MiniProfileHoverCard username={user.username} side="left">
                        <Link
                          to={`/profile/${user.username}`}
                          className="text-xs font-semibold text-gray-200 truncate hover:text-white hover:underline transition-colors"
                        >
                          {user.displayName || user.username}
                        </Link>
                      </MiniProfileHoverCard>
                      <VerifiedCheckmark
                        isVerified={user.isVerified}
                        primaryBadge={user.primaryBadge}
                        size="xs"
                      />
                    </div>

                    {/* Recommendation Reason Context */}
                    <Link to={`/profile/${user.username}`} className="block truncate">
                      {user.recommendationReason?.type === 'MUTUAL_FRIENDS' &&
                      user.recommendationReason.mutualFriends &&
                      user.recommendationReason.mutualFriends.length > 0 ? (
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                          <div className="flex -space-x-1.5 shrink-0">
                            {user.recommendationReason.mutualFriends.map(
                              (m: RecommendationMutualFriend, idx: number) => (
                                <Avatar
                                  key={m.id || idx}
                                  src={m.avatar}
                                  alt={m.username}
                                  size="2xs"
                                  className="w-3.5 h-3.5 ring-1 ring-[#070709] border-0 shrink-0"
                                />
                              ),
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 truncate leading-none">
                            {user.recommendationReason.text}
                          </span>
                        </div>
                      ) : user.recommendationReason?.type === 'NEARBY' ||
                        user.recommendationReason?.type === 'SAME_CITY' ? (
                        <div className="flex items-center gap-1 mt-0.5 min-w-0">
                          <MapPin className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                          <span className="text-[10px] text-blue-300/80 truncate leading-none">
                            {user.recommendationReason.text}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-500 truncate mt-0.5 block">
                          {user.recommendationReason?.text || `@${user.username}`}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <FollowButton
                    authorId={user.id}
                    isFollowing={user.isFollowing}
                    isFriend={user.isFriend}
                    followsYou={user.followsYou}
                    className="px-3 py-1 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      dismissMutation.mutate(user.id);
                    }}
                    title="Hide recommendation"
                    aria-label={`Hide recommendation for ${user.username}`}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* "See more" button replacing the search link */}
            {suggestedUsers.length > 3 && (
              <button
                type="button"
                onClick={() => {
                  if (suggestedVisibleCount >= suggestedUsers.length) {
                    setSuggestedVisibleCount(3);
                  } else {
                    setSuggestedVisibleCount((prev) => Math.min(prev + 4, suggestedUsers.length));
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 mt-1 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-gray-300 hover:text-white transition-all text-center cursor-pointer active:scale-[0.98]"
              >
                <span>
                  {suggestedVisibleCount >= suggestedUsers.length ? 'See less' : 'See more'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    suggestedVisibleCount >= suggestedUsers.length ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center py-4">
            No suggestions available right now.
          </div>
        )}
      </div>

      {/* 2. Friends Block (Sticky on scroll, max height constrained) */}
      <div className="sticky top-8 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-4 shadow-xl flex flex-col gap-2 max-h-[calc(100vh-theme(spacing.16))] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-gray-200 tracking-wider uppercase">
              Friends
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
              {friends?.length ?? 0}
            </span>

            {/* Quick Filter Magnifying Glass */}
            {friends && friends.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  if (isSearchOpen) setSearchQuery('');
                }}
                title={isSearchOpen ? 'Close filter' : 'Search friends'}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isSearchOpen || hasFilter
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {isSearchOpen || hasFilter ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Search / Filter Input */}
        {(isSearchOpen || hasFilter) && (
          <div className="mb-2 relative animate-fadeIn">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/50 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-gray-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Friends List Container */}
        <div className="flex flex-col gap-3 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar pr-1">
          {isFriendsLoading ? (
            <div className="flex flex-col gap-2 py-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2.5 p-2">
                  <div className="w-7 h-7 rounded-full bg-white/[0.05]" />
                  <div className="w-24 h-3 rounded bg-white/[0.05]" />
                </div>
              ))}
            </div>
          ) : onlineFriends.length === 0 && offlineFriends.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-6">
              {hasFilter
                ? `No friends found matching "${searchQuery}"`
                : 'No friends yet. Follow creators above to start chatting!'}
            </div>
          ) : (
            <>
              {/* Online Section */}
              {onlineFriends.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-400/90 uppercase">
                      Online — {onlineFriends.length}
                    </span>
                  </div>
                  {onlineFriends.map((f: FollowUserSummary) => (
                    <FriendRowItem
                      key={f.id}
                      friend={f}
                      isOnline={true}
                      unreadCount={unreadCountsByUserId.get(f.id) ?? 0}
                      onStartChat={handleStartChat}
                      onNavigate={(username) => navigate(`/profile/${username}`)}
                    />
                  ))}

                  {/* Friends Game Aggregator (Discord Active Now) */}
                  {gameAggregators.map((group) => (
                    <div
                      key={group.title}
                      className="p-2.5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black/50 border border-indigo-500/25 flex items-center justify-between gap-3 mt-1.5 shadow-sm"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-black/50 border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                          <img
                            src={group.imageUrl || '/icons/brands/steam.png'}
                            alt={group.title}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/icons/brands/steam.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            {group.title}
                          </span>
                          <span className="text-[10px] text-indigo-300 font-medium truncate">
                            {group.friends.length}{' '}
                            {group.friends.length === 1 ? 'friend' : 'friends'}
                          </span>
                        </div>
                      </div>

                      {/* Overlapping Avatars */}
                      <div className="flex items-center -space-x-2 shrink-0">
                        {group.friends.slice(0, 3).map((friend) => (
                          <img
                            key={friend.id}
                            src={friend.avatar || '/default-avatar.png'}
                            alt={friend.displayName || friend.username}
                            title={friend.displayName || friend.username}
                            className="w-6 h-6 rounded-full ring-2 ring-[#121214] object-cover bg-neutral-800"
                          />
                        ))}
                        {group.friends.length > 3 && (
                          <span className="w-6 h-6 rounded-full ring-2 ring-[#121214] bg-neutral-800 text-[9px] font-bold text-gray-300 flex items-center justify-center">
                            +{group.friends.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offline Section with Accordion */}
              {offlineFriends.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                      Offline — {offlineFriends.length}
                    </span>
                  </div>
                  {displayedOffline.map((f: FollowUserSummary) => (
                    <FriendRowItem
                      key={f.id}
                      friend={f}
                      isOnline={false}
                      unreadCount={unreadCountsByUserId.get(f.id) ?? 0}
                      onStartChat={handleStartChat}
                      onNavigate={(username) => navigate(`/profile/${username}`)}
                    />
                  ))}

                  {/* Show All / Show Less Accordion Toggle */}
                  {hasHiddenOffline && !hasFilter && (
                    <button
                      type="button"
                      onClick={() => setIsOfflineExpanded((prev) => !prev)}
                      className="flex items-center justify-between w-full px-2.5 py-1.5 mt-1 text-[11px] font-medium text-gray-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all cursor-pointer border border-white/[0.04]"
                    >
                      <span>
                        {isOfflineExpanded ? 'Show less' : `Show all (${offlineFriends.length})`}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOfflineExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
