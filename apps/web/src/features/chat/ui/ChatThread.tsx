import { useActiveMediaPlaybackStore } from '@/shared/model/useActiveMediaPlaybackStore';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useSpotifyDockOffset } from '@/shared/model/useSpotifyDockOffset';
import { useStagedAttachments } from '@/shared/model/useStagedAttachments';
import { useUIStore } from '@/shared/model/useUIStore';
import AttachmentDropZone from '@/shared/ui/AttachmentDropZone';
import { Archive, ArchiveRestore, CheckSquare, Copy, Forward, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { chatApi } from '../api/chatApi';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { formatMessageTime } from '../lib/groupMessagesByDate';
import { promptEditMessage } from '../lib/promptEditMessage';
import { getChatBackgroundStyle, parseChatTheme, updateMetaThemeColor } from '../lib/themeUtils';
import { useCall } from '../model/CallContext';
import { useChatGapFill } from '../model/useChatGapFill';
import { useChatTheme } from '../model/useChatTheme';
import { useArchiveConversation } from '../model/useConversationMutations';
import { useConversationRealtime } from '../model/useConversationRealtime';
import { useMessageActions } from '../model/useMessageActions';
import { useMessages } from '../model/useMessages';
import { useQueryOnlineStatus } from '../model/usePresence';
import { useMeshVoiceRoom } from '../model/useMeshVoiceRoom';
import BatchDeleteModal from './BatchDeleteModal';
import BlockedComposerBanner from './BlockedComposerBanner';
import { CallHandoffBanner } from './Call/CallHandoffBanner';
import ChatDatePicker from './ChatDatePicker';
import ChatThreadHeader from './ChatThreadHeader';
import { DiscordVoiceChannelBar } from './DiscordVoiceChannelBar';
import ConversationDetailsPanel from './ConversationDetailsPanel';
import ForwardMessageModal from './ForwardMessageModal';
import GlobalMediaPlaybackBar from './GlobalMediaPlaybackBar';
import MessageComposer from './MessageComposer';
import MessageList from './MessageList';
import MessageSearchPanel from './MessageSearchPanel';
import PinnedMessagesBar from './PinnedMessagesBar';
import PinnedMessagesModal from './PinnedMessagesModal';
import ProceduralChatBackground from './ProceduralChatBackground';

interface ChatThreadProps {
  conversation: ConversationView;
}

type RightPanel = 'details' | 'search' | null;

export default function ChatThread({ conversation }: ChatThreadProps) {
  const userId = useAuthStore((s) => s.userId);
  const [searchParams] = useSearchParams();
  const initialMessageId = searchParams.get('messageId');
  const display = getConversationDisplay(conversation, userId);
  const otherParticipant =
    conversation.type === 'GROUP'
      ? undefined
      : conversation.participants.find((p) => p.userId !== userId);
  const myParticipant = conversation.participants.find((p) => p.userId === userId);

  useQueryOnlineStatus(otherParticipant ? [otherParticipant.userId] : []);

  const { theme: chatTheme, applyTheme } = useChatTheme(
    conversation.id,
    conversation.myTheme,
    conversation.sharedTheme,
  );
  const bgStyle = getChatBackgroundStyle(chatTheme);

  // Synchronize browser status bar / mobile meta theme-color with active chat theme
  useEffect(() => {
    updateMetaThemeColor(chatTheme);
  }, [chatTheme]);

  const {
    messages,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isLoadingMessages,
  } = useMessages(conversation.id);
  const { typingUserIds } = useConversationRealtime(conversation.id);
  // Offline-first: on reconnect, fetch the REST `after`-delta for this
  // thread (Snowflake cursor) to fill anything the WS buffer missed.
  useChatGapFill([conversation.id]);
  const actions = useMessageActions(conversation.id);
  const archiveConversation = useArchiveConversation();
  const { initiateCall } = useCall();
  const voiceRoom = useMeshVoiceRoom();
  const isVoiceInThisRoom = voiceRoom.isConnected && voiceRoom.currentRoomId === conversation.id;

  const [replyingTo, setReplyingTo] = useState<MessageView | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<MessageView | null>(null);
  const [isBatchForwardOpen, setIsBatchForwardOpen] = useState(false);
  const [isBatchDeleteOpen, setIsBatchDeleteOpen] = useState(false);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Date picker state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerInitialDate, setDatePickerInitialDate] = useState<Date | null>(null);
  const [datePickerAnchorRect, setDatePickerAnchorRect] = useState<DOMRect | null>(null);
  const [highlightDateLabel, setHighlightDateLabel] = useState<string | null>(null);
  const [isAnchoredInHistory, setIsAnchoredInHistory] = useState(false);

  // Multi-selection state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const staged = useStagedAttachments();
  const [rightPanel, setRightPanel] = useState<RightPanel>(null);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(initialMessageId);

  const isOtherTyping = otherParticipant ? typingUserIds.has(otherParticipant.userId) : false;
  const typingParticipants = conversation.participants
    .filter((p) => typingUserIds.has(p.userId))
    .map((p) => p.user);

  const isBlocked = conversation.type !== 'GROUP' && conversation.isBlocked;
  const { composerPaddingBottom } = useSpotifyDockOffset(8);
  const isChatListExpanded = useUIStore((s) => s.isChatListExpanded);

  const chatPaneRef = useRef<HTMLDivElement | null>(null);
  const [paneWidth, setPaneWidth] = useState<number>(0);

  useEffect(() => {
    const el = chatPaneRef.current;
    if (!el) return;
    setPaneWidth(el.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          setPaneWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isExpandedChat = !isChatListExpanded && !rightPanel;
  // Adaptive Telegram-style column width that extends almost to the edges ("near the edges of available space")
  // and stays straight, symmetrical and perfectly centered inside the active chat thread pane without transforms.
  const composerMaxWidth = useMemo(() => {
    const effectiveWidth =
      paneWidth ||
      (typeof window !== 'undefined'
        ? window.innerWidth < 1024
          ? window.innerWidth - 64
          : window.innerWidth - 384
        : 880);

    // Mobile (<640px): 6px padding on left & right
    if (effectiveWidth < 640) {
      return Math.max(280, effectiveWidth - 12);
    }
    // Tablet / compact desktop (<1024px): 12px padding on left & right ("near the edges of available space")
    if (effectiveWidth < 1024) {
      return Math.max(280, effectiveWidth - 24);
    }
    // Wide desktop: clean Telegram column (920px to 1000px if expanded)
    return Math.min(effectiveWidth - 32, isExpandedChat ? 1000 : 920);
  }, [paneWidth, isExpandedChat]);

  const horizontalShift = 0;

  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    actionsRef.current.markRead();
  }, [conversation.id]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ conversationId?: string }>;
      if (
        !customEvent.detail?.conversationId ||
        customEvent.detail.conversationId === conversation.id
      ) {
        setRightPanel('details');
      }
    };
    window.addEventListener('open-edit-group', handler);
    return () => window.removeEventListener('open-edit-group', handler);
  }, [conversation.id]);

  // Sync playlist queue for active conversation
  const { setPlaylist, setCurrentViewingChatId } = useActiveMediaPlaybackStore();

  useEffect(() => {
    setCurrentViewingChatId(conversation.id);
    return () => setCurrentViewingChatId(null);
  }, [conversation.id, setCurrentViewingChatId]);

  useEffect(() => {
    const mediaItems: Array<{
      id: string;
      mediaType: 'voice' | 'video';
      url: string;
      senderName: string;
      senderAvatar?: string | null;
      conversationId?: string | null;
      conversationTitle?: string | null;
      sentAt?: string | null;
      duration?: number;
    }> = [];

    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    sorted.forEach((m) => {
      m.attachments?.forEach((a) => {
        const isVideoNote =
          a.type === 'VIDEO' &&
          (a.fileName?.includes('video_note') ||
            a.mimeType?.includes('video_note') ||
            (a.width && a.height && a.width === a.height));
        const isAudio = a.type === 'AUDIO';

        if (isVideoNote || isAudio) {
          mediaItems.push({
            id: a.id,
            mediaType: isVideoNote ? 'video' : 'voice',
            url: a.url,
            senderName: m.sender.id === userId ? 'You' : m.sender.displayName || m.sender.username,
            senderAvatar: m.sender.avatar,
            conversationId: conversation.id,
            conversationTitle: display.title,
            sentAt: formatMessageTime(m.createdAt),
            duration: a.duration || 0,
          });
        }
      });
    });

    if (mediaItems.length > 0) {
      setPlaylist(mediaItems, conversation.id);
    }
  }, [messages, conversation.id, userId, display.title, setPlaylist]);

  const [highlightResetKey, setHighlightResetKey] = useState(
    `${conversation.id}:${initialMessageId}`,
  );
  const currentHighlightKey = `${conversation.id}:${initialMessageId}`;
  if (currentHighlightKey !== highlightResetKey) {
    setHighlightResetKey(currentHighlightKey);
    setHighlightMessageId(initialMessageId);
  }

  useEffect(() => {
    if (!highlightMessageId) return;
    const alreadyLoaded = messages.some((m) => m.id === highlightMessageId);
    if (!alreadyLoaded && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [highlightMessageId, messages, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleJumpToMessage = (messageId: string) => {
    setRightPanel(null);
    setHighlightMessageId(messageId);
  };

  const handleOpenDatePicker = (initialDate?: Date, anchorRect?: DOMRect) => {
    setDatePickerInitialDate(initialDate || null);
    setDatePickerAnchorRect(anchorRect || null);
    setIsDatePickerOpen(true);
  };

  const handleJumpToDate = async (targetDate: Date) => {
    setIsDatePickerOpen(false);

    const targetY = targetDate.getFullYear();
    const targetM = targetDate.getMonth();
    const targetD = targetDate.getDate();

    const matchingMsg = messages.find((m) => {
      const d = new Date(m.createdAt);
      return d.getFullYear() === targetY && d.getMonth() === targetM && d.getDate() === targetD;
    });

    const label = targetDate.toLocaleDateString([], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const now = new Date();
    const isToday =
      now.getFullYear() === targetY && now.getMonth() === targetM && now.getDate() === targetD;
    const isYesterday =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString() ===
      targetDate.toDateString();
    const resolvedLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : label;

    if (matchingMsg) {
      setHighlightMessageId(matchingMsg.id);
      setHighlightDateLabel(resolvedLabel);
      setTimeout(() => setHighlightDateLabel(null), 1600);
      return;
    }

    const res = await actions.loadAroundDate(targetDate.toISOString());
    setIsAnchoredInHistory(true);
    if (res && res.data && res.data.length > 0) {
      const firstOnDate =
        res.data.find((m) => {
          const d = new Date(m.createdAt);
          return d.getFullYear() === targetY && d.getMonth() === targetM && d.getDate() === targetD;
        }) || res.data[0];

      setHighlightMessageId(firstOnDate.id);
      setHighlightDateLabel(resolvedLabel);
      setTimeout(() => setHighlightDateLabel(null), 1600);
    }
  };

  const handleDelete = (messageId: string, forAll: boolean) => {
    actions.deleteMessage(messageId, forAll).catch(() => {});
  };

  const handleTogglePin = (message: MessageView) => {
    if (message.isPinned) actions.unpinMessage(message.id).catch(() => {});
    else actions.pinMessage(message.id).catch(() => {});
  };

  const handleReport = (message: MessageView) => {
    if (!otherParticipant) return;
    chatApi.reportUser(otherParticipant.userId, 'MESSAGE', message.id);
  };

  // Shift + Click Range Selection & Toggle Selection
  const handleToggleSelectMessage = (messageId: string, isShift: boolean) => {
    setIsSelectionMode(true);
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);

      if (isShift && lastSelectedId && lastSelectedId !== messageId) {
        const msgIds = messages.map((m) => m.id);
        const idx1 = msgIds.indexOf(lastSelectedId);
        const idx2 = msgIds.indexOf(messageId);
        if (idx1 !== -1 && idx2 !== -1) {
          const start = Math.min(idx1, idx2);
          const end = Math.max(idx1, idx2);
          for (let i = start; i <= end; i++) {
            next.add(msgIds[i]);
          }
          return next;
        }
      }

      if (next.has(messageId)) {
        next.delete(messageId);
        if (next.size === 0) {
          setIsSelectionMode(false);
        }
      } else {
        next.add(messageId);
      }
      return next;
    });
    setLastSelectedId(messageId);
  };

  // Batch formatted copy
  const handleCopyFormatted = () => {
    if (selectedMessageIds.size === 0) return;
    const selectedMsgs = messages
      .filter((m) => selectedMessageIds.has(m.id))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const formattedText = selectedMsgs
      .map((m) => {
        const time = formatMessageTime(m.createdAt);
        const sender = m.sender.displayName ?? m.sender.username ?? 'User';
        const content = m.body || (m.attachments?.length ? '[Attachment]' : '');
        return `[${time}] ${sender}: ${content}`;
      })
      .join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(formattedText);
      setCopyToast(`Copied ${selectedMsgs.length} formatted messages`);
      setTimeout(() => setCopyToast(null), 2500);
    }
  };

  const handleConfirmBatchDelete = (forAll: boolean) => {
    const ids = Array.from(selectedMessageIds);
    actions.batchDeleteMessages(ids, forAll).catch(() => {});
    setIsBatchDeleteOpen(false);
    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
  };

  const handleConfirmBatchForward = (conversationIds: string[], hideAuthor: boolean) => {
    const ids = Array.from(selectedMessageIds);
    actions.batchForwardMessages(ids, conversationIds, hideAuthor).catch(() => {});
    setIsBatchForwardOpen(false);
    setSelectedMessageIds(new Set());
    setIsSelectionMode(false);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
    setLastSelectedId(null);
  };

  return (
    <div className="flex-1 flex h-full min-w-0">
      <div ref={chatPaneRef} className="flex-1 flex flex-col h-full min-w-0">
        <ChatThreadHeader
          conversationId={conversation.id}
          display={display}
          otherUserId={otherParticipant?.userId ?? null}
          isOtherTyping={isOtherTyping}
          isDetailsOpen={rightPanel === 'details'}
          onToggleDetails={() => setRightPanel((p) => (p === 'details' ? null : 'details'))}
          isGroup={conversation.type === 'GROUP'}
          memberAvatars={conversation.participants.map((p) => p.user.avatar)}
          memberCount={conversation.participants.length}
          onStartCall={(type) => {
            const targetUser = otherParticipant?.user ?? {
              id: conversation.id,
              username: display.title,
              displayName: display.title,
              avatar: display.avatar,
              isOnline: true,
            };
            void initiateCall({
              conversationId: conversation.id,
              callType: type,
              remoteUser: targetUser,
            });
          }}
          onStartVoiceMesh={() => {
            if (isVoiceInThisRoom) {
              voiceRoom.leaveRoom();
            } else {
              void voiceRoom.joinRoom(conversation.id);
            }
          }}
          isVoiceMeshActive={isVoiceInThisRoom}
        />

        {isVoiceInThisRoom && (
          <DiscordVoiceChannelBar
            roomName={display.title}
            peerCount={voiceRoom.peers.length}
            isMuted={voiceRoom.isMuted}
            isDeafened={voiceRoom.isDeafened}
            isLocalSpeaking={voiceRoom.isLocalSpeaking}
            speakingPeerCount={voiceRoom.speakingPeers.size}
            onToggleMute={voiceRoom.toggleMute}
            onToggleDeafen={voiceRoom.toggleDeafen}
            onDisconnect={voiceRoom.leaveRoom}
          />
        )}

        {conversation.isArchived && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-200 text-xs backdrop-blur-md transition-all">
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-amber-400 shrink-0" />
              <span>
                This conversation is archived. New messages won't trigger push notifications.
              </span>
            </div>
            <button
              onClick={() =>
                archiveConversation.mutate({ conversationId: conversation.id, archived: false })
              }
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 font-medium text-xs border border-amber-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <ArchiveRestore size={13} />
              Unarchive
            </button>
          </div>
        )}

        <CallHandoffBanner />

        <GlobalMediaPlaybackBar
          onNearQueueEnd={hasNextPage && !isFetchingNextPage ? fetchNextPage : undefined}
        />

        <PinnedMessagesBar
          pinnedMessages={conversation.pinnedMessages}
          onJumpToMessage={handleJumpToMessage}
          onUnpin={(messageId) => actions.unpinMessage(messageId).catch(() => {})}
          onOpenAllPinned={() => setIsPinnedModalOpen(true)}
        />

        <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Isolated Hardware-Accelerated Background Layer */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={bgStyle}>
            {chatTheme.backgroundType === 'shader' && (
              <ProceduralChatBackground
                shaderId={chatTheme.shaderPresetId || 'neon-smoke'}
                audioReactive={chatTheme.audioReactive ?? true}
                parallax3d={chatTheme.parallax3d ?? true}
              />
            )}
            {chatTheme.backgroundType === 'image' && chatTheme.bgImageUrl && (
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: `rgba(0, 0, 0, ${1 - (chatTheme.bgBrightness ?? 0.8)})`,
                  backdropFilter: chatTheme.bgBlur ? `blur(${chatTheme.bgBlur}px)` : undefined,
                  WebkitBackdropFilter: chatTheme.bgBlur
                    ? `blur(${chatTheme.bgBlur}px)`
                    : undefined,
                }}
              />
            )}
          </div>

          <AttachmentDropZone
            onFilesDropped={staged.addFiles}
            className="relative z-10 flex-1 flex flex-col min-h-0 bg-transparent"
          >
            <MessageList
              messages={messages}
              currentUserId={userId}
              otherParticipantId={otherParticipant?.userId ?? null}
              conversationId={conversation.id}
              contentMaxWidth={composerMaxWidth}
              horizontalShift={horizontalShift}
              onThemeAccepted={(themeStr) => applyTheme(parseChatTheme(themeStr))}
              otherParticipant={otherParticipant}
              display={display}
              hasMore={!!hasNextPage}
              isLoading={isLoadingMessages}
              isFetchingMore={isFetchingNextPage}
              typingParticipants={typingParticipants}
              isGroup={conversation.type === 'GROUP'}
              isSelectionMode={isSelectionMode}
              selectedMessageIds={selectedMessageIds}
              chatTheme={chatTheme}
              onToggleSelectMessage={handleToggleSelectMessage}
              onLoadMore={fetchNextPage}
              onReply={setReplyingTo}
              onEdit={(message) => {
                void promptEditMessage(
                  message,
                  otherParticipant?.userId ?? null,
                  actions.editMessage,
                );
              }}
              onDelete={handleDelete}
              onForward={setForwardingMessage}
              onTogglePin={handleTogglePin}
              onReport={handleReport}
              onReact={actions.addReaction}
              onUnreact={actions.removeReaction}
              onMarkRead={actions.markRead}
              highlightMessageId={highlightMessageId}
              onHighlightHandled={() => setHighlightMessageId(null)}
              onJumpToMessage={handleJumpToMessage}
              onLoadAround={actions.loadAroundMessages}
              onOpenDatePicker={handleOpenDatePicker}
              highlightDateLabel={highlightDateLabel}
              isAnchoredInHistory={isAnchoredInHistory}
              onResetToLive={async () => {
                setIsAnchoredInHistory(false);
                await actions.resetToLive();
              }}
              onLoadOlder={() => {
                if (messages.length > 0) actions.loadOlderMessages(messages[0].id);
              }}
              onLoadNewer={() => {
                if (messages.length > 0)
                  actions.loadNewerMessages(messages[messages.length - 1].id);
              }}
              onRetry={(msgId) => {
                actions.retrySendMessage(msgId).catch(() => {});
              }}
            />

            {/* Copy Toast Feedback */}
            {copyToast && (
              <div className="mx-auto my-1 px-4 py-1.5 rounded-full bg-black/80 border border-sky-400/40 text-xs text-sky-300 backdrop-blur-xl shadow-lg animate-fadeIn select-none">
                {copyToast}
              </div>
            )}

            {/* Batch Actions Bar */}
            {isSelectionMode && (
              <div
                className="w-full mx-auto px-1 sm:px-2 mb-2 transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-20"
                style={{
                  maxWidth: `${composerMaxWidth}px`,
                }}
              >
                <div className="p-2.5 rounded-2xl bg-[#181a22]/95 border border-white/15 backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-2 animate-popIn">
                  <div className="flex items-center gap-2 pl-2">
                    <CheckSquare size={16} className="text-sky-400" />
                    <span className="text-xs font-semibold text-white">
                      {selectedMessageIds.size} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyFormatted}
                      disabled={selectedMessageIds.size === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white text-xs font-medium transition disabled:opacity-40"
                      title="Copy formatted messages"
                    >
                      <Copy size={13} />
                      <span>Copy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsBatchForwardOpen(true)}
                      disabled={selectedMessageIds.size === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-medium border border-sky-400/30 transition disabled:opacity-40"
                      title="Forward selected"
                    >
                      <Forward size={13} />
                      <span>Forward</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsBatchDeleteOpen(true)}
                      disabled={selectedMessageIds.size === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium border border-red-500/30 transition disabled:opacity-40"
                      title="Delete selected"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelSelection}
                      className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition ml-1"
                      title="Cancel selection"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              data-testid="composer-outer-wrapper"
              className="w-full mx-auto px-1 sm:px-2 transition-[padding-bottom,max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                maxWidth: `${composerMaxWidth}px`,
                paddingBottom: `${composerPaddingBottom}px`,
              }}
            >
              {isBlocked && otherParticipant ? (
                <BlockedComposerBanner
                  otherUserId={otherParticipant.userId}
                  blockedByMe={conversation.blockedByMe}
                  blockingMe={conversation.blockingMe}
                />
              ) : (
                <MessageComposer
                  conversationId={conversation.id}
                  actions={actions}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  onSetReplyingTo={setReplyingTo}
                  stagedFiles={staged.files}
                  stagedFilesError={staged.error}
                  onAddFiles={staged.addFiles}
                  onRemoveFile={staged.removeFile}
                  onReplaceFile={staged.replaceFile}
                  onClearFiles={staged.clear}
                  onDismissFilesError={staged.dismissError}
                  isGroup={conversation.type === 'GROUP'}
                  permissionsMask={myParticipant?.permissions}
                  e2eePeerUserId={
                    conversation.type === 'GROUP' ? null : (otherParticipant?.userId ?? null)
                  }
                />
              )}
            </div>
          </AttachmentDropZone>
        </div>

        {/* Single Forward Modal */}
        {forwardingMessage && (
          <ForwardMessageModal
            messageCount={1}
            onClose={() => setForwardingMessage(null)}
            onForward={(conversationIds, _hideAuthor) => {
              actions.forwardMessage(forwardingMessage, conversationIds).catch(() => {});
              setForwardingMessage(null);
            }}
          />
        )}

        {/* Batch Forward Modal */}
        {isBatchForwardOpen && (
          <ForwardMessageModal
            messageCount={selectedMessageIds.size}
            onClose={() => setIsBatchForwardOpen(false)}
            onForward={handleConfirmBatchForward}
          />
        )}

        {/* Batch Delete Modal */}
        {isBatchDeleteOpen && (
          <BatchDeleteModal
            count={selectedMessageIds.size}
            onClose={() => setIsBatchDeleteOpen(false)}
            onConfirm={handleConfirmBatchDelete}
          />
        )}

        {/* Pinned Messages List Modal */}
        {isPinnedModalOpen && (
          <PinnedMessagesModal
            pinnedMessages={conversation.pinnedMessages}
            onClose={() => setIsPinnedModalOpen(false)}
            onJumpToMessage={(messageId) => {
              setIsPinnedModalOpen(false);
              handleJumpToMessage(messageId);
            }}
            onUnpin={(messageId) => actions.unpinMessage(messageId).catch(() => {})}
          />
        )}
      </div>

      {rightPanel === 'details' && (
        <ConversationDetailsPanel
          conversation={conversation}
          display={display}
          otherUserId={otherParticipant?.userId ?? null}
          messages={messages}
          onClose={() => setRightPanel(null)}
          onOpenSearch={() => setRightPanel('search')}
          onJumpToMessage={handleJumpToMessage}
        />
      )}

      {rightPanel === 'search' && (
        <MessageSearchPanel
          conversationId={conversation.id}
          onClose={() => setRightPanel(null)}
          onJumpToMessage={handleJumpToMessage}
          onOpenDatePicker={(rect) => handleOpenDatePicker(undefined, rect)}
        />
      )}

      {/* Telegram-style Chat Date Picker Modal / Popover */}
      <ChatDatePicker
        conversationId={conversation.id}
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSelectDate={handleJumpToDate}
        initialDate={datePickerInitialDate}
        anchorRect={datePickerAnchorRect}
      />
    </div>
  );
}
