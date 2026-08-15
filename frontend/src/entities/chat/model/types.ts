export type ConversationType = 'DIRECT' | 'GROUP';
export type ParticipantRole = 'MEMBER' | 'ADMIN' | 'OWNER';
export type MuteLevel = 'NONE' | 'MESSAGES' | 'CALLS' | 'MESSAGES_AND_CALLS';
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | 'GIF' | 'SYSTEM';

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

export interface OutgoingAttachment {
  type: string;
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
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
  createdAt: string;
  editedAt: string | null;
  tempId?: string;
  clientMessageId?: string;
  status?: 'SENDING' | 'SENT' | 'ERROR';
}

export interface ParticipantView {
  userId: string;
  user: UserSnapshot;
  nickname: string | null;
  role: ParticipantRole;
  theme: string;
  muteLevel: MuteLevel;
  mutedUntil: string | null;
  joinedAt: string;
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
  blockedByMe: boolean;
  blockingMe: boolean;
  isBlocked: boolean;
  pinnedMessages: MessageView[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessages {
  data: MessageView[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface InfiniteMessagesData {
  pages: PaginatedMessages[];
  pageParams: unknown[];
}
