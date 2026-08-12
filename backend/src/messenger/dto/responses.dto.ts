import {
  type ConversationType,
  type MessageType,
  type ParticipantRole,
  type MuteLevel,
} from '@prisma/client';

export interface UserSnapshot {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface AttachmentView {
  id: string;
  type: string;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumbnailUrl: string | null;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  selfReacted: boolean;
  users: UserSnapshot[];
}

export interface MessageView {
  id: string;
  conversationId: string;
  sender: UserSnapshot;
  body: string | null;
  messageType: MessageType;
  replyTo: MessageView | null;
  forwardedFrom: Pick<MessageView, 'id' | 'body' | 'sender'> | null;
  attachments: AttachmentView[];
  reactions: ReactionSummary[];

  readBy: string[];
  isEdited: boolean;
  isDeleted: boolean;
  isPinned: boolean;
  createdAt: Date;
  editedAt: Date | null;
}

export interface ParticipantView {
  userId: string;
  user: UserSnapshot;
  nickname: string | null;
  role: ParticipantRole;
  theme: string;
  muteLevel: MuteLevel;
  mutedUntil: Date | null;
  joinedAt: Date;
}

export interface ConversationView {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar: string | null;
  description: string | null;
  createdById: string | null;
  participants: ParticipantView[];
  lastMessage: MessageView | null;
  unreadCount: number;

  myTheme: string;
  myMuteLevel: MuteLevel;
  myNickname: string | null;
  isArchived: boolean;
  isPinned: boolean;
  blockedByMe: boolean;
  blockingMe: boolean;
  isBlocked: boolean;
  pinnedMessages: MessageView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedMessages {
  data: MessageView[];
  hasMore: boolean;
  nextCursor: string | null;
}
