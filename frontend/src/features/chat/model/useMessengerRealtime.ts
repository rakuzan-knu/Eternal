import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatSocket } from './useChatSocket';
import { useChatSocketEvent } from './useChatSocketEvent';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { ConversationView, MessageView } from '../../../entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import {
  initializeMessageNotificationSound,
  playMessageNotificationSound,
} from '@/shared/lib/messageNotificationSound';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';
import { useTypingStore } from './useTypingStore';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { getMessageToastPreview } from '../lib/getMessageToastPreview';

export function useMessengerRealtime(
  conversationIds: string[],
  activeConversationId: string | null = null,
  showPushNotifications = false,
) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const { userId } = useAuthStore();
  const addToast = useMessageToastStore((s) => s.addToast);
  const setTypist = useTypingStore((s) => s.setTypist);
  const {
    enableNotifications,
    allowSound,
    privateChats,
    groups,
    reactions,
    likes,
    comments,
    reposts,
    followers,
    showName,
    showText,
  } = useNotificationSettingsStore();

  const joinedRef = useRef<Set<string>>(new Set());
  const playedMessageIdsRef = useRef<Set<string>>(new Set());
  const socialBatchRef = useRef<
    Map<string, { firstActor: string; count: number; lastTimestamp: number }>
  >(new Map());
  const lastSeqRef = useRef<number>(0);
  const sessionIdRef = useRef<string>('');

  const handleNewMessageRef = useRef<
    ((data: { conversationId: string; message: MessageView }) => void) | null
  >(null);

  useEffect(() => {
    initializeMessageNotificationSound();
  }, []);

  useEffect(() => {
    const handleGatewayReady = (data: { sessionId: string; seq: number }) => {
      sessionIdRef.current = data.sessionId;
      lastSeqRef.current = data.seq;
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
              res.events.forEach((evt) => {
                lastSeqRef.current = evt.seq;
                if (evt.event === 'newMessage') {
                  handleNewMessageRef.current?.(
                    evt.payload as { conversationId: string; message: MessageView },
                  );
                }
              });
            } else {
              // resync_required / session_invalidated: execute full state refresh
              lastSeqRef.current = res?.currentSeq ?? 0;
              queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
            }
          },
        );
      }
    };

    const handleResyncRequired = (data?: { currentSeq?: number }) => {
      lastSeqRef.current = data?.currentSeq ?? 0;
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
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

  useEffect(() => {
    conversationIds.forEach((id) => {
      if (joinedRef.current.has(id)) return;
      socket.emit('joinConversation', { conversationId: id });
      joinedRef.current.add(id);
    });
  }, [conversationIds, socket]);

  const handleNewMessage = ({ message }: { conversationId: string; message: MessageView }) => {
    const conversations = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    const conversation = conversations?.find((c) => c.id === message.conversationId);
    const isGroup = conversation?.type === 'GROUP';
    const isMessengerPage = window.location.pathname.startsWith('/messages');

    if (isGroup && !groups) return;
    if (!isGroup && !privateChats) return;

    const shouldNotify =
      message.sender.id !== userId &&
      message.conversationId !== activeConversationId &&
      conversation?.myMuteLevel !== 'MESSAGES' &&
      conversation?.myMuteLevel !== 'MESSAGES_AND_CALLS' &&
      !playedMessageIdsRef.current.has(message.id);

    queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) => {
      if (!prev) return prev;
      const exists = prev.some((c) => c.id === message.conversationId);
      if (!exists) {
        queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
        return prev;
      }
      return prev.map((c) =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessage: message,
              updatedAt: message.createdAt,
              unreadCount:
                message.sender.id === userId || c.id === activeConversationId
                  ? 0
                  : c.unreadCount + 1,
            }
          : c,
      );
    });

    if (shouldNotify) {
      playedMessageIdsRef.current.add(message.id);
      if (allowSound) {
        playMessageNotificationSound();
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
  });

  const handleReactionAdded = ({
    conversationId,
    message,
  }: {
    conversationId: string;
    message: MessageView;
  }) => {
    if (!reactions) return;
    const conversations = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    const conversation = conversations?.find((c) => c.id === conversationId);
    const isMessengerPage = window.location.pathname.startsWith('/messages');

    const latestReaction = message.reactions?.[message.reactions.length - 1];
    if (!latestReaction) return;

    const reactor = latestReaction.users?.[latestReaction.users.length - 1];
    if (!reactor || reactor.id === userId) return;

    if (
      conversationId !== activeConversationId &&
      conversation?.myMuteLevel !== 'MESSAGES' &&
      conversation?.myMuteLevel !== 'MESSAGES_AND_CALLS'
    ) {
      if (allowSound) {
        playMessageNotificationSound();
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
    queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) =>
      prev?.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    );
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
    if (!enableNotifications || !followers) return;
    if (allowSound) {
      playMessageNotificationSound();
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
    if (!enableNotifications) return;
    if (type === 'LIKE' && !likes) return;
    if (type === 'COMMENT' && !comments) return;
    if (type === 'REPOST' && !reposts) return;

    if (allowSound) {
      playMessageNotificationSound();
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
  };

  const handleGlobalTyping = (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => {
    if (payload.userId === userId) return;
    const conversations = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    const conversation = conversations?.find((c) => c.id === payload.conversationId);
    const participant = conversation?.participants.find((p) => p.userId === payload.userId);
    const username = participant?.user.displayName || participant?.user.username;
    setTypist(payload.conversationId, payload.userId, payload.isTyping, username);
  };

  useChatSocketEvent<{ conversationId: string; message: MessageView }>(
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
