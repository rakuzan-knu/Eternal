import { ConversationView } from '../../../entities/chat/model/types';

export interface ConversationDisplay {
  title: string;
  avatar: string | null;
  isGroup: boolean;
  otherUserId: string | null;
  otherUsername?: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
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
      otherUsername: null,
      isVerified: Boolean(conversation.isVerified),
      primaryBadge: conversation.primaryBadge ?? null,
    };
  }

  const other = (conversation.participants ?? []).find(
    (p) => (p.userId ?? (p as unknown as { id?: string }).id) !== currentUserId,
  );

  return {
    title:
      other?.nickname ??
      other?.user?.displayName ??
      other?.user?.username ??
      (other as unknown as { displayName?: string })?.displayName ??
      (other as unknown as { username?: string })?.username ??
      'Unknown user',
    avatar: other?.user?.avatar ?? (other as unknown as { avatar?: string | null })?.avatar ?? null,
    isGroup: false,
    otherUserId: other?.userId ?? (other as unknown as { id?: string })?.id ?? null,
    otherUsername:
      other?.user?.username ?? (other as unknown as { username?: string })?.username ?? null,
    isVerified: Boolean(
      other?.user?.isVerified ?? (other as unknown as { isVerified?: boolean })?.isVerified,
    ),
    primaryBadge:
      other?.user?.primaryBadge ??
      (other as unknown as { primaryBadge?: string | null })?.primaryBadge ??
      null,
  };
}

function formatDurationSec(seconds?: number | null): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  return `${m}:${remSec.toString().padStart(2, '0')}`;
}

export function getMessagePreview(
  conversation: ConversationView,
  currentUserId?: string | null,
): string {
  const msg = conversation.lastMessage;
  if (!msg) return 'No messages yet';
  if (msg.isDeleted) return 'This message was deleted';

  const isOwn = Boolean(currentUserId && msg.sender?.id === currentUserId);
  const senderPrefix =
    conversation.type === 'GROUP'
      ? isOwn
        ? 'You: '
        : `${msg.sender?.displayName || msg.sender?.username || 'User'}: `
      : isOwn
        ? 'You: '
        : '';

  const firstAttachment = msg.attachments?.[0];
  if (firstAttachment) {
    const isVideoNote =
      firstAttachment.type === 'VIDEO' &&
      (firstAttachment.fileName?.includes('video_note') ||
        firstAttachment.mimeType?.includes('video_note') ||
        (firstAttachment.width &&
          firstAttachment.height &&
          firstAttachment.width === firstAttachment.height));

    if (isVideoNote) {
      const dur = formatDurationSec(firstAttachment.duration);
      return `${senderPrefix}Video message${dur ? ` (${dur})` : ''}`;
    }

    if (firstAttachment.type === 'AUDIO') {
      const dur = formatDurationSec(firstAttachment.duration);
      return `${senderPrefix}Voice message${dur ? ` (${dur})` : ''}`;
    }

    if (firstAttachment.type === 'IMAGE') {
      return `${senderPrefix}Photo`;
    }

    if (firstAttachment.type === 'VIDEO') {
      const dur = formatDurationSec(firstAttachment.duration);
      return `${senderPrefix}Video${dur ? ` (${dur})` : ''}`;
    }

    if (firstAttachment.type === 'GIF') {
      return `${senderPrefix}GIF`;
    }

    if (firstAttachment.type === 'FILE') {
      return `${senderPrefix}File: ${firstAttachment.fileName || 'Attachment'}`;
    }

    return `${senderPrefix}Attachment`;
  }

  if (msg.messageType === 'AUDIO') {
    return `${senderPrefix}Voice message`;
  }

  if (msg.messageType === 'VIDEO') {
    return `${senderPrefix}Video message`;
  }

  if (msg.body && msg.body.trim()) {
    return `${senderPrefix}${msg.body.trim()}`;
  }

  return 'No messages yet';
}
