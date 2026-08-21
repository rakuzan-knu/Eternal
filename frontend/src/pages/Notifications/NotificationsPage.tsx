import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Repeat2,
  AtSign,
  UserPlus,
  CheckCircle2,
  Sparkles,
  Settings,
  CheckCheck,
  Bell,
  ChevronDown,
  ChevronUp,
  Loader2,
  Layers,
  MoreHorizontal,
  Trash2,
  BellOff,
} from 'lucide-react';
import { useUIStore } from '@/shared/model/useUIStore';
import Avatar from '@/shared/ui/Avatar';
import {
  NotificationFilter,
  NotificationItem,
  NotificationType,
} from '@/entities/notification/model/types';
import {
  useDeleteNotification,
  useFollowBack,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useMuteNotificationAuthor,
  useNotifications,
} from '@/entities/notification/model/useNotifications';
import { useNotificationStore } from '@/entities/notification/model/useNotificationStore';
import { useNotificationRealtime } from '@/entities/notification/model/useNotificationRealtime';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks}w`;
}

function getNotificationBadge(type: NotificationType) {
  switch (type) {
    case 'LIKE_POST':
    case 'LIKE_COMMENT':
      return {
        icon: <Heart size={10} className="fill-current text-white" />,
        bg: 'bg-rose-500',
      };
    case 'COMMENT':
      return {
        icon: <MessageCircle size={10} className="fill-current text-white" />,
        bg: 'bg-blue-500',
      };
    case 'FOLLOW':
      return {
        icon: <UserPlus size={10} className="text-white" />,
        bg: 'bg-purple-500',
      };
    case 'REPOST':
      return {
        icon: <Repeat2 size={10} className="text-white" />,
        bg: 'bg-emerald-500',
      };
    case 'MENTION':
      return {
        icon: <AtSign size={10} className="text-white" />,
        bg: 'bg-amber-500',
      };
    case 'SYSTEM_VERIFIED':
      return {
        icon: <CheckCircle2 size={10} className="text-white" />,
        bg: 'bg-cyan-500',
      };
    case 'SYSTEM_VIEW':
    case 'SYSTEM':
    default:
      return {
        icon: <Sparkles size={10} className="text-white" />,
        bg: 'bg-violet-500',
      };
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  useNotificationRealtime();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const unreadCounts = useNotificationStore((state) => state.unreadCounts);
  const openEditProfile = useUIStore((state) => state.openEditProfile);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useNotifications(activeFilter);

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();
  const muteAuthorMutation = useMuteNotificationAuthor();
  const { toggleFollow, isFollowing, isLoading: isFollowLoading } = useFollowBack();

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const allItems: NotificationItem[] = useMemo(() => {
    if (!data?.pages) return [];
    const list: NotificationItem[] = [];
    for (const page of data.pages) {
      if (page.items) {
        list.push(...page.items);
      }
    }
    return list;
  }, [data]);

  const displayedItems = useMemo(() => {
    if (isExpanded) return allItems;
    return allItems.slice(0, 7);
  }, [allItems, isExpanded]);

  const handleRowClick = (item: NotificationItem) => {
    if (!item.isRead) {
      markAsReadMutation.mutate(item.id);
    }
    if (item.deepLink) {
      navigate(item.deepLink);
    } else if (item.postId) {
      navigate(`/?post=${item.postId}`);
    } else if (item.actor?.username) {
      navigate(`/${item.actor.username}`);
    }
  };

  const handleOpenSettings = () => {
    openEditProfile('notifications');
  };

  const filterTabs: { id: NotificationFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: unreadCounts.total },
    { id: 'likes', label: 'Likes', count: unreadCounts.likes },
    { id: 'comments', label: 'Comments', count: unreadCounts.comments },
    { id: 'follows', label: 'Follows', count: unreadCounts.follows },
    { id: 'mentions', label: 'Mentions', count: unreadCounts.mentions },
    { id: 'reposts', label: 'Reposts', count: unreadCounts.reposts },
    { id: 'system', label: 'System', count: unreadCounts.system },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
          {unreadCounts.total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {unreadCounts.total} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCounts.total > 0 && (
            <button
              onClick={() => markAllMutation.mutate(activeFilter)}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 hover:text-white border border-white/5 transition-all duration-200"
              title="Mark all as read"
            >
              <CheckCheck size={14} className="text-purple-400" />
              <span>Mark all read</span>
            </button>
          )}

          <button
            onClick={handleOpenSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all duration-200"
            title="Notification Settings"
            aria-label="Notification Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveFilter(tab.id);
                setIsExpanded(false);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)] font-semibold'
                  : 'bg-[#121216]/80 text-gray-400 border-white/5 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none ${
                    isActive
                      ? 'bg-purple-400 text-black'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications Card Container */}
      <div className="bg-[#121216]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">
              Recent
            </span>
          </div>
          {allItems.length > 0 && (
            <span className="text-xs text-gray-500">{allItems.length} total</span>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Loader2 size={24} className="animate-spin text-purple-400" />
            <span className="text-xs font-medium">Loading notifications...</span>
          </div>
        ) : allItems.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
              <Bell size={22} className="text-purple-400" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No notifications yet</h3>
            <p className="text-xs text-gray-500 max-w-xs">
              When someone likes, comments, mentions you, or follows your profile, you&apos;ll see
              it here.
            </p>
          </div>
        ) : (
          /* Notifications List */
          <div className="divide-y divide-white/5">
            {displayedItems.map((item) => {
              const badge = getNotificationBadge(item.type);
              const isFollowNotification = item.type === 'FOLLOW';
              const actorDisplayName = item.actor?.displayName || item.actor?.username || 'Someone';

              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center justify-between p-4 gap-3.5 transition-colors duration-150 cursor-pointer ${
                    item.isRead
                      ? 'hover:bg-white/[0.03]'
                      : 'bg-purple-950/10 hover:bg-purple-950/20'
                  }`}
                >
                  {/* Left Indicator & Avatar */}
                  <div
                    className="flex items-center gap-3 min-w-0 flex-grow"
                    onClick={() => handleRowClick(item)}
                  >
                    {/* Unread Blue/Purple Glow Dot */}
                    <div className="w-2 flex-shrink-0 flex items-center justify-center">
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 ring-4 ring-purple-500/20" />
                      )}
                    </div>

                    {/* Avatar with Overlay Badge */}
                    <div
                      className="relative flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.actor?.username) navigate(`/${item.actor.username}`);
                      }}
                    >
                      <Avatar
                        size="md"
                        src={item.actor?.avatar}
                        name={actorDisplayName}
                        className="transition-transform duration-200 group-hover:scale-105"
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${badge.bg} border-2 border-[#121216] flex items-center justify-center shadow-md`}
                      >
                        {badge.icon}
                      </div>
                    </div>

                    {/* Middle Text / Action description */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-300 leading-snug break-words">
                        <span
                          className="font-semibold text-white hover:underline cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.actor?.username) navigate(`/${item.actor.username}`);
                          }}
                        >
                          {actorDisplayName}
                        </span>{' '}
                        {item.extraCount > 0 && (
                          <span className="text-gray-400 font-medium">
                            and {item.extraCount} other{item.extraCount > 1 ? 's' : ''}{' '}
                          </span>
                        )}
                        <span className="text-gray-400">
                          {item.type === 'LIKE_POST' && 'liked your post'}
                          {item.type === 'LIKE_COMMENT' && 'liked your comment'}
                          {item.type === 'COMMENT' && 'commented on your post'}
                          {item.type === 'FOLLOW' && 'started following you'}
                          {item.type === 'REPOST' && 'reposted your post'}
                          {item.type === 'MENTION' && 'mentioned you'}
                          {item.type === 'SYSTEM_VERIFIED' && 'Your account has been verified.'}
                          {item.type === 'SYSTEM_VIEW' && 'viewed your profile'}
                          {item.type === 'SYSTEM' && (item.text || 'System notification')}
                        </span>
                      </p>

                      {/* Comment Quote Snippet */}
                      {item.comment?.text && (
                        <p className="mt-1 text-xs text-gray-400 italic bg-white/5 px-2 py-1 rounded-md border border-white/5 line-clamp-2">
                          &quot;{item.comment.text}&quot;
                        </p>
                      )}

                      {/* Post Content Snippet (if no comment) */}
                      {!item.comment?.text && item.text && item.type !== 'SYSTEM_VERIFIED' && (
                        <p className="mt-1 text-xs text-gray-400 line-clamp-1">{item.text}</p>
                      )}

                      <span className="text-[11px] text-gray-500 font-medium mt-0.5 inline-block">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right Action / Preview */}
                  <div className="flex-shrink-0 flex items-center gap-2 pl-2">
                    {/* Follow Back Button */}
                    {isFollowNotification && item.actorId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) markAsReadMutation.mutate(item.id);
                          toggleFollow(item.actorId!, false);
                        }}
                        disabled={isFollowLoading(item.actorId)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                          isFollowing(item.actorId)
                            ? 'bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        }`}
                      >
                        {isFollowing(item.actorId) ? 'Following' : 'Follow back'}
                      </button>
                    )}

                    {/* Post Thumbnail Preview */}
                    {item.post && !isFollowNotification && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) markAsReadMutation.mutate(item.id);
                          navigate(`/?post=${item.post?.id}`);
                        }}
                        className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-purple-500/50 transition-colors duration-200"
                      >
                        {item.post.mediaUrl ? (
                          <img
                            src={item.post.mediaUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-1 text-[9px] text-gray-400 line-clamp-2 leading-tight">
                            {item.post.content}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Context Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === item.id ? null : item.id);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150"
                        title="Options"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      {activeMenuId === item.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1.5 z-30 w-60 bg-[#171b22]/95 border border-white/10 rounded-2xl shadow-2xl p-1.5 backdrop-blur-xl divide-y divide-white/5 animate-fadeIn"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              deleteMutation.mutate(item.id);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                          >
                            <Trash2 size={15} />
                            <span>Delete this notification</span>
                          </button>
                          {item.actorId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                muteAuthorMutation.mutate(item.actorId!);
                              }}
                              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-purple-300 hover:bg-purple-500/10 rounded-xl transition-colors"
                            >
                              <BellOff size={15} />
                              <span>Do not send notifications from this author</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible / Expand Button & Infinite Scroll */}
        {allItems.length > 7 && (
          <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors duration-150"
            >
              <span>{isExpanded ? 'Show less' : `View all ${allItems.length} notifications`}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {isExpanded && hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-gray-300 border border-white/5"
              >
                {isFetchingNextPage ? (
                  <Loader2 size={12} className="animate-spin text-purple-400" />
                ) : (
                  <Layers size={12} />
                )}
                <span>Load more</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
