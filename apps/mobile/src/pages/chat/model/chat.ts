import type { InfiniteData } from '@tanstack/react-query';
import type {
  ConversationPage,
  ConversationView,
  MessageView,
  PaginatedMessages,
  ReactionSummary,
} from '@social-network/shared-contracts';
import { isEncryptedEnvelope } from '@social-network/shared-crypto';
import { formatDate, tr } from '@/shared/lib/i18n';

export type MessageStatus = 'sending' | 'failed' | 'sent' | 'read';
export interface ChatMessage extends MessageView {
  localStatus?: 'sending' | 'failed';
  clientMessageId?: string;
}
export type MessagesData = InfiniteData<PaginatedMessages & { data: ChatMessage[] }>;
export type ConversationsData = InfiniteData<ConversationPage>;

export interface ConversationDisplay {
  title: string;
  avatar: string | null;
  isGroup: boolean;
  peerUserId: string | null;
  peerUsername: string | null;
}

export function conversationDisplay(
  conversation: Pick<ConversationView, 'type' | 'name' | 'avatar' | 'participants'>,
  userId: string,
): ConversationDisplay {
  if (conversation.type !== 'DIRECT') {
    return {
      title: conversation.name?.trim() || tr('Unnamed group'),
      avatar: conversation.avatar,
      isGroup: true,
      peerUserId: null,
      peerUsername: null,
    };
  }
  const peer = conversation.participants.find((participant) => participant.userId !== userId);
  return {
    title: peer?.nickname || peer?.user.displayName || peer?.user.username || tr('Unknown user'),
    avatar: peer?.user.avatar ?? null,
    isGroup: false,
    peerUserId: peer?.userId ?? null,
    peerUsername: peer?.user.username ?? null,
  };
}

const time = (value: Date | string) => new Date(value).getTime();

/** Newest first, deduplicated by server id and by client id for optimistic rows. */
export function orderMessages(messages: ChatMessage[]): ChatMessage[] {
  const byKey = new Map<string, ChatMessage>();
  for (const message of messages) {
    const key =
      message.clientMessageId && message.localStatus ? message.clientMessageId : message.id;
    if (!byKey.has(key)) byKey.set(key, message);
  }
  return [...byKey.values()].sort(
    (a, b) => time(b.createdAt) - time(a.createdAt) || b.id.localeCompare(a.id),
  );
}

export function flattenMessages(data: MessagesData | undefined): ChatMessage[] {
  return orderMessages(data?.pages.flatMap((page) => page.data) ?? []);
}

/** Inserts or replaces a message in the newest page (realtime and optimistic sends). */
export function upsertMessage(
  data: MessagesData | undefined,
  message: ChatMessage,
  replaceClientId?: string,
): MessagesData | undefined {
  if (!data?.pages.length) return data;
  const matches = (item: ChatMessage) =>
    item.id === message.id || (!!replaceClientId && item.clientMessageId === replaceClientId);
  const exists = data.pages.some((page) => page.data.some(matches));
  return {
    ...data,
    pages: data.pages.map((page, index) => ({
      ...page,
      data: exists
        ? page.data.map((item) => (matches(item) ? message : item))
        : index === 0
          ? [message, ...page.data]
          : page.data,
    })),
  };
}

export function patchMessage(
  data: MessagesData | undefined,
  match: (message: ChatMessage) => boolean,
  patch: (message: ChatMessage) => ChatMessage,
): MessagesData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((message) => (match(message) ? patch(message) : message)),
    })),
  };
}

export function removeMessage(
  data: MessagesData | undefined,
  match: (message: ChatMessage) => boolean,
): MessagesData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.filter((message) => !match(message)),
    })),
  };
}

/** Optimistic reaction toggle mirroring the server summary shape. */
export function toggleReaction(reactions: ReactionSummary[], emoji: string): ReactionSummary[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing) return [...reactions, { emoji, count: 1, selfReacted: true, users: [] }];
  if (!existing.selfReacted)
    return reactions.map((reaction) =>
      reaction === existing
        ? { ...reaction, count: reaction.count + 1, selfReacted: true }
        : reaction,
    );
  return reactions
    .map((reaction) =>
      reaction === existing
        ? { ...reaction, count: reaction.count - 1, selfReacted: false }
        : reaction,
    )
    .filter((reaction) => reaction.count > 0);
}

export function messageStatus(message: ChatMessage, userId: string): MessageStatus {
  if (message.localStatus) return message.localStatus;
  return message.readBy.some((reader) => reader !== userId) ? 'read' : 'sent';
}

export function previewText(message: MessageView | null): string {
  if (!message) return tr('No messages yet');
  if (message.isDeleted) return tr('Message deleted');
  if (isEncryptedEnvelope(message.body)) return tr('Encrypted message');
  const body = message.body?.trim();
  if (body) return body.replace(/\s+/g, ' ');
  if (message.attachments.length)
    return message.attachments.length === 1
      ? tr('Attachment')
      : `${message.attachments.length} attachments`;
  return message.messageType === 'CALL_LOG' ? tr('Call') : tr('Message');
}

export function conversationTime(value: Date | string | null | undefined, now = new Date()) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatDate(date, { hour: 'numeric', minute: '2-digit' });
  const days = (now.getTime() - date.getTime()) / 86_400_000;
  if (days < 7) return formatDate(date, { weekday: 'short' });
  return formatDate(date, { month: 'short', day: 'numeric' });
}

export function dayLabel(value: Date | string, now = new Date()) {
  const date = new Date(value);
  const diff = Math.round(
    (new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000,
  );
  if (diff === 0) return tr('Today');
  if (diff === 1) return tr('Yesterday');
  return formatDate(date, {
    weekday: diff < 7 ? 'long' : undefined,
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  });
}

/** Moves a conversation to the top with a fresh last message, bumping unread for others' messages. */
export function applyIncomingToConversations(
  data: ConversationsData | undefined,
  message: MessageView,
  userId: string,
  openConversationId: string | null,
): ConversationsData | undefined {
  if (!data) return data;
  let found: ConversationPage['data'][number] | undefined;
  const pages = data.pages.map((page) => ({
    ...page,
    data: page.data.filter((conversation) => {
      if (conversation.id !== message.conversationId) return true;
      found = conversation;
      return false;
    }),
  }));
  if (!found || !pages[0]) return data;
  const counts = message.sender.id !== userId && openConversationId !== message.conversationId;
  pages[0] = {
    ...pages[0],
    data: [
      { ...found, lastMessage: message, unreadCount: found.unreadCount + (counts ? 1 : 0) },
      ...pages[0].data,
    ],
  };
  return { ...data, pages };
}

export function clearUnread(data: ConversationsData | undefined, conversationId: string) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    })),
  };
}
