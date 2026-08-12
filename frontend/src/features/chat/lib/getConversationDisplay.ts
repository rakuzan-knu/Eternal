import { ConversationView } from '../../../entities/chat/model/types';

export interface ConversationDisplay {
  title: string;
  avatar: string | null;
  isGroup: boolean;
  otherUserId: string | null;
}

export function getConversationDisplay(
  conversation: ConversationView,
  currentUserId: string | null,
): ConversationDisplay {
  if (conversation.type === 'GROUP') {
    return {
      title: conversation.name ?? 'Unnamed group',
      avatar: conversation.avatar,
      isGroup: true,
      otherUserId: null,
    };
  }

  const other = conversation.participants.find((p) => p.userId !== currentUserId);

  return {
    title: other?.nickname ?? other?.user.displayName ?? other?.user.username ?? 'Unknown user',
    avatar: other?.user.avatar ?? null,
    isGroup: false,
    otherUserId: other?.userId ?? null,
  };
}

export function getMessagePreview(conversation: ConversationView): string {
  const msg = conversation.lastMessage;
  if (!msg) return 'No messages yet';
  if (msg.isDeleted) return 'This message was deleted';
  if (msg.attachments.length > 0)
    return `${msg.sender.displayName ?? msg.sender.username} sent an attachment`;
  return msg.body ?? '';
}
