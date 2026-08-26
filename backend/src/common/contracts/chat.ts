import { z } from 'zod';
export const AttachmentType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  FILE: 'FILE',
  LINK: 'LINK',
  GIF: 'GIF',
} as const;
export type AttachmentType = (typeof AttachmentType)[keyof typeof AttachmentType];

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
  FILE: 'FILE',
  GIF: 'GIF',
  STICKER: 'STICKER',
  LOCATION: 'LOCATION',
  CALL_LOG: 'CALL_LOG',
  SYSTEM: 'SYSTEM',
  DELETED: 'DELETED',
  THEME_PROPOSAL: 'THEME_PROPOSAL',
  STORY_REPLY: 'STORY_REPLY',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MuteLevel = {
  NONE: 'NONE',
  MESSAGES: 'MESSAGES',
  CALLS: 'CALLS',
  MESSAGES_AND_CALLS: 'MESSAGES_AND_CALLS',
} as const;
export type MuteLevel = (typeof MuteLevel)[keyof typeof MuteLevel];

export const conversationIdSchema = z.object({
  conversationId: z.string().uuid(),
});
export type ConversationIdDto = z.infer<typeof conversationIdSchema>;

export const attachmentSchema = z.object({
  type: z.nativeEnum(AttachmentType),
  url: z.string().min(1),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().optional(),
  size: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  duration: z.coerce.number().min(0).optional(),
  waveform: z.array(z.number()).optional(),
  isSpoiler: z.boolean().optional(),
  thumbnailUrl: z.string().optional(),
});
export type AttachmentDto = z.infer<typeof attachmentSchema>;

export const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid(),
    text: z.string().max(4096).optional(),
    messageType: z.nativeEnum(MessageType).default(MessageType.TEXT),
    replyToId: z.string().uuid().optional(),
    forwardedFromId: z.string().uuid().optional(),
    clientMessageId: z.string().max(64).optional(),
    attachments: z.array(attachmentSchema).optional(),
  })
  .refine(
    (data) =>
      (data.text && data.text.trim().length > 0) ||
      (data.attachments && data.attachments.length > 0),
    {
      message: 'Message must contain either text or attachments',
    },
  );
export type SendMessageDto = z.infer<typeof sendMessageSchema>;

export const gatewayResumeSchema = z.object({
  sessionId: z.string().min(1),
  lastSeq: z.number().int().min(0),
});
export type GatewayResumeDto = z.infer<typeof gatewayResumeSchema>;

export const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().min(1).max(4096),
});
export type EditMessageDto = z.infer<typeof editMessageSchema>;

export const deleteMessageSchema = z.object({
  messageId: z.string().uuid(),
  forAll: z.coerce.boolean().optional(),
});
export type DeleteMessageDto = z.infer<typeof deleteMessageSchema>;

export const batchDeleteMessagesSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(50),
  forAll: z.coerce.boolean().optional(),
});
export type BatchDeleteMessagesDto = z.infer<typeof batchDeleteMessagesSchema>;

export const forwardMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationIds: z.array(z.string().uuid()),
  hideAuthor: z.boolean().optional(),
});
export type ForwardMessageDto = z.infer<typeof forwardMessageSchema>;

export const forwardMultipleMessagesSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(50),
  conversationIds: z.array(z.string().uuid()).min(1),
  hideAuthor: z.boolean().optional(),
});
export type ForwardMultipleMessagesDto = z.infer<typeof forwardMultipleMessagesSchema>;

export const reactToMessageSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});
export type ReactToMessageDto = z.infer<typeof reactToMessageSchema>;

export const pinMessageSchema = z.object({
  messageId: z.string().uuid(),
});
export type PinMessageDto = z.infer<typeof pinMessageSchema>;

export const togglePinMessageSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
});
export type TogglePinMessageDto = z.infer<typeof togglePinMessageSchema>;

export const markReadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
});
export type MarkReadDto = z.infer<typeof markReadSchema>;

export const getOnlineStatusSchema = z.object({
  userIds: z.array(z.string().uuid()),
});
export type GetOnlineStatusDto = z.infer<typeof getOnlineStatusSchema>;

export const getMessagesQuerySchema = z.object({
  before: z.string().uuid().optional(),
  after: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type GetMessagesQueryDto = z.infer<typeof getMessagesQuerySchema>;

export const getChatActivityQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  timezone: z.string().max(64).optional(),
});
export type GetChatActivityQueryDto = z.infer<typeof getChatActivityQuerySchema>;

export const getMessagesAroundDateQuerySchema = z.object({
  date: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type GetMessagesAroundDateQueryDto = z.infer<typeof getMessagesAroundDateQuerySchema>;

export interface DayActivityItem {
  messageCount: number;
  previewMediaUrl?: string;
  firstMessageSnippet?: string;
  firstMessageId?: string;
  mediaCount?: number;
}

export type ChatActivityMap = Record<string, DayActivityItem>;

export const searchMessagesQuerySchema = z.object({
  q: z.string().min(1).max(256),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type SearchMessagesQueryDto = z.infer<typeof searchMessagesQuerySchema>;

export const reportSchema = z.object({
  messageId: z.string().uuid().optional(),
  category: z.string().min(1),
  details: z.string().max(1024).optional(),
});
export type ReportDto = z.infer<typeof reportSchema>;

export const createDirectConversationSchema = z.object({
  participantId: z.string().min(1),
});
export type CreateDirectConversationDto = z.infer<typeof createDirectConversationSchema>;

export const createGroupConversationSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  memberIds: z.array(z.string().uuid()),
});
export type CreateGroupConversationDto = z.infer<typeof createGroupConversationSchema>;

export const updateGroupConversationSchema = z.object({
  name: z.string().max(128).optional(),
  description: z.string().max(512).optional(),
});
export type UpdateGroupConversationDto = z.infer<typeof updateGroupConversationSchema>;

export const setNicknameSchema = z.object({
  targetUserId: z.string().uuid(),
  nickname: z.string().max(64).nullable().optional(),
});
export type SetNicknameDto = z.infer<typeof setNicknameSchema>;

export const setThemeSchema = z.object({
  theme: z.string().nullable().optional(),
  applyToAll: z.coerce.boolean().optional(),
});
export type SetThemeDto = z.infer<typeof setThemeSchema>;

export const muteConversationSchema = z.object({
  muteLevel: z.nativeEnum(MuteLevel),
  mutedUntil: z.string().optional(),
});
export type MuteConversationDto = z.infer<typeof muteConversationSchema>;

export const addMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()),
});
export type AddMembersDto = z.infer<typeof addMembersSchema>;

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid(),
});
export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;

export const promoteMemberSchema = z.object({
  userId: z.string().uuid(),
});
export type PromoteMemberDto = z.infer<typeof promoteMemberSchema>;

export interface UserSnapshot {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  defaultChatTheme?: string | null;
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
  role: string;
  theme: string;
  muteLevel: MuteLevel;
  mutedUntil: Date | null;
  joinedAt: Date;
}

export interface ConversationView {
  id: string;
  type: string;
  name: string | null;
  avatar: string | null;
  description: string | null;
  createdById: string | null;
  participants: ParticipantView[];
  lastMessage: MessageView | null;
  unreadCount: number;

  myTheme: string;
  myMuteLevel: MuteLevel;
  myMutedUntil?: Date | null;
  myNickname: string | null;
  isArchived: boolean;
  isPinned: boolean;
  blockedByMe: boolean;
  blockingMe: boolean;
  isBlocked: boolean;
  pinnedMessages: MessageView[];
  sharedTheme?: string | null;
  sharedThemeUpdatedAt?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedMessages {
  data: MessageView[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const proposeThemeSchema = z.object({
  theme: z.string().min(1).max(8192),
});
export type ProposeThemeDto = z.infer<typeof proposeThemeSchema>;

export const respondThemeProposalSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE', 'CANCEL']),
});
export type RespondThemeProposalDto = z.infer<typeof respondThemeProposalSchema>;

export interface ThemeProposalData {
  proposedTheme: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  proposedByUserId: string;
  proposedByUsername?: string;
  respondedByUserId?: string;
  createdAt: string;
  expiresAt: string;
}
