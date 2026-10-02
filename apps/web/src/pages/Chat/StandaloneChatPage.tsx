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
  Check,
  Pencil,
} from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import GroupAvatarCollage from '@/shared/ui/GroupAvatarCollage';
import OnlineStatusIndicator from '@/shared/ui/OnlineStatusIndicator';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useConversations } from '@/features/chat/model/useConversations';
import { useMessages } from '@/features/chat/model/useMessages';
import { useMessageActions } from '@/features/chat/model/useMessageActions';
import { useConversationRealtime } from '@/features/chat/model/useConversationRealtime';
import { useChatGapFill } from '@/features/chat/model/useChatGapFill';
import { useQueryOnlineStatus } from '@/features/chat/model/usePresence';
import { getConversationDisplay } from '@/features/chat/lib/getConversationDisplay';
import { useDecryptedMessageBody } from '@/features/chat/model/useDecryptedMessageBody';
import {
  E2eePinChangedError,
  ensureMessageIdentityRegistered,
  extractPlainPreview,
} from '@/features/chat/lib/e2ee/messageE2ee';
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
import { SEOHead } from '@/shared/seo';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';

export default function StandaloneChatPage() {
  const { dockOffset } = useSpotifyDockOffset();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.userId);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: conversations, isLoading: isLoadingConversations } = useConversations();

  useEffect(() => {
    initCrossTabSync();
    void ensureMessageIdentityRegistered();
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
  useChatGapFill(conversationId ? [conversationId] : []);
  const actions = useMessageActions(conversationId ?? '');

  const [text, setText] = useState(() => {
    if (!conversationId) return '';
    return useChatDraftsStore.getState().getDraft(conversationId)?.text || '';
  });
  const [rightPanel, setRightPanel] = useState<'details' | 'search' | null>(null);
  const [renderedPanel, setRenderedPanel] = useState<'details' | 'search' | null>(null);
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const panelCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rightPanel) {
      if (panelCloseTimerRef.current) {
        clearTimeout(panelCloseTimerRef.current);
        panelCloseTimerRef.current = null;
      }
      setIsPanelClosing(false);
      setRenderedPanel(rightPanel);
    } else if (renderedPanel) {
      setIsPanelClosing(true);
      panelCloseTimerRef.current = setTimeout(() => {
        setRenderedPanel(null);
        setIsPanelClosing(false);
        panelCloseTimerRef.current = null;
      }, 300);
    }
  }, [rightPanel]);

  useEffect(() => {
    return () => {
      if (panelCloseTimerRef.current) {
        clearTimeout(panelCloseTimerRef.current);
      }
    };
  }, []);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageView | null>(() => {
    if (!conversationId) return null;
    return useChatDraftsStore.getState().getDraft(conversationId)?.replyingTo ?? null;
  });
  const [editingMessage, setEditingMessage] = useState<MessageView | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageView | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Decrypted quote for the reply banner (same dialog, same peer).
  const replyingPreview = useDecryptedMessageBody(
    replyingTo?.body ?? null,
    conversation?.type === 'GROUP' ? null : (otherParticipant?.userId ?? null),
    replyingTo?.conversationId ?? conversationId,
    replyingTo?.sender?.id ?? null,
  );

  const { markRead } = actions;

  // Global Ctrl+F / Cmd+F shortcut to smoothly open/toggle search panel in chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isF = e.code === 'KeyF' || e.key?.toLowerCase() === 'f' || e.key?.toLowerCase() === 'а';
      if ((e.ctrlKey || e.metaKey) && isF) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setRightPanel((prev) => (prev === 'search' ? null : 'search'));
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  useEffect(() => {
    if (conversationId) {
      markRead();
      const draft = useChatDraftsStore.getState().getDraft(conversationId);
      if (draft) {
        setText(draft.text || '');
        if (draft.replyingTo) setReplyingTo(draft.replyingTo);
      }
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    if (!conversationId) return;
    const timeout = setTimeout(() => {
      useChatDraftsStore.getState().setDraft(conversationId, text, replyingTo);
    }, 150);
    return () => clearTimeout(timeout);
  }, [conversationId, text, replyingTo]);

  const handleSend = () => {
    if (!text.trim() || !conversationId) return;
    actions.sendMessage(text.trim(), replyingTo?.id).catch((err: unknown) => {
      // Suspected key substitution blocks the send (fail closed) — explain.
      if (err instanceof E2eePinChangedError) {
        setSendError(
          'This contact\u2019s security key changed. Sending is blocked to protect your messages.',
        );
        setTimeout(() => setSendError(null), 6000);
      }
    });
    useChatDraftsStore.getState().clearDraft(conversationId);
    setText('');
    setReplyingTo(null);
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !text.trim() || !conversationId) return;
    actions.editMessage(editingMessage.id, text.trim(), editingMessage.body).catch(() => {});
    setEditingMessage(null);
    setText('');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (editingMessage) {
        e.preventDefault();
        handleCancelEdit();
        return;
      }
      if (replyingTo) {
        e.preventDefault();
        setReplyingTo(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleSaveEdit();
      } else {
        handleSend();
      }
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
      <SEOHead
        title={`${display.title || 'Chat'} • Messages`}
        description="Direct and group messaging on Eternal."
        noindex={true}
      />
      {/* PC Style Liquid Glass Titlebar / Header */}
      <div className="flex items-center justify-between px-4 h-14 bg-[#111622]/90 backdrop-blur-2xl border-b border-white/10 select-none shrink-0 z-30">
        {/* User Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            {display.isGroup ? (
              display.avatar ? (
                <Avatar size="sm" src={display.avatar} />
              ) : (
                <GroupAvatarCollage
                  avatars={conversation.participants.map((p) => p.user.avatar)}
                  size={34}
                />
              )
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
              <VerifiedCheckmark
                isVerified={display.isVerified}
                primaryBadge={display.primaryBadge}
                size="sm"
              />
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
        <div className="flex items-center gap-1 shrink-0">
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
            <div className="flex items-center justify-between px-4 py-2 bg-[#141926]/90 border-b border-sky-500/20 text-xs backdrop-blur-xl shrink-0">
              <div
                onClick={() => setHighlightMessageId(pinnedMessage.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
              >
                <div className="w-0.5 h-6 bg-sky-400 rounded-full shrink-0" />
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
              onReply={(message) => {
                setEditingMessage(null);
                setReplyingTo(message);
              }}
              onEdit={(message) => {
                setReplyingTo(null);
                setEditingMessage(message);
                setText(extractPlainPreview(message.body || ''));
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

          {/* Editing banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-4 py-2 bg-[#161a26]/95 border-t border-white/10 text-xs shrink-0 select-none">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Pencil size={16} className="text-purple-400 shrink-0" />
                <div className="w-[3px] h-7 rounded-full shrink-0 bg-purple-500" />
                <div className="min-w-0">
                  <span className="text-purple-400 font-semibold block">Editing</span>
                  <p className="text-gray-300 truncate">
                    {extractPlainPreview(editingMessage.body || '')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-full cursor-pointer"
                title="Cancel (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Replying banner */}
          {replyingTo && !editingMessage && (
            <div className="flex items-center justify-between px-4 py-2 bg-[#161a26]/95 border-t border-white/10 text-xs shrink-0">
              <div className="min-w-0">
                <span className="text-sky-400 font-semibold">
                  Replying to {replyingTo.sender.displayName || replyingTo.sender.username}
                </span>
                <p className="text-gray-400 truncate">{replyingPreview || 'Attachment'}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded-full cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Bottom Message Composer */}
          {sendError && (
            <div className="mx-3 mb-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 shrink-0">
              {sendError}
            </div>
          )}
          <div
            className="p-3 bg-[#111520]/90 backdrop-blur-2xl border-t border-white/10 flex items-center gap-2 shrink-0 transition-[padding-bottom] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ paddingBottom: `${12 + dockOffset}px` }}
          >
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
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
                placeholder={editingMessage ? 'Edit message...' : 'Write a message...'}
                className="w-full h-10 px-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
              title="Emoji"
            >
              <Smile size={19} />
            </button>

            {editingMessage ? (
              <button
                type="button"
                onClick={handleSaveEdit}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition-colors shrink-0 cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.5)]"
                title="Save changes (Enter)"
              >
                <Check size={18} strokeWidth={2.8} />
              </button>
            ) : text.trim() ? (
              <button
                type="button"
                onClick={handleSend}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-500 text-white hover:bg-sky-400 transition-colors shrink-0 cursor-pointer"
                title="Send message"
              >
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-colors shrink-0"
                title="Record voice message"
              >
                <Mic size={19} />
              </button>
            )}
          </div>
        </div>

        {/* Smooth Animated Right Drawer Container */}
        <aside
          aria-label="Chat side panel"
          className={`h-full flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            rightPanel && !isPanelClosing ? 'w-[340px]' : 'w-0'
          }`}
        >
          <div
            className={`w-[340px] h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              rightPanel && !isPanelClosing
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4 pointer-events-none'
            }`}
          >
            {renderedPanel === 'details' && (
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

            {renderedPanel === 'search' && (
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
        </aside>
      </div>

      {forwardingMessage && (
        <ForwardMessageModal
          onClose={() => setForwardingMessage(null)}
          onForward={(conversationIds) => {
            actions.forwardMessage(forwardingMessage, conversationIds).catch(() => {});
            setForwardingMessage(null);
          }}
        />
      )}
    </div>
  );
}
