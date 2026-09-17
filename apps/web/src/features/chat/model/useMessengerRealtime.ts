import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useChatSocketEvent } from './useChatSocketEvent';
import { queryKeys } from '@/shared/api/queryKeys';
import type { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import {
  initializeMessageNotificationSound,
  playMessageNotificationSound,
  useNotificationSettingsStore,
} from '@/entities/notification';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useTypingStore } from './useTypingStore';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { getMessageToastPreview } from '../lib/getMessageToastPreview';
import {
  applyConversationDeleted,
  applyIncomingMessage,
  applyMessagesCleared,
  applyReactionMessage,
  applyConversationPatch,
  getLatestLocalMessageId,
  applyRestDelta,
} from './chatCacheSync';
import { chatApi } from '../api/chatApi';

/**
 * Global messenger realtime binding (Socket.io → TanStack Query cache).
 *
 * Responsibilities:
 * - join all visible conversations (idempotent, survives reconnect),
 * - WS `gatewayResume` replay with per-user `seq` + REST `after`-delta
 *   fallback for anything the server buffer expired (see `useChatGapFill`),
 * - conversation-list preview/unread patching via `setQueryData` (no REST),
 * - toast/sound side-effects with bounded dedupe (no unbounded RAM growth).
 */

const PLAYED_IDS_HARD_LIMIT = 500;
const SOCIAL_BATCH_WINDOW_MS = 10_000;
const GATEWAY_SEQ_STORAGE_KEY = 'eternal-gateway-seq';

function loadPersistedSeq(): { sessionId: string; seq: number } {
  try {
    const raw = localStorage.getItem(GATEWAY_SEQ_STORAGE_KEY);
    if (!raw) return { sessionId: '', seq: 0 };
    const parsed = JSON.parse(raw) as { sessionId?: string; seq?: number };
    return { sessionId: parsed.sessionId ?? '', seq: parsed.seq ?? 0 };
  } catch {
    return { sessionId: '', seq: 0 };
  }
}

function persistSeq(sessionId: string, seq: number): void {
  try {
    localStorage.setItem(GATEWAY_SEQ_STORAGE_KEY, JSON.stringify({ sessionId, seq }));
  } catch {
    // storage may be unavailable (private mode) — resume still works in-memory
  }
}

function rememberPlayed(played: Set<string>, id: string): void {
  played.add(id);
  if (played.size > PLAYED_IDS_HARD_LIMIT) {
    // Evict oldest (insertion-ordered Set): prevents unbounded growth
    // in long-lived tabs with heavy traffic.
    const oldest = played.values().next().value as string | undefined;
    if (oldest) played.delete(oldest);
  }
}

function pruneSocialBatches(
  batches: Map<string, { firstActor: string; count: number; lastTimestamp: number }>,
): void {
  const now = Date.now();
  for (const [key, batch] of batches) {
    if (now - batch.lastTimestamp > SOCIAL_BATCH_WINDOW_MS * 6) batches.delete(key);
  }
}

export function useMessengerRealtime(
  conversationIds: string[],
  activeConversationId: string | null = null,
  showPushNotifications = false,
) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const addToast = useMessageToastStore((s) => s.addToast);
  const setTypist = useTypingStore((s) => s.setTypist);
  const enableNotifications = useNotificationSettingsStore((s) => s.enableNotifications);
  const allowSound = useNotificationSettingsStore((s) => s.allowSound);
  const volume = useNotificationSettingsStore((s) => s.volume);
  const dndUntil = useNotificationSettingsStore((s) => s.dndUntil);
  const mutedActorIds = useNotificationSettingsStore((s) => s.mutedActorIds);
  const privateChats = useNotificationSettingsStore((s) => s.privateChats);
  const groups = useNotificationSettingsStore((s) => s.groups);
  const reactions = useNotificationSettingsStore((s) => s.reactions);
  const likes = useNotificationSettingsStore((s) => s.likes);
  const comments = useNotificationSettingsStore((s) => s.comments);
  const reposts = useNotificationSettingsStore((s) => s.reposts);
  const followers = useNotificationSettingsStore((s) => s.followers);
  const showName = useNotificationSettingsStore((s) => s.showName);
  const showText = useNotificationSettingsStore((s) => s.showText);

  const isDndActive = Boolean(dndUntil && new Date(dndUntil).getTime() > Date.now());

  const joinedRef = useRef<Set<string>>(new Set());
  const playedMessageIdsRef = useRef<Set<string>>(new Set());
  const socialBatchRef = useRef<
    Map<string, { firstActor: string; count: number; lastTimestamp: number }>
  >(new Map());
  const persisted = useRef(loadPersistedSeq());
  const lastSeqRef = useRef<number>(persisted.current.seq);
  const sessionIdRef = useRef<string>(persisted.current.sessionId);

  const handleNewMessageRef = useRef<
    | ((data: { conversationId: string; message: MessageView; clientMessageId?: string }) => void)
    | null
  >(null);
  const handleReplayEventRef = useRef<
    ((evt: { seq: number; event: string; payload: unknown }) => void) | null
  >(null);

  // Ref mirror: the gateway effect subscribes once (socket/queryClient are
  // stable singletons); the live id list is read from the ref so room
  // re-joins + REST fills always cover the current mount set.
  const conversationIdsRef = useRef<string[]>(conversationIds);
  conversationIdsRef.current = conversationIds;

  useEffect(() => {
    initializeMessageNotificationSound();
  }, []);

  useEffect(() => {
    const handleGatewayReady = (data: { sessionId: string; seq: number }) => {
      sessionIdRef.current = data.sessionId;
      lastSeqRef.current = data.seq;
      persistSeq(data.sessionId, data.seq);
    };

    const replayEvent = (evt: { seq: number; event: string; payload: unknown }) => {
      lastSeqRef.current = evt.seq;
      persistSeq(sessionIdRef.current, evt.seq);
      handleReplayEventRef.current?.(evt);
    };

    const fillViaRest = async () => {
      // REST delta fallback: per-conversation `after=<latest snowflake>`.
      const ids = [...new Set(conversationIdsRef.current)];
      await Promise.allSettled(
        ids.map(async (id) => {
          const after = getLatestLocalMessageId(queryClient, id);
          if (!after) return;
          try {
            const page = await chatApi.getMessages(id, undefined, 50, after);
            if (page?.data?.length) applyRestDelta(queryClient, id, page.data);
          } catch {
            // offline — background TQ refetch reconciles later
          }
        }),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
    };

    const handleConnect = () => {
      if (sessionIdRef.current && lastSeqRef.current > 0) {
        socket.emit(
          'gatewayResume',
          { sessionId: sessionIdRef.current, lastSeq: lastSeqRef.current },
          (res: {
            status: string;
            events?: Array<{ seq: number; event: string; payload: unknown }>;
            currentSeq?: number;
          }) => {
            if (res?.status === 'ok' && res.events) {
              res.events.forEach(replayEvent);
              if (typeof res.currentSeq === 'number') {
                lastSeqRef.current = res.currentSeq;
                persistSeq(sessionIdRef.current, res.currentSeq);
              }
              // WS buffer is authoritative for what it contains, but it may
              // be truncated — REST delta catches anything still missing.
              void fillViaRest();
            } else {
              // resync_required / session_invalidated: REST delta per
              // conversation, then full list refresh as last resort.
              lastSeqRef.current = res?.currentSeq ?? 0;
              persistSeq(sessionIdRef.current, lastSeqRef.current);
              void fillViaRest();
            }
          },
        );
      } else {
        void fillViaRest();
      }
      // Re-join rooms lost across the disconnect.
      joinedRef.current.clear();
      conversationIdsRef.current.forEach((id) => {
        socket.emit('joinConversation', { conversationId: id });
        joinedRef.current.add(id);
      });
    };

    const handleResyncRequired = (data?: { currentSeq?: number }) => {
      lastSeqRef.current = data?.currentSeq ?? 0;
      persistSeq(sessionIdRef.current, lastSeqRef.current);
      void fillViaRest();
    };

    socket.on('gatewayReady', handleGatewayReady);
    socket.on('connect', handleConnect);
    socket.on('resyncRequired', handleResyncRequired);

    return () => {
      socket.off('gatewayReady', handleGatewayReady);
      socket.off('connect', handleConnect);
      socket.off('resyncRequired', handleResyncRequired);
    };
  }, [socket, queryClient]);

  // Periodic lightweight heartbeat ping (Discord model) every 25s
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, 25000);
    return () => clearInterval(interval);
  }, [socket]);

  // Periodic prune of social batch map (prevents slow leak).
  useEffect(() => {
    const interval = setInterval(() => pruneSocialBatches(socialBatchRef.current), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    conversationIds.forEach((id) => {
      if (joinedRef.current.has(id)) return;
      socket.emit('joinConversation', { conversationId: id });
      joinedRef.current.add(id);
    });
  }, [conversationIds, socket]);

  const handleNewMessage = (payload: {
    conversationId: string;
    message: MessageView;
    clientMessageId?: string;
  }) => {
    const message =
      payload.clientMessageId && !payload.message.clientMessageId
        ? { ...payload.message, clientMessageId: payload.clientMessageId }
        : payload.message;
    const conversations = queryClient.getQueryData<ConversationView[]>(
      queryKeys.conversations.root,
    );
    const conversation = conversations?.find((c) => c.id === message.conversationId);
    const isGroup = conversation?.type === 'GROUP';
    const isMessengerPage = window.location.pathname.startsWith('/messages');
    const isSenderMuted = Boolean(message.sender?.id && mutedActorIds?.includes(message.sender.id));

    const shouldNotify =
      (isGroup ? groups : privateChats) &&
      Boolean(message.sender?.id && message.sender.id !== userId) &&
      message.conversationId !== activeConversationId &&
      conversation?.myMuteLevel !== 'MESSAGES' &&
      conversation?.myMuteLevel !== 'MESSAGES_AND_CALLS' &&
      !isSenderMuted &&
      !isDndActive &&
      !playedMessageIdsRef.current.has(message.id);

    // Realtime cache sync first (no REST): message tail + list preview.
    applyIncomingMessage(queryClient, message.conversationId, message, { status: 'sent' });
    queryClient.setQueryData<ConversationView[]>(
      queryKeys.conversations.root,
      (prev: ConversationView[] | undefined) => {
        if (!prev) return prev;
        const exists = prev.some((c: ConversationView) => c.id === message.conversationId);
        if (!exists) {
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
          return prev;
        }
        return prev.map((c: ConversationView) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message,
                updatedAt: message.createdAt,
                unreadCount:
                  message.sender?.id === userId || c.id === activeConversationId
                    ? 0
                    : (c.unreadCount + 1) | 0,
              }
            : c,
        );
      },
    );

    if (shouldNotify) {
      rememberPlayed(playedMessageIdsRef.current, message.id);
      if (enableNotifications && allowSound) {
        playMessageNotificationSound(volume);
      }

      // If user is on the Messenger page, audio plays for other chats, but push toast is suppressed
      if (!isMessengerPage && showPushNotifications && enableNotifications && conversation) {
        const display = getConversationDisplay(conversation, userId);
        const toastTitle = showName ? display.title : 'Eternal';
        const toastBody = showName
          ? showText
            ? getMessageToastPreview(message)
            : 'You have a new message'
          : 'You have a new message';

        addToast({
          id: message.id,
          conversationId: message.conversationId,
          messageId: message.id,
          title: toastTitle,
          body: toastBody,
          avatar: showName ? display.avatar : null,
          memberAvatars: showName
            ? conversation.participants.map((participant) => participant.user.avatar)
            : [],
          isGroup: showName ? display.isGroup : false,
        });
      }
    }
  };

  useEffect(() => {
    handleNewMessageRef.current = handleNewMessage;
    handleReplayEventRef.current = (evt) => {
      const payload = evt.payload as { conversationId?: string; message?: MessageView };
      if (!payload) return;
      if (evt.event === 'newMessage' && payload.message) {
        handleNewMessageRef.current?.({
          conversationId: payload.conversationId ?? payload.message.conversationId,
          message: payload.message,
          clientMessageId: (payload as { clientMessageId?: string }).clientMessageId,
        });
        return;
      }
      // Replayed non-message events patch the cache directly (same as live).
      if (!payload.conversationId) return;
      const convId = payload.conversationId;
      if (evt.event === 'messageReactionAdded' || evt.event === 'messageReactionRemoved') {
        if (payload.message) applyReactionMessage(queryClient, convId, payload.message, userId);
        return;
      }
      if (evt.event === 'conversationUpdated' && payload) {
        applyConversationPatch(queryClient, payload as Partial<ConversationView> & { id: string });
      }
    };
  });

  const handleReactionAdded = ({
    conversationId,
    message,
  }: {
    conversationId: string;
    message: MessageView;
  }) => {
    // Patch message cache immediately (no REST); toast is best-effort.
    applyReactionMessage(queryClient, conversationId, message, userId);
    if (!reactions || isDndActive) return;
    const conversations = queryClient.getQueryData<ConversationView[]>(
      queryKeys.conversations.root,
    );
    const conversation = conversations?.find((c) => c.id === conversationId);
    const isMessengerPage = window.location.pathname.startsWith('/messages');

    const latestReaction = message.reactions?.[message.reactions.length - 1];
    if (!latestReaction) return;

    const reactor = latestReaction.users?.[latestReaction.users.length - 1];
    if (!reactor || reactor.id === userId || mutedActorIds?.includes(reactor.id)) return;

    if (
      conversationId !== activeConversationId &&
      conversation?.myMuteLevel !== 'MESSAGES' &&
      conversation?.myMuteLevel !== 'MESSAGES_AND_CALLS'
    ) {
      if (enableNotifications && allowSound) {
        playMessageNotificationSound(volume);
      }

      if (!isMessengerPage && showPushNotifications && enableNotifications) {
        const reactorName = reactor.displayName || reactor.username;
        const toastTitle = showName && reactorName ? reactorName : 'Eternal';
        const toastBody = showName
          ? showText
            ? `Reacted ${latestReaction.emoji} to your message`
            : 'Reacted to your message'
          : 'Reacted to your message';

        addToast({
          id: `react-${message.id}-${Date.now()}`,
          conversationId,
          messageId: message.id,
          title: toastTitle,
          body: toastBody,
          avatar: showName ? reactor.avatar || null : null,
          memberAvatars: [],
          isGroup: false,
        });
      }
    }
  };

  const handleConversationUpdated = (updated: Partial<ConversationView> & { id: string }) => {
    applyConversationPatch(queryClient, updated);
  };

  const handleNewFollower = ({
    follower,
    status,
    message,
  }: {
    follower: { id: string; username: string; displayName?: string | null; avatar?: string | null };
    status: 'ACCEPTED' | 'PENDING';
    message?: string;
  }) => {
    if (!enableNotifications || !followers || isDndActive || mutedActorIds?.includes(follower.id))
      return;
    if (allowSound) {
      playMessageNotificationSound(volume);
    }
    const title = showName ? follower.displayName || `@${follower.username}` : 'Eternal';
    const body =
      message || (status === 'PENDING' ? 'sent you a follow request' : 'subscribed to you');

    addToast({
      id: `follow-${follower.id}-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title,
      body,
      avatar: showName ? follower.avatar || null : null,
      memberAvatars: [],
      isGroup: false,
      linkUrl: `/profile/${follower.username}`,
    });
  };

  const handleSocialNotification = ({
    type,
    actor,
    postId,
    authorUsername,
    message,
  }: {
    type: 'LIKE' | 'COMMENT' | 'REPOST';
    actor: { id: string; username: string; displayName?: string | null; avatar?: string | null };
    postId: string;
    authorUsername: string;
    message: string;
  }) => {
    if (!enableNotifications || isDndActive || mutedActorIds?.includes(actor.id)) return;
    if (type === 'LIKE' && !likes) return;
    if (type === 'COMMENT' && !comments) return;
    if (type === 'REPOST' && !reposts) return;

    if (allowSound) {
      playMessageNotificationSound(volume);
    }

    const targetProfile = authorUsername || actor.username;
    const actorDisplayName = actor.displayName || `@${actor.username}`;

    // Smart notification batching for Likes and Reposts within 10 seconds
    const batchKey = `${type}:${postId}`;
    const now = Date.now();
    const existingBatch = socialBatchRef.current.get(batchKey);

    let toastId = `social-${type}-${postId}-${actor.id}-${now}`;
    let toastBody = showText ? message : `New ${type.toLowerCase()} on your post`;
    const toastTitle = showName ? actorDisplayName : 'Eternal';

    if (type === 'LIKE' || type === 'REPOST') {
      toastId = `social-batch-${type}-${postId}`;
      if (existingBatch && now - existingBatch.lastTimestamp < 10000) {
        existingBatch.count += 1;
        existingBatch.lastTimestamp = now;
        const count = existingBatch.count;
        const othersLabel = count === 1 ? '1 other' : `${count} others`;
        const actionVerb = type === 'LIKE' ? 'liked' : 'reposted';
        toastBody = showText
          ? `${existingBatch.firstActor} and ${othersLabel} ${actionVerb} your post`
          : `New ${type.toLowerCase()}s on your post`;
      } else {
        socialBatchRef.current.set(batchKey, {
          firstActor: actorDisplayName,
          count: 0,
          lastTimestamp: now,
        });
      }
    }

    addToast({
      id: toastId,
      conversationId: '',
      messageId: '',
      title: toastTitle,
      body: toastBody,
      avatar: showName ? actor.avatar || null : null,
      memberAvatars: [],
      isGroup: false,
      linkUrl: `/${targetProfile}#post-${postId}`,
    });

    if (type === 'COMMENT') {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(postId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.saved });
    }
  };

  const handleGlobalTyping = (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => {
    if (payload.userId === userId) return;
    const conversations = queryClient.getQueryData<ConversationView[]>(
      queryKeys.conversations.root,
    );
    const conversation = conversations?.find((c) => c.id === payload.conversationId);
    const participant = conversation?.participants.find((p) => p.userId === payload.userId);
    const username = participant?.user.displayName || participant?.user.username;
    setTypist(payload.conversationId, payload.userId, payload.isTyping, username);
  };

  const handleConversationDeleted = (payload: { conversationId: string }) => {
    applyConversationDeleted(queryClient, payload.conversationId);
    if (activeConversationId === payload.conversationId) {
      if (window.location.pathname.startsWith('/messages')) {
        window.history.pushState(null, '', '/messages');
      }
    }
  };

  const handleMessagesCleared = (payload: { conversationId: string }) => {
    // Atomic wipe via sync layer (no follow-up REST refetch: the clear IS the state).
    applyMessagesCleared(queryClient, payload.conversationId);
  };

  useChatSocketEvent<{ conversationId: string; message: MessageView; clientMessageId?: string }>(
    'newMessage',
    handleNewMessage,
  );
  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
    'messageReactionAdded',
    handleReactionAdded,
  );
  useChatSocketEvent<Partial<ConversationView> & { id: string }>(
    'conversationUpdated',
    handleConversationUpdated,
  );
  useChatSocketEvent<{ conversationId: string }>('conversationDeleted', handleConversationDeleted);
  useChatSocketEvent<{ conversationId: string }>('messagesCleared', handleMessagesCleared);
  useChatSocketEvent<{
    follower: { id: string; username: string; displayName?: string | null; avatar?: string | null };
    status: 'ACCEPTED' | 'PENDING';
    message?: string;
  }>('newFollower', handleNewFollower);
  useChatSocketEvent<{
    type: 'LIKE' | 'COMMENT' | 'REPOST';
    actor: { id: string; username: string; displayName?: string | null; avatar?: string | null };
    postId: string;
    authorUsername: string;
    message: string;
  }>('socialNotification', handleSocialNotification);
  useChatSocketEvent<{
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }>('typing', handleGlobalTyping);
}
