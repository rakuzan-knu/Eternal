import type {
  AttachmentType,
  MessageType as BackendMessageType,
  MuteLevel as BackendMuteLevel,
  UserSnapshot as BackendUserSnapshot,
  AttachmentView as BackendAttachmentView,
  ReactionSummary as BackendReactionSummary,
  MessageView as BackendMessageView,
  ParticipantView as BackendParticipantView,
  ConversationView as BackendConversationView,
  PaginatedMessages as BackendPaginatedMessages,
} from '@backend/common/contracts';

export type ConversationType = 'DIRECT' | 'GROUP';
export type ParticipantRole = 'MEMBER' | 'ADMIN' | 'OWNER';
export type MuteLevel = BackendMuteLevel;
export type MessageType = BackendMessageType;

export type UserSnapshot = BackendUserSnapshot;
export type AttachmentView = BackendAttachmentView;

export interface OutgoingAttachment {
  type: AttachmentType | string;
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export type ReactionSummary = BackendReactionSummary;

export interface MessageView extends Omit<
  BackendMessageView,
  'createdAt' | 'editedAt' | 'replyTo'
> {
  createdAt: string;
  editedAt: string | null;
  replyTo: MessageView | null;
  tempId?: string;
  clientMessageId?: string;
  status?: 'SENDING' | 'SENT' | 'ERROR';
}

export interface ParticipantView extends Omit<
  BackendParticipantView,
  'joinedAt' | 'mutedUntil' | 'role'
> {
  userId: string;
  user: UserSnapshot;
  role: ParticipantRole;
  mutedUntil: string | null;
  joinedAt: string;
}

export interface ConversationView extends Omit<
  BackendConversationView,
  'createdAt' | 'updatedAt' | 'type' | 'participants' | 'lastMessage' | 'pinnedMessages'
> {
  type: ConversationType;
  participants: ParticipantView[];
  lastMessage: MessageView | null;
  pinnedMessages: MessageView[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMessages extends Omit<BackendPaginatedMessages, 'data'> {
  data: MessageView[];
}

export interface InfiniteMessagesData {
  pages: PaginatedMessages[];
  pageParams: unknown[];
}
