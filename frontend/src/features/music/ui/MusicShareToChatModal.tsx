import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Send, MessageCircle, Check, Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { followApi, FollowUserSummary } from '@/features/follow/api/followApi';
import { useQuery } from '@tanstack/react-query';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { chatApi } from '@/features/chat/api/chatApi';
import { getSocket } from '@/shared/api/socket';
import Avatar from '@/shared/ui/Avatar';

interface MusicShareToChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  shareUrl: string;
}

export const MusicShareToChatModal: React.FC<MusicShareToChatModalProps> = ({
  isOpen,
  onClose,
  title,
  shareUrl,
}) => {
  const { data: currentUser } = useCurrentUser();
  const myUserId = currentUser?.id ?? '';
  const showToast = (title: string, body: string) => {
    useMessageToastStore.getState().addToast({
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: '',
      messageId: '',
      title,
      body,
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch following
  const { data: followingData, isLoading } = useQuery({
    queryKey: ['music-share-friends', myUserId],
    queryFn: () => followApi.getFollowing(myUserId),
    enabled: Boolean(isOpen && myUserId),
  });

  const friends = useMemo<FollowUserSummary[]>(() => {
    if (!followingData?.items) return [];
    if (!searchQuery.trim()) return followingData.items;
    const q = searchQuery.toLowerCase().trim();
    return followingData.items.filter(
      (u: FollowUserSummary) =>
        u.username.toLowerCase().includes(q) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)),
    );
  }, [followingData, searchQuery]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!selectedUserId || isSending) return;
    setIsSending(true);

    try {
      const fullText = messageText.trim()
        ? `${messageText.trim()}\n🎵 ${title}\n${shareUrl}`
        : `🎵 ${title}\n${shareUrl}`;

      const directConv = await chatApi.createDirectConversation(selectedUserId);
      if (directConv?.id) {
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('sendMessage', {
            conversationId: directConv.id,
            body: fullText,
          });
        } else {
          await chatApi.sendMessage(directConv.id, { text: fullText });
        }
      }

      showToast('Sent', `Music sent to chat!`);
      setSelectedUserId(null);
      setMessageText('');
      onClose();
    } catch {
      showToast('Error', 'Failed to send message to chat');
    } finally {
      setIsSending(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-2xl bg-[#14141a]/95 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl text-white flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600/15 text-purple-400">
                <MessageCircle size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Share to chat</h3>
                <p className="text-xs text-gray-400 truncate max-w-[260px]">{title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mt-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Friends list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-1 max-h-56 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 size={20} className="animate-spin text-purple-400" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">No contacts found.</div>
            ) : (
              friends.map((user) => {
                const isSelected = selectedUserId === user.id;
                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-600/20 border border-purple-500/30 text-white'
                        : 'hover:bg-white/5 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar src={user.avatar} alt={user.displayName || user.username} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-white">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">@{user.username}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/30">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Optional message note */}
          <div className="pt-2 border-t border-white/10">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Add a message (optional)..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-purple-400/50"
            />
          </div>

          {/* Send button */}
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedUserId || isSending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Send</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};
