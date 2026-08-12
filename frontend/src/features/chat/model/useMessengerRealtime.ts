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
  const { enableNotifications, privateChats, groups, reactions, showName, showText } =
    useNotificationSettingsStore();

  const joinedRef = useRef<Set<string>>(new Set());
  const playedMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    initializeMessageNotificationSound();
  }, []);

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

    if (isGroup && !groups) return;
    if (!isGroup && !privateChats) return;

    const shouldNotify =
      message.sender.id !== userId &&
      message.conversationId !== activeConversationId &&
      conversation?.myMuteLevel !== 'MESSAGES' &&
      conversation?.myMuteLevel !== 'MESSAGES_AND_CALLS' &&
      !playedMessageIdsRef.current.has(message.id);

    queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) =>
      prev?.map((c) =>
        c.id === message.conversationId
          ? {
              ...c,
              lastMessage: message,
              unreadCount:
                message.sender.id === userId || c.id === activeConversationId
                  ? 0
                  : c.unreadCount + 1,
            }
          : c,
      ),
    );

    if (shouldNotify) {
      playedMessageIdsRef.current.add(message.id);
      playMessageNotificationSound();

      if (showPushNotifications && enableNotifications && conversation) {
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

    const latestReaction = message.reactions?.[message.reactions.length - 1];
    if (!latestReaction) return;

    const reactor = latestReaction.users?.[latestReaction.users.length - 1];
    if (!reactor || reactor.id === userId) return;

    if (
      conversationId !== activeConversationId &&
      conversation?.myMuteLevel !== 'MESSAGES' &&
      conversation?.myMuteLevel !== 'MESSAGES_AND_CALLS'
    ) {
      playMessageNotificationSound();

      if (showPushNotifications && enableNotifications) {
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
}
