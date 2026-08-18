import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Search,
  Phone,
  Video,
  MoreVertical,
  Minus,
  Square,
  X,
  Pin,
  PinOff,
  Paperclip,
  Smile,
  Mic,
  Send,
  MessageSquare,
} from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import GroupAvatarCollage from '@/shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '@/shared/ui/OnlineStatusIndicator';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useConversations } from '@/features/chat/model/useConversations';
import { useMessages } from '@/features/chat/model/useMessages';
import { useMessageActions } from '@/features/chat/model/useMessageActions';
import { useConversationRealtime } from '@/features/chat/model/useConversationRealtime';
import { useQueryOnlineStatus } from '@/features/chat/model/usePresence';
import { getConversationDisplay } from '@/features/chat/lib/getConversationDisplay';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';
import MessageList from '@/features/chat/ui/MessageList';
import MessageSearchPanel from '@/features/chat/ui/MessageSearchPanel';
import ConversationDetailsPanel from '@/features/chat/ui/ConversationDetailsPanel';
import ForwardMessageModal from '@/features/chat/ui/ForwardMessageModal';
import { MessageView } from '@/entities/chat/model/types';
import { useNavigate } from 'react-router-dom';
import { chatApi } from '@/features/chat/api/chatApi';
import { initCrossTabSync } from '@/shared/lib/broadcastSync';
import { useChatDraftsStore } from '@/features/chat/model/useChatDraftsStore';

export default function StandaloneChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { userId, isAuthenticated } = useAuthStore();
  const { data: conversations, isLoading: isLoadingConversations } = useConversations();

  useEffect(() => {
    initCrossTabSync();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      if (window.opener) {
        window.close();
      } else {
        navigate('/login');
      }
    }
  }, [isAuthenticated, userId, navigate]);

  const conversation = conversations?.find((c) => c.id === conversationId) ?? null;
  const display = conversation ? getConversationDisplay(conversation, userId) : null;
  const otherParticipant =
    conversation && conversation.type !== 'GROUP'
      ? conversation.participants.find((p) => p.userId !== userId)
      : undefined;

  useQueryOnlineStatus(otherParticipant ? [otherParticipant.userId] : []);

  const {
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingMessages,
  } = useMessages(conversationId ?? '');
  const { typingUserIds } = useConversationRealtime(conversationId ?? null);
  const actions = useMessageActions(conversationId ?? '');

  const [text, setText] = useState(() => {
    if (!conversationId) return '';
    return useChatDraftsStore.getState().getDraft(conversationId)?.text || '';
  });
  const [rightPanel, setRightPanel] = useState<'details' | 'search' | null>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageView | null>(() => {
    if (!conversationId) return null;
    return useChatDraftsStore.getState().getDraft(conversationId)?.replyingTo ?? null;
  });
  const [forwardingMessage, setForwardingMessage] = useState<MessageView | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (conversationId) {
      actions.markRead();
      const draft = useChatDraftsStore.getState().getDraft(conversationId);
      if (draft) {
        setText(draft.text || '');
        if (draft.replyingTo) setReplyingTo(draft.replyingTo);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const timeout = setTimeout(() => {
      useChatDraftsStore.getState().setDraft(conversationId, text, replyingTo);
    }, 150);
    return () => clearTimeout(timeout);
  }, [conversationId, text, replyingTo]);

  const handleSend = () => {
    if (!text.trim() || !conversationId) return;
    actions.sendMessage(text.trim(), replyingTo?.id).catch(() => {});
    useChatDraftsStore.getState().clearDraft(conversationId);
    setText('');
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.history.back();
    }
  };

  const isOtherTyping = otherParticipant ? typingUserIds.has(otherParticipant.userId) : false;
  const typingParticipants = conversation
    ? conversation.participants.filter((p) => typingUserIds.has(p.userId)).map((p) => p.user)
    : [];

  const pinnedMessage =
    conversation?.pinnedMessages && conversation.pinnedMessages.length > 0
      ? conversation.pinnedMessages[0]
      : null;

  if (isLoadingConversations) {
    return (
      <div className="fixed inset-0 bg-[#0c1017] flex items-center justify-center text-gray-400">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!conversation || !display) {
    return (
      <div className="fixed inset-0 bg-[#0c1017] flex flex-col items-center justify-center text-gray-400 p-6 text-center">
        <MessageSquare size={48} className="text-gray-600 mb-3" />
        <h2 className="text-lg font-bold text-white mb-1">Chat Not Found</h2>
        <p className="text-sm text-gray-500 mb-4">
          The requested conversation could not be loaded.
        </p>
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
        >
          Close Window
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col bg-[#0b0e14] text-gray-100 select-none overflow-hidden ${
        isMaximized ? '' : 'p-0'
      }`}
    >
      {/* PC Style Liquid Glass Titlebar / Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-[#111622]/90 backdrop-blur-2xl border-b border-white/10 select-none flex-shrink-0 z-30">
        {/* User Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            {display.isGroup ? (
              <GroupAvatarCollage
                avatars={conversation.participants.map((p) => p.user.avatar)}
                size={34}
              />
            ) : (
              <>
                <Avatar size="sm" src={display.avatar} />
                {display.otherUserId && (
                  <OnlineStatusIndicator userId={display.otherUserId} variant="dot" />
                )}
              </>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[14px] font-semibold text-white truncate">{display.title}</span>
              {display.isVerified && <VerifiedCheckmark size="sm" />}
            </div>
            <p className="text-[11.5px] text-gray-400 truncate leading-none mt-0.5">
              {isOtherTyping ? (
                'typing...'
              ) : display.otherUserId ? (
                <OnlineStatusIndicator userId={display.otherUserId} variant="text" />
              ) : (
                `${conversation.participants.length} members`
              )}
            </p>
          </div>
        </div>

        {/* Window Actions & Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setRightPanel((p) => (p === 'search' ? null : 'search'))}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Search"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Audio call"
          >
            <Phone size={16} />
          </button>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Video call"
          >
            <Video size={16} />
          </button>
          <button
            type="button"
            onClick={() => setRightPanel((p) => (p === 'details' ? null : 'details'))}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              rightPanel === 'details'
                ? 'bg-white/15 text-white'
                : 'text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Conversation details"
          >
            <MoreVertical size={16} />
          </button>

          {/* PC Window Controls */}
          <div className="h-4 w-px bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => {}}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus size={15} />
          </button>
          <button
            type="button"
            onClick={handleToggleMaximize}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Square size={13} />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Chat Body & Panels */}
      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col min-w-0 bg-[#0d111a]/70">
          {/* Pinned Message Banner (matching Image 2) */}
          {pinnedMessage && (
            <div className="flex items-center justify-between px-4 py-2 bg-[#141926]/90 border-b border-sky-500/20 text-xs backdrop-blur-xl flex-shrink-0">
              <div
                onClick={() => setHighlightMessageId(pinnedMessage.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              >
                <div className="w-0.5 h-6 bg-sky-400 rounded-full flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-sky-400 flex items-center gap-1 leading-none">
                    <Pin size={11} /> Pinned message
                  </span>
                  <p className="text-gray-300 text-[12px] truncate mt-0.5 group-hover:text-white">
                    {pinnedMessage.body || 'Attachment'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => actions.unpinMessage(pinnedMessage.id).catch(() => {})}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-2"
                title="Unpin message"
              >
                <PinOff size={13} />
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 min-h-0 flex flex-col">
            <MessageList
              messages={messages}
              currentUserId={userId}
              otherParticipantId={otherParticipant?.userId ?? null}
              otherParticipant={otherParticipant}
              display={display}
              hasMore={!!hasNextPage}
              isLoading={isLoadingMessages}
              isFetchingMore={isFetchingNextPage}
              typingParticipants={typingParticipants}
              isGroup={conversation.type === 'GROUP'}
              onLoadMore={fetchNextPage}
              onReply={setReplyingTo}
              onEdit={(message) => {
                const nextBody = window.prompt('Edit message', message.body ?? '');
                if (nextBody && nextBody !== message.body)
                  actions.editMessage(message.id, nextBody).catch(() => {});
              }}
              onDelete={(messageId, forAll) => {
                actions.deleteMessage(messageId, forAll).catch(() => {});
              }}
              onForward={setForwardingMessage}
              onTogglePin={(message) => {
                if (message.isPinned) actions.unpinMessage(message.id).catch(() => {});
                else actions.pinMessage(message.id).catch(() => {});
              }}
              onReport={(message) => {
                if (otherParticipant) {
                  chatApi.reportUser(otherParticipant.userId, 'MESSAGE', message.id);
                }
              }}
              onReact={actions.addReaction}
              onUnreact={actions.removeReaction}
              onMarkRead={actions.markRead}
              highlightMessageId={highlightMessageId}
              onHighlightHandled={() => setHighlightMessageId(null)}
            />
          </div>

          {/* Replying banner */}
          {replyingTo && (
            <div className="flex items-center justify-between px-4 py-2 bg-[#161a26]/95 border-t border-white/10 text-xs flex-shrink-0">
              <div className="min-w-0">
                <span className="text-sky-400 font-semibold">
                  Replying to {replyingTo.sender.displayName || replyingTo.sender.username}
                </span>
                <p className="text-gray-400 truncate">{replyingTo.body || 'Attachment'}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-full"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Bottom Message Composer */}
          <div className="p-3 bg-[#111520]/90 backdrop-blur-2xl border-t border-white/10 flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
              title="Attach file"
            >
              <Paperclip size={18} />
            </button>

            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a message..."
                className="w-full h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
            </div>

            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
              title="Emoji"
            >
              <Smile size={19} />
            </button>

            {text.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400 transition-colors flex-shrink-0"
                title="Send message"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
                title="Record voice message"
              >
                <Mic size={19} />
              </button>
            )}
          </div>
        </div>

        {/* Side Panels */}
        {rightPanel === 'details' && (
          <ConversationDetailsPanel
            conversation={conversation}
            display={display}
            otherUserId={otherParticipant?.userId ?? null}
            messages={messages}
            onClose={() => setRightPanel(null)}
            onOpenSearch={() => setRightPanel('search')}
            onJumpToMessage={(msgId) => {
              setRightPanel(null);
              setHighlightMessageId(msgId);
            }}
          />
        )}

        {rightPanel === 'search' && (
          <MessageSearchPanel
            conversationId={conversation.id}
            onClose={() => setRightPanel(null)}
            onJumpToMessage={(msgId) => {
              setRightPanel(null);
              setHighlightMessageId(msgId);
            }}
          />
        )}
      </div>

      {forwardingMessage && (
        <ForwardMessageModal
          onClose={() => setForwardingMessage(null)}
          onForward={(conversationIds) => {
            actions.forwardMessage(forwardingMessage.id, conversationIds).catch(() => {});
            setForwardingMessage(null);
          }}
        />
      )}
    </div>
  );
}
