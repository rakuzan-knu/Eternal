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

export type UserSnapshot = BackendUserSnapshot & {
  isVerified?: boolean;
  primaryBadge?: string | null;
};
export type AttachmentView = BackendAttachmentView & {
  isSpoiler?: boolean;
};

export interface OutgoingAttachment {
  type: AttachmentType | string;
  url: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
  waveform?: number[];
  width?: number;
  height?: number;
  thumbnailUrl?: string | null;
  isSpoiler?: boolean;
}

export type ReactionSummary = BackendReactionSummary;

export interface MessageView extends Omit<
  BackendMessageView,
  'createdAt' | 'editedAt' | 'replyTo' | 'sender'
> {
  sender: UserSnapshot;
  createdAt: string;
  editedAt: string | null;
  replyTo: MessageView | null;
  tempId?: string;
  clientMessageId?: string;
  status?: 'SENDING' | 'SENT' | 'ERROR';
  senderId?: string;
  type?: MessageType;
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

export type ConversationParticipantView = ParticipantView;

export interface ConversationView extends Omit<
  BackendConversationView,
  | 'createdAt'
  | 'updatedAt'
  | 'type'
  | 'participants'
  | 'lastMessage'
  | 'pinnedMessages'
  | 'myMutedUntil'
> {
  type: ConversationType;
  participants: ParticipantView[];
  lastMessage: MessageView | null;
  pinnedMessages: MessageView[];
  createdAt: string;
  updatedAt: string;
  myMutedUntil?: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
}

export interface PaginatedMessages extends Omit<BackendPaginatedMessages, 'data'> {
  data: MessageView[];
}

export interface InfiniteMessagesData {
  pages: PaginatedMessages[];
  pageParams: unknown[];
}

export interface DayActivityItem {
  messageCount: number;
  previewMediaUrl?: string;
  firstMessageSnippet?: string;
  firstMessageId?: string;
  mediaCount?: number;
}

export type ChatActivityMap = Record<string, DayActivityItem>;

export interface ThemeProposalData {
  proposedTheme: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  proposedByUserId: string;
  proposedByUsername?: string;
  respondedByUserId?: string;
  createdAt: string;
  expiresAt: string;
}
