import React, { useState, useMemo } from 'react';
import { X, Search, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { followApi, FollowUserSummary } from '@/entities/user';
import { chatApi } from '@/entities/chat';
import { getSocket } from '@/shared/api/socket';
import type { ReelItem } from '../api/reelsApi';
import { useRecordReelShare } from '../api/reelsApi';

interface ReelSendFriendsModalProps {
  reel: ReelItem;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const ReelSendFriendsModal: React.FC<ReelSendFriendsModalProps> = ({
  reel,
  isOpen,
  onClose,
  onShowToast,
}) => {
  const { data: currentUser } = useCurrentUser();
  const myUserId = currentUser?.id ?? '';
  const recordShareMutation = useRecordReelShare();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch following and followers to show friends/connections
  const { data: followingData, isLoading: isFollowingLoading } = useQuery({
    queryKey: ['share-friends-following', myUserId],
    queryFn: () => followApi.getFollowing(myUserId),
    enabled: Boolean(isOpen && myUserId),
  });

  const { data: followersData, isLoading: isFollowersLoading } = useQuery({
    queryKey: ['share-friends-followers', myUserId],
    queryFn: () => followApi.getFollowers(myUserId),
    enabled: Boolean(isOpen && myUserId),
  });

  const friends = useMemo<FollowUserSummary[]>(() => {
    const following = followingData?.items ?? [];
    const followers = followersData?.items ?? [];

    const followerIds = new Set(followers.map((u: FollowUserSummary) => u.id));
    // Prioritize mutual friends
    const mutuals = following.filter(
      (u: FollowUserSummary) => u.followsYou || followerIds.has(u.id),
    );

    const combined = [...mutuals];
    const seen = new Set(mutuals.map((u) => u.id));

    for (const u of following) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        combined.push(u);
      }
    }
    for (const u of followers) {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        combined.push(u);
      }
    }

    // Seed fallback if user has no connections yet
    if (combined.length === 0) {
      return [
        {
          id: 'user-anna',
          username: 'justafreak',
          displayName: 'justafreak',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          bio: null,
          isVerified: false,
          isFollowing: true,
          followsYou: true,
        },
        {
          id: 'user-profkino',
          username: 'profkino',
          displayName: 'PROFKINO',
          avatar:
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
          bio: null,
          isVerified: true,
          isFollowing: true,
          followsYou: true,
        },
      ];
    }

    return combined;
  }, [followingData, followersData]);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.username.toLowerCase().includes(q) ||
        (f.displayName && f.displayName.toLowerCase().includes(q)),
    );
  }, [friends, searchQuery]);

  if (!isOpen) return null;

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSend = async () => {
    if (selectedUserIds.length === 0 || isSending) return;
    setIsSending(true);
    recordShareMutation.mutate(reel.id);

    const reelShareLink = `${window.location.origin}/reels?id=${reel.id}`;
    const trimmedMessage = messageText.trim();
    const socket = getSocket();

    try {
      for (const targetUserId of selectedUserIds) {
        try {
          const directConv = await chatApi.createDirectConversation(targetUserId);
          if (directConv?.id) {
            // 1. Send first message: The Reel video link
            if (socket && socket.connected) {
              socket.emit('sendMessage', {
                conversationId: directConv.id,
                body: reelShareLink,
              });
            } else {
              await chatApi.sendMessage(directConv.id, { text: reelShareLink });
            }

            // 2. Send second message: Accompanying text (if provided)
            if (trimmedMessage) {
              if (socket && socket.connected) {
                socket.emit('sendMessage', {
                  conversationId: directConv.id,
                  body: trimmedMessage,
                });
              } else {
                await chatApi.sendMessage(directConv.id, { text: trimmedMessage });
              }
            }
          }
        } catch {
          // Continue to next recipient on individual error
        }
      }

      onShowToast(
        `Sent to ${selectedUserIds.length} ${selectedUserIds.length === 1 ? 'friend' : 'friends'}!`,
      );
      setSelectedUserIds([]);
      setMessageText('');
      onClose();
    } catch {
      onShowToast('Failed to send video');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md glass-modal border border-black/10 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-2xl text-gray-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching user's Image 1: Search button, Title "Share", Close X */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="p-1.5 rounded-full text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <h2 className="text-gray-900 dark:text-white font-bold text-base sm:text-lg tracking-tight">
            Share
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expandable Search input */}
        {isSearchOpen && (
          <div className="px-5 pt-3 pb-1 border-b border-black/5 dark:border-white/5 animate-in slide-in-from-top-2 duration-150">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full pl-9 pr-3 py-1.5 bg-black/5 dark:bg-zinc-800/80 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500 border border-black/10 dark:border-white/10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Friends Selection Rail / Grid matching user's Image 1 */}
        <div className="px-5 py-4 overflow-x-auto scrollbar-none flex items-center gap-4 min-h-[108px]">
          {isFollowingLoading || isFollowersLoading ? (
            <div className="flex items-center justify-center w-full py-6">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <p className="text-gray-500 dark:text-zinc-500 text-xs text-center w-full py-4">
              No friends found
            </p>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = selectedUserIds.includes(friend.id);
              return (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => toggleSelectUser(friend.id)}
                  className="flex flex-col items-center gap-1.5 group cursor-pointer shrink-0"
                >
                  <div className="relative">
                    {friend.avatar ? (
                      <img
                        src={friend.avatar}
                        alt={friend.username}
                        className={`w-14 h-14 rounded-full object-cover transition-all ${
                          isSelected
                            ? 'ring-2 ring-rose-500 scale-105'
                            : 'ring-1 ring-black/10 dark:ring-white/20 group-hover:ring-rose-400'
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-14 h-14 rounded-full bg-linear-to-tr from-pink-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base transition-all ${
                          isSelected
                            ? 'ring-2 ring-rose-500 scale-105'
                            : 'ring-1 ring-black/10 dark:ring-white/20 group-hover:ring-rose-400'
                        }`}
                      >
                        {friend.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Red Check Badge matching user's Image 1 */}
                    {isSelected && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#fe2c55] border-2 border-white dark:border-[#18181b] flex items-center justify-center shadow-md animate-in zoom-in-75 duration-150">
                        <Check className="w-3 h-3 text-white stroke-[3.5]" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-zinc-300 font-medium truncate max-w-[70px] group-hover:text-gray-950 dark:group-hover:text-white">
                    {friend.displayName || friend.username}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Horizontal Divider Line matching user's Image 1 */}
        <div className="border-t border-black/10 dark:border-white/10 w-full" />

        {/* Message Input & Send Button Section matching user's Image 1 */}
        <div className="p-4 flex flex-col gap-3">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Write a message..."
            rows={2}
            className="w-full bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-hidden resize-none px-1"
          />

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSend}
              disabled={selectedUserIds.length === 0 || isSending}
              className={`px-6 py-2 rounded-xl font-bold text-sm text-white transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                selectedUserIds.length > 0 && !isSending
                  ? 'bg-[#fe2c55] hover:bg-[#e0264b] active:scale-95'
                  : 'bg-black/10 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
