import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  Search,
  X,
  ChevronDown,
  Sparkles,
  Compass,
  MapPin,
  CheckCircle2,
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
import { chatApi } from '@/features/chat/api/chatApi';
import type { ParticipantView } from '@/entities/chat/model/types';
import type {
  FollowUserSummary,
  RecommendationMutualFriend,
} from '@/features/follow/api/followApi';

export function OnlineFriendsSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOfflineExpanded, setIsOfflineExpanded] = useState(false);

  const { data: friends, isLoading: isFriendsLoading } = useFriends();
  const { data: suggestedUsers = [], isLoading: isSuggestedLoading } = useSuggestedUsers(5);
  const dismissMutation = useDismissSuggestedUser();
  const { data: conversations } = useConversations();
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);
  const currentUserId = useAuthStore((s) => s.userId);
  const navigate = useNavigate();

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

  const renderFriendRow = (friend: FollowUserSummary, isOnline: boolean) => {
    const displayName = friend.displayName || friend.username;
    const unreadCount = unreadCountsByUserId.get(friend.id) ?? 0;

    return (
      <MiniProfileHoverCard key={friend.id} username={friend.username} side="left">
        <div
          onClick={() => navigate(`/profile/${friend.username}`)}
          className={`group flex items-center justify-between gap-3 px-2.5 py-2 rounded-2xl cursor-pointer transition-all duration-200 hover:bg-white/[0.06] ${
            isOnline ? 'text-gray-200' : 'text-gray-400 opacity-80 hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar with Status Ring */}
            <div className="relative shrink-0">
              <Avatar src={friend.avatar} alt={displayName} size="sm" />
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-[#070709] ${
                  isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-gray-500'
                }`}
              />
            </div>

            {/* User Info */}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate group-hover:text-white transition-colors">
                {displayName}
              </span>
              <span className="text-[10px] text-gray-500 truncate">@{friend.username}</span>
            </div>
          </div>

          {/* Action / Unread Indicator */}
          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 ? (
              <span
                onClick={(e) => handleStartChat(e, friend.id)}
                title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
                className="px-2 py-0.5 text-[10px] font-extrabold bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-[0_0_12px_rgba(139,92,246,0.7)] animate-pulse hover:scale-105 transition-transform"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => handleStartChat(e, friend.id)}
                title={`Message @${friend.username}`}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-white/10 hover:bg-blue-500 text-gray-300 hover:text-white transition-all shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </MiniProfileHoverCard>
    );
  };

  const hasFriends = Boolean(friends && friends.length > 0);

  // 1. Fallback State: Suggested Users Block (Zero Friends State)
  if (!isFriendsLoading && !hasFriends) {
    return (
      <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-4 self-start sticky top-8 animate-fadeIn select-none">
        <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-4 shadow-xl flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-gray-200 tracking-wider uppercase">
                Suggested for you
              </span>
            </div>
            <Link
              to="/search"
              title="Explore all creators"
              className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Compass className="w-3 h-3 text-purple-400" />
              <span>Explore</span>
            </Link>
          </div>

          {/* List of Suggested Users */}
          {isSuggestedLoading ? (
            <div className="flex flex-col gap-3 py-4">
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
              {suggestedUsers.slice(0, 5).map((user: FollowUserSummary) => (
                <MiniProfileHoverCard key={user.id} username={user.username} side="left">
                  <div className="flex items-center justify-between gap-2 p-2 rounded-2xl hover:bg-white/[0.04] transition-colors">
                    <Link
                      to={`/profile/${user.username}`}
                      className="flex items-center gap-2.5 min-w-0 flex-1"
                    >
                      <Avatar src={user.avatar} alt={user.displayName || user.username} size="sm" />
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-semibold text-gray-200 truncate hover:text-white transition-colors">
                            {user.displayName || user.username}
                          </span>
                          {user.isVerified && (
                            <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0 inline" />
                          )}
                        </div>

                        {/* Recommendation Reason Context (Instagram-style) */}
                        {user.recommendationReason?.type === 'MUTUAL_FRIENDS' &&
                        user.recommendationReason.mutualFriends &&
                        user.recommendationReason.mutualFriends.length > 0 ? (
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <div className="flex -space-x-1.5 shrink-0">
                              {user.recommendationReason.mutualFriends.map(
                                (m: RecommendationMutualFriend, idx: number) => (
                                  <img
                                    key={m.id || idx}
                                    src={m.avatar || '/default-avatar.png'}
                                    alt={m.username}
                                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-[#070709] bg-white/10"
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
                          <span className="text-[10px] text-gray-500 truncate mt-0.5">
                            {user.recommendationReason?.text || `@${user.username}`}
                          </span>
                        )}
                      </div>
                    </Link>
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
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </MiniProfileHoverCard>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center py-6">
              Search and follow people to see friends here.
            </div>
          )}

          {/* Quick Search Link */}
          <Link
            to="/search"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-gray-300 hover:text-white transition-all text-center"
          >
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <span>Find more people</span>
          </Link>
        </div>
      </aside>
    );
  }

  // 2. Active Friends List State
  const displayedOffline = isOfflineExpanded ? offlineFriends : offlineFriends.slice(0, 5);
  const hasHiddenOffline = offlineFriends.length > 5;

  return (
    <aside className="w-72 shrink-0 hidden xl:flex flex-col gap-4 self-start sticky top-8 animate-fadeIn select-none">
      <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/[0.05]">
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
          <div className="mb-3 relative animate-fadeIn">
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
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Lists Container */}
        <div className="flex flex-col gap-3 max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar pr-1">
          {onlineFriends.length === 0 && offlineFriends.length === 0 && hasFilter ? (
            <div className="text-xs text-gray-500 text-center py-6">
              No friends found matching &ldquo;{searchQuery}&rdquo;
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
                  {onlineFriends.map((f: FollowUserSummary) => renderFriendRow(f, true))}
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
                  {displayedOffline.map((f: FollowUserSummary) => renderFriendRow(f, false))}

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
