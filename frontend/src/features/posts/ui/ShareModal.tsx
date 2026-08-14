import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Check,
  Link as LinkIcon,
  Mail,
  ChevronLeft,
  ChevronRight,
  Share2,
  Send,
} from 'lucide-react';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { followApi, FollowUserSummary } from '@/features/follow/api/followApi';
import { useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { chatApi } from '@/features/chat/api/chatApi';
import { postsApi } from '@/features/posts/api/postsApi';
import { FeedPage } from '@/entities/post/api/postsApi';
import {
  FEED_KEY,
  USER_POSTS_KEY,
  USER_REPOSTS_KEY,
  SAVED_POSTS_KEY,
} from '@/shared/api/queryKeys';
import { getSocket } from '@/shared/api/socket';
import Avatar from '@/shared/ui/Avatar';

export function ShareModal() {
  const { isShareModalOpen, activePostForShare, closeShareModal } = useUIStore();
  const { data: currentUser } = useCurrentUser();
  const myUserId = currentUser?.id ?? '';
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('Yo check this!');
  const [isSending, setIsSending] = useState(false);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch following and followers to calculate mutual connections (up to 20 users)
  const { data: followingData, isLoading: isFollowingLoading } = useQuery({
    queryKey: ['share-mutual-following', myUserId],
    queryFn: () => followApi.getFollowing(myUserId),
    enabled: Boolean(isShareModalOpen && myUserId),
  });

  const { data: followersData, isLoading: isFollowersLoading } = useQuery({
    queryKey: ['share-mutual-followers', myUserId],
    queryFn: () => followApi.getFollowers(myUserId),
    enabled: Boolean(isShareModalOpen && myUserId),
  });

  // Calculate mutual connections (subscribed to each other)
  const mutualUsers = useMemo<FollowUserSummary[]>(() => {
    if (!followingData?.items || !followersData?.items) return [];

    const followerIds = new Set(followersData.items.map((u) => u.id));
    const following = followingData.items;

    // Filter users who follow each other
    const mutuals = following.filter((u) => u.followsYou || followerIds.has(u.id));

    // If fewer mutuals, include other following/followers up to 20
    const combined = [...mutuals];
    const seen = new Set(mutuals.map((u) => u.id));

    for (const u of following) {
      if (!seen.has(u.id) && combined.length < 20) {
        seen.add(u.id);
        combined.push(u);
      }
    }
    for (const u of followersData.items) {
      if (!seen.has(u.id) && combined.length < 20) {
        seen.add(u.id);
        combined.push(u);
      }
    }

    return combined.slice(0, 20);
  }, [followingData, followersData]);

  // Filter based on search input
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return mutualUsers;
    return mutualUsers.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)),
    );
  }, [mutualUsers, searchQuery]);

  if (!isShareModalOpen || !activePostForShare) return null;

  const post = activePostForShare;
  const postUrl = `${window.location.origin}/profile/${post.handle}#post-${post.id}`;
  const shareTitle = `${post.author} (@${post.handle}) on Eternal: "${
    post.text
      ? post.text.length > 70
        ? post.text.slice(0, 70) + '...'
        : post.text
      : 'Check out this post'
  }"`;

  const trackShare = () => {
    // Increment shares count optimistically
    const updateFeedData = (old: InfiniteData<FeedPage> | undefined) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  sharesCount: (p.sharesCount ?? 0) + 1,
                }
              : p,
          ),
        })),
      };
    };

    queryClient.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [FEED_KEY] }, updateFeedData);
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: [USER_POSTS_KEY] },
      updateFeedData,
    );
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: [USER_REPOSTS_KEY] },
      updateFeedData,
    );
    queryClient.setQueriesData<InfiniteData<FeedPage>>(
      { queryKey: [SAVED_POSTS_KEY] },
      updateFeedData,
    );

    // Call backend API to record share count
    postsApi.share(post.id).catch(() => {});
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const showToast = (title: string, body: string) => {
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      conversationId: '',
      messageId: '',
      title,
      body,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  const handleCopyLink = async () => {
    trackShare();
    try {
      await navigator.clipboard.writeText(postUrl);
      showToast('Link Copied', 'Post link copied to clipboard!');
    } catch {
      showToast('Copy Failed', 'Could not copy link to clipboard.');
    }
  };

  const handleNativeShare = async () => {
    trackShare();
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ url: postUrl })
    ) {
      try {
        await navigator.share({
          title: 'Eternal',
          text: shareTitle,
          url: postUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await handleCopyLink();
        }
      }
    } else {
      // Safe fallback to copying link
      await handleCopyLink();
    }
  };

  const handleSendToSelectedUsers = async () => {
    if (selectedUserIds.length === 0 || isSending) return;
    setIsSending(true);
    trackShare();

    try {
      const fullText = `${messageText ? messageText + '\n' : ''}${postUrl}`;
      const socket = getSocket();

      for (const targetUserId of selectedUserIds) {
        try {
          const directConv = await chatApi.createDirectConversation(targetUserId);
          if (directConv?.id) {
            if (socket && socket.connected) {
              socket.emit('sendMessage', {
                conversationId: directConv.id,
                body: fullText,
              });
            }
          }
        } catch {
          // ignore individual failures
        }
      }

      showToast(
        'Sent!',
        `Shared post with ${selectedUserIds.length} friend${selectedUserIds.length > 1 ? 's' : ''}.`,
      );
      setSelectedUserIds([]);
      closeShareModal();
    } catch {
      showToast('Error', 'Failed to send post.');
    } finally {
      setIsSending(false);
    }
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = direction === 'left' ? -200 : 200;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const socialButtons = [
    {
      id: 'copy',
      label: 'Copy link',
      icon: <LinkIcon size={20} className="text-white" />,
      bg: 'bg-white/10 hover:bg-white/20',
      onClick: handleCopyLink,
    },
    {
      id: 'facebook',
      label: 'Facebook',
      icon: (
        <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      bg: 'bg-[#1877F2]/15 hover:bg-[#1877F2]/25',
      onClick: () => {
        trackShare();
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}&quote=${encodeURIComponent(shareTitle)}`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      id: 'messenger',
      label: 'Messenger',
      icon: (
        <svg className="w-5 h-5 fill-[#00B2FF]" viewBox="0 0 24 24">
          <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.302 2.247.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.056-3.259-5.963 3.259 6.559-6.963 3.13 3.259 5.89-3.259-6.56 6.963z" />
        </svg>
      ),
      bg: 'bg-[#00B2FF]/15 hover:bg-[#00B2FF]/25',
      onClick: () => {
        trackShare();
        window.open(
          `https://www.facebook.com/dialog/send?link=${encodeURIComponent(postUrl)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(postUrl)}`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5 fill-[#25D366]" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
        </svg>
      ),
      bg: 'bg-[#25D366]/15 hover:bg-[#25D366]/25',
      onClick: () => {
        trackShare();
        window.open(
          `https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + '\n' + postUrl)}`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      id: 'email',
      label: 'Email',
      icon: <Mail size={20} className="text-gray-200" />,
      bg: 'bg-white/10 hover:bg-white/20',
      onClick: () => {
        trackShare();
        window.location.href = `mailto:?subject=${encodeURIComponent(
          'Post by ' + post.author + ' on Eternal',
        )}&body=${encodeURIComponent(shareTitle + '\n\n' + postUrl)}`;
      },
    },
    {
      id: 'threads',
      label: 'Threads',
      icon: <span className="font-bold text-base text-white">@</span>,
      bg: 'bg-white/10 hover:bg-white/20',
      onClick: () => {
        trackShare();
        window.open(
          `https://www.threads.net/intent/post?text=${encodeURIComponent(shareTitle + ' ' + postUrl)}`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      id: 'x',
      label: 'X',
      icon: (
        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      bg: 'bg-white/10 hover:bg-white/20',
      onClick: () => {
        trackShare();
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(postUrl)}`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      id: 'telegram',
      label: 'Telegram',
      icon: (
        <svg className="w-5 h-5 fill-[#229ED9]" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      bg: 'bg-[#229ED9]/15 hover:bg-[#229ED9]/25',
      onClick: () => {
        trackShare();
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareTitle)}`,
          '_blank',
          'noopener,noreferrer',
        );
      },
    },
    {
      id: 'view_all',
      label: 'View all',
      icon: <Share2 size={18} className="text-white" />,
      bg: 'bg-white/10 hover:bg-white/20',
      onClick: handleNativeShare,
    },
  ];

  const hasSelectedUsers = selectedUserIds.length > 0;
  const isLoadingUsers = isFollowingLoading || isFollowersLoading;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={closeShareModal}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-[460px] bg-[#141418]/95 border border-white/10 rounded-[2rem] shadow-[0_25px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10 animate-modalIn max-h-[90vh]">
        {/* Header */}
        <div className="relative flex items-center justify-center px-5 py-4 border-b border-white/[0.08]">
          <button
            type="button"
            onClick={closeShareModal}
            className="absolute left-4 p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-white tracking-wide">Spread</h2>
        </div>

        {/* Search Bar */}
        <div className="px-5 pt-3.5 pb-2">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-white/[0.04] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>
        </div>

        {/* Mutual Connections Grid */}
        <div className="px-5 py-3 overflow-y-auto flex-1 max-h-[300px]">
          {isLoadingUsers ? (
            <div className="grid grid-cols-4 gap-y-4 gap-x-2 py-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-white/5 border border-white/5" />
                  <div className="w-12 h-2.5 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="grid grid-cols-4 gap-y-4 gap-x-2 py-2">
              {filteredUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleSelectUser(u.id)}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div className="relative">
                      <div
                        className={`w-14 h-14 rounded-full p-0.5 transition-all duration-200 ${
                          isSelected
                            ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#141418]'
                            : 'group-hover:scale-105'
                        }`}
                      >
                        <Avatar size="lg" src={u.avatar} />
                      </div>

                      {/* Selected Blue Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-[#141418] shadow-md animate-popIn">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-gray-300 font-medium text-center truncate max-w-[72px] leading-tight">
                      {u.displayName || u.username}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-xs text-gray-400">
                {searchQuery ? 'No users found matching your search.' : 'No mutual friends found.'}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions Section */}
        <div className="p-4 border-t border-white/[0.08] bg-[#101014]">
          {hasSelectedUsers ? (
            <div className="flex flex-col gap-3 animate-fadeIn">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write a message..."
                className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none px-1"
              />

              <button
                type="button"
                onClick={handleSendToSelectedUsers}
                disabled={isSending}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                <Send size={16} />
                <span>{isSending ? 'Sending...' : 'Надіслати'}</span>
              </button>
            </div>
          ) : (
            <div className="relative flex items-center">
              {/* Left Carousel Arrow */}
              <button
                type="button"
                onClick={() => scrollCarousel('left')}
                className="absolute -left-2 z-10 p-1.5 rounded-full bg-[#1c1c22] border border-white/10 text-gray-300 hover:text-white shadow-lg transition-transform hover:scale-110"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Social Buttons Carousel */}
              <div
                ref={carouselRef}
                className="flex items-center gap-4 overflow-x-auto px-4 py-1 no-scrollbar scroll-smooth"
              >
                {socialButtons.map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={btn.onClick}
                    className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border border-white/10 transition-all duration-200 group-hover:scale-110 shadow-md ${btn.bg}`}
                    >
                      {btn.icon}
                    </div>
                    <span className="text-[11px] text-gray-400 group-hover:text-white transition-colors whitespace-nowrap">
                      {btn.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Right Carousel Arrow */}
              <button
                type="button"
                onClick={() => scrollCarousel('right')}
                className="absolute -right-2 z-10 p-1.5 rounded-full bg-[#1c1c22] border border-white/10 text-gray-300 hover:text-white shadow-lg transition-transform hover:scale-110"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
