import React, { useState, useMemo, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Play,
  Music2,
} from 'lucide-react';
import { useUIStore } from '@/shared/model/useUIStore';
import Avatar from '@/shared/ui/Avatar';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
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
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMusicHubStore } from '@/features/music/model/useMusicHubStore';
import { SEOHead } from '@/shared/seo';

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
    case 'COLLABORATE_PLAYLIST':
      return {
        icon: <UserPlus size={10} className="text-white" />,
        bg: 'bg-purple-600',
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

interface NotificationRowMenuProps {
  itemId: string;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  actorId?: string | null;
  onDelete: () => void;
  onMuteAuthor?: () => void;
}

function NotificationRowMenu({
  isOpen,
  onOpen,
  onClose,
  actorId,
  onDelete,
  onMuteAuthor,
}: NotificationRowMenuProps) {
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = actorId ? 90 : 48;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;

    let nextCoords: { top?: number; bottom?: number; right: number };

    if (spaceBelow < menuHeight && spaceAbove >= spaceBelow) {
      nextCoords = {
        bottom: Math.max(12, window.innerHeight - rect.top + gap),
        right: Math.max(12, Math.min(window.innerWidth - 12, window.innerWidth - rect.right)),
      };
    } else {
      nextCoords = {
        top: Math.max(12, Math.min(rect.bottom + gap, window.innerHeight - menuHeight - 12)),
        right: Math.max(12, Math.min(window.innerWidth - 12, window.innerWidth - rect.right)),
      };
    }
    setCoords(nextCoords);
  }, [actorId]);

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      const rafId = requestAnimationFrame(() => {
        updateCoords();
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [isOpen, updateCoords]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, onClose, updateCoords]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            onClose();
          } else {
            onOpen();
          }
        }}
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-150 cursor-pointer"
        title="Options"
      >
        <MoreHorizontal size={17} />
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: `${coords.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className={`z-[99999] w-60 bg-[#171b22]/95 border border-white/10 rounded-2xl shadow-2xl p-1.5 backdrop-blur-xl divide-y divide-white/5 animate-fadeIn ${
              coords.bottom !== undefined ? 'origin-bottom-right' : 'origin-top-right'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onDelete();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
              <span>Delete this notification</span>
            </button>
            {actorId && onMuteAuthor && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onMuteAuthor();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-purple-300 hover:bg-purple-500/10 rounded-xl transition-colors cursor-pointer"
              >
                <BellOff size={15} />
                <span>Do not send notifications from this author</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function NotificationsPage() {
  const navigate = useNavigate();
  useNotificationRealtime();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const unreadCounts = useNotificationStore((state) => state.unreadCounts);
  const openEditProfile = useUIStore((state) => state.openEditProfile);
  const { data: currentUser } = useCurrentUser();
  const playlistInvites = useMusicHubStore((s) => s.playlistInvites || []);

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
    const list: NotificationItem[] = [];
    if (data?.pages) {
      for (const page of data.pages) {
        if (page.items) {
          list.push(...page.items);
        }
      }
    }

    if (currentUser) {
      const pendingInvites = playlistInvites.filter(
        (inv) =>
          inv.status === 'pending' &&
          (inv.inviteeId === currentUser.id || inv.inviteeUsername === currentUser.username),
      );

      for (const inv of pendingInvites) {
        list.unshift({
          id: inv.id,
          userId: currentUser.id,
          actorId: inv.inviterId,
          type: 'COLLABORATE_PLAYLIST' as NotificationType,
          text: `invited you to collaborate on playlist "${inv.playlistTitle}"`,
          isRead: false,
          createdAt: inv.createdAt,
          deepLink: `/music/playlist/${inv.playlistId}`,
          actor: {
            id: inv.inviterId,
            username: inv.inviterUsername,
            displayName: inv.inviterDisplayName || inv.inviterUsername,
            avatar: inv.inviterAvatar,
          },
          metadata: {
            playlistId: inv.playlistId,
            playlistTitle: inv.playlistTitle,
            playlistCover: inv.playlistCover,
          },
        } as any);
      }
    }

    return list;
  }, [data, currentUser, playlistInvites]);

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
      <SEOHead
        title="Notifications • Eternal"
        description="Stay updated with your latest mentions, likes, comments, and community interactions on Eternal."
        noindex={true}
      />
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
                  className={`group relative flex items-center justify-between p-3 sm:p-4 gap-2.5 sm:gap-3.5 transition-colors duration-150 cursor-pointer ${
                    item.isRead
                      ? 'hover:bg-white/[0.03]'
                      : 'bg-purple-950/10 hover:bg-purple-950/20'
                  }`}
                >
                  {/* Left Indicator & Avatar */}
                  <div
                    className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1"
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
                      <div className="text-xs text-gray-300 leading-snug break-normal sm:break-words">
                        <span className="inline-flex items-center gap-1.5 align-middle">
                          <span
                            className="font-semibold text-white hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.actor?.username) navigate(`/${item.actor.username}`);
                            }}
                          >
                            {actorDisplayName}
                          </span>
                          <VerifiedCheckmark
                            isVerified={Boolean(item.actor?.isVerified)}
                            primaryBadge={item.actor?.primaryBadge}
                            size="xs"
                          />
                        </span>{' '}
                        {item.extraCount > 0 && (
                          <span className="text-gray-400 font-medium">
                            and {item.extraCount} other{item.extraCount > 1 ? 's' : ''}{' '}
                          </span>
                        )}
                        <span className="text-gray-400">
                          {item.story ? (
                            item.type === 'MENTION' ? (
                              'mentioned you in their story'
                            ) : (
                              'liked your story'
                            )
                          ) : (
                            <>
                              {item.type === 'COLLABORATE_PLAYLIST' &&
                                `invited you to collaborate on playlist "${(item as any).metadata?.playlistTitle || 'Playlist'}"`}
                              {item.type === 'LIKE_POST' && 'liked your post'}
                              {item.type === 'LIKE_COMMENT' && 'liked your comment'}
                              {item.type === 'COMMENT' && 'commented on your post'}
                              {item.type === 'FOLLOW' && 'started following you'}
                              {item.type === 'REPOST' && 'reposted your post'}
                              {item.type === 'MENTION' && 'mentioned you'}
                              {item.type === 'SYSTEM_VERIFIED' && 'Your account has been verified.'}
                              {item.type === 'SYSTEM_VIEW' && 'viewed your profile'}
                              {item.type === 'SYSTEM' && (item.text || 'System notification')}
                            </>
                          )}
                        </span>
                      </div>

                      {/* Comment Quote Snippet */}
                      {item.comment?.text && (
                        <p className="mt-1 text-xs text-gray-400 italic bg-white/5 px-2 py-1 rounded-md border border-white/5 line-clamp-2">
                          &quot;{item.comment.text}&quot;
                        </p>
                      )}

                      {/* Post Content Snippet (if no comment, not story notification, and not collaborate invite) */}
                      {!item.story &&
                        !item.comment?.text &&
                        item.text &&
                        item.type !== 'SYSTEM_VERIFIED' &&
                        item.type !== 'COLLABORATE_PLAYLIST' &&
                        !item.text.startsWith('{') && (
                          <p className="mt-1 text-xs text-gray-400 line-clamp-1">{item.text}</p>
                        )}

                      <span className="text-[11px] text-gray-500 font-medium mt-0.5 inline-block">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right Action / Preview */}
                  <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2">
                    {/* Follow Back Button */}
                    {isFollowNotification && item.actorId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) markAsReadMutation.mutate(item.id);
                          toggleFollow(item.actorId!, false);
                        }}
                        disabled={isFollowLoading(item.actorId)}
                        className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                          isFollowing(item.actorId)
                            ? 'bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                        }`}
                      >
                        {isFollowing(item.actorId) ? 'Following' : 'Follow back'}
                      </button>
                    )}

                    {/* Playlist Cover Preview for Collaboration Invites */}
                    {item.type === 'COLLABORATE_PLAYLIST' && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) markAsReadMutation.mutate(item.id);
                          navigate(
                            item.deepLink ||
                              `/music/playlist/${(item as any).metadata?.playlistId}`,
                          );
                        }}
                        className="w-11 h-11 rounded-lg overflow-hidden border border-white/10 bg-[#282828] flex items-center justify-center shrink-0 cursor-pointer hover:border-purple-500/50 transition-colors shadow-sm"
                        title="Go to playlist"
                      >
                        {(item as any).metadata?.playlistCover ? (
                          <img
                            src={(item as any).metadata.playlistCover}
                            alt="Playlist"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music2 size={18} className="text-gray-400" />
                        )}
                      </div>
                    )}

                    {/* Story Thumbnail Preview */}
                    {item.story && !isFollowNotification && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.isRead) markAsReadMutation.mutate(item.id);
                          if (item.deepLink) {
                            navigate(item.deepLink);
                          } else if (item.actor?.username) {
                            navigate(`/${item.actor.username}?story=${item.story?.id}`);
                          }
                        }}
                        className="w-10 h-14 rounded-lg overflow-hidden border border-purple-500/30 bg-zinc-900 flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-all duration-200 relative group/story flex-shrink-0"
                        title="View story"
                      >
                        {item.story.mediaUrl?.startsWith('color:') ? (
                          <div
                            className="w-full h-full flex items-center justify-center p-1"
                            style={{ background: item.story.mediaUrl.replace('color:', '') }}
                          >
                            <span className="text-[9px] font-bold text-white drop-shadow">
                              Story
                            </span>
                          </div>
                        ) : item.story.mediaType === 'VIDEO' ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-black">
                            {item.story.mediaUrl && (
                              <video
                                src={item.story.mediaUrl}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                            )}
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <Play className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          </div>
                        ) : item.story.mediaUrl ? (
                          <img
                            src={item.story.mediaUrl}
                            alt="Story"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
                            <span className="text-[9px] font-bold text-white">Story</span>
                          </div>
                        )}
                        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-lg pointer-events-none" />
                      </div>
                    )}

                    {/* Post Thumbnail Preview */}
                    {item.post && !item.story && !isFollowNotification && (
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
                    <NotificationRowMenu
                      itemId={item.id}
                      isOpen={activeMenuId === item.id}
                      onOpen={() => setActiveMenuId(item.id)}
                      onClose={() => setActiveMenuId(null)}
                      actorId={item.actorId}
                      onDelete={() => deleteMutation.mutate(item.id)}
                      onMuteAuthor={
                        item.actorId ? () => muteAuthorMutation.mutate(item.actorId!) : undefined
                      }
                    />
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
