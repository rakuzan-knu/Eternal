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
  url: z.string().min(1).max(2048),
  fileName: z.string().max(255).optional(),
  mimeType: z.string().max(128).optional(),
  size: z.coerce.number().min(0).optional(),
  width: z.coerce.number().min(0).optional(),
  height: z.coerce.number().min(0).optional(),
  duration: z.coerce.number().min(0).optional(),
  waveform: z.array(z.number()).max(256).optional(),
  isSpoiler: z.boolean().optional(),
  thumbnailUrl: z.string().max(2048).optional(),
});
export type AttachmentDto = z.infer<typeof attachmentSchema>;

/**
 * E2EE-aware text cap. Plaintext bodies stay capped at PLAINTEXT_MAX chars;
 * a well-formed envelope (v1 `{"e2ee":true,"v":1,"iv","ct"}`, v2/v3 with
 * dialog binding `from`+`aad`, v3 additionally `keys`) carries base64
 * overhead (~4/3 of the plaintext) and may use up to ENVELOPE_MAX. Anything
 * else above the plaintext cap is rejected — the envelope branch never
 * widens the plaintext limit. Shape-checked only (never decrypted here).
 */
export const MESSAGE_PLAINTEXT_MAX = 4096;
export const MESSAGE_ENVELOPE_MAX = 8192;

function isNonEmptyString(value: unknown, maxLen: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen;
}

/**
 * Base64 field decoding to EXACTLY byteLength bytes. Browser AES-GCM readers
 * require 12-byte IVs — shape-rejecting anything else keeps malformed
 * envelopes out of storage (they would only ever render as locked).
 */
function isB64Bytes(value: unknown, byteLength: number): boolean {
  if (!isNonEmptyString(value, 16384)) return false;
  try {
    return Buffer.from(value, 'base64').length === byteLength;
  } catch {
    return false;
  }
}

function isValidAadShape(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const aad = value as Record<string, unknown>;
  return (
    isNonEmptyString(aad.conversationId, 256) &&
    isNonEmptyString(aad.senderId, 256) &&
    isNonEmptyString(aad.senderDevice, 128) &&
    Number.isInteger(aad.seq)
  );
}

export function isE2eeEnvelopeShape(text: string): boolean {
  if (typeof text !== 'string' || text.length > MESSAGE_ENVELOPE_MAX) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed[0] !== '{') return false;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const payload = parsed as Record<string, unknown>;
    if (
      payload.e2ee !== true ||
      !isB64Bytes(payload.iv, 12) ||
      !isNonEmptyString(payload.ct, 16384)
    ) {
      return false;
    }
    if (payload.v === 1) return true;
    if (payload.v === 2) {
      return isNonEmptyString(payload.from, 128) && isValidAadShape(payload.aad);
    }
    if (payload.v === 3) {
      if (!isNonEmptyString(payload.from, 128)) return false;
      if (!payload.keys || typeof payload.keys !== 'object' || Array.isArray(payload.keys)) {
        return false;
      }
      const names = Object.keys(payload.keys);
      if (names.length === 0 || names.length > 10) return false;
      const wrapsOk = names.every((name) => {
        const entry = (payload.keys as Record<string, unknown>)[name] as Record<string, unknown>;
        return (
          isNonEmptyString(name, 128) &&
          !!entry &&
          isB64Bytes(entry.iv, 12) &&
          isNonEmptyString(entry.k, 2048)
        );
      });
      return wrapsOk && isValidAadShape(payload.aad);
    }
    return false;
  } catch {
    return false;
  }
}

/** Strict v1-only shape (legacy callers). Prefer isE2eeEnvelopeShape for new code. */
export function isE2eeV1EnvelopeShape(text: string): boolean {
  if (!isE2eeEnvelopeShape(text)) return false;
  try {
    return (JSON.parse(text.trim()) as { v?: unknown }).v === 1;
  } catch {
    return false;
  }
}

const e2eeLengthRefine = (text: string): boolean =>
  text.length <= MESSAGE_PLAINTEXT_MAX || isE2eeEnvelopeShape(text);
const E2EE_LENGTH_MESSAGE = `Text must be ≤${MESSAGE_PLAINTEXT_MAX} chars, or a valid E2EE envelope ≤${MESSAGE_ENVELOPE_MAX} chars`;

const e2eeAwareTextSchema = z
  .string()
  .max(MESSAGE_ENVELOPE_MAX)
  .refine(e2eeLengthRefine, { message: E2EE_LENGTH_MESSAGE });

export const sendMessageSchema = z
  .object({
    conversationId: z.string().min(1).max(128).optional(),
    text: e2eeAwareTextSchema.optional(),
    messageType: z.nativeEnum(MessageType).default(MessageType.TEXT),
    replyToId: z.string().min(1).max(128).optional(),
    forwardedFromId: z.string().min(1).max(128).optional(),
    clientMessageId: z.string().max(64).optional(),
    clientSeq: z.number().int().min(1).optional(),
    attachments: z.array(attachmentSchema).max(10).optional(),
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
  sessionId: z.string().min(1).max(128),
  lastSeq: z.number().int().min(0),
});
export type GatewayResumeDto = z.infer<typeof gatewayResumeSchema>;

export const messageDeliveredSchema = z.object({
  conversationId: z.string().min(1).max(128),
  messageId: z.string().min(1).max(128),
});
export type MessageDeliveredDto = z.infer<typeof messageDeliveredSchema>;

export const clientHibernateSchema = z.object({
  reason: z.string().max(64).optional(),
});
export type ClientHibernateDto = z.infer<typeof clientHibernateSchema>;

export const editMessageSchema = z.object({
  messageId: z.string().min(1).max(128).optional(),
  body: z.string().min(1).max(MESSAGE_ENVELOPE_MAX).refine(e2eeLengthRefine, {
    message: E2EE_LENGTH_MESSAGE,
  }),
});
export type EditMessageDto = z.infer<typeof editMessageSchema>;

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1).max(128).optional(),
  forAll: z.coerce.boolean().optional(),
});
export type DeleteMessageDto = z.infer<typeof deleteMessageSchema>;

export const forAllQuerySchema = z.object({
  forAll: z
    .preprocess((val) => val === 'true' || val === '1' || val === true, z.boolean())
    .optional(),
});
export type ForAllQueryDto = z.infer<typeof forAllQuerySchema>;

export const batchDeleteMessagesSchema = z.object({
  messageIds: z.array(z.string().min(1).max(128)).min(1).max(50),
  forAll: z.coerce.boolean().optional(),
});
export type BatchDeleteMessagesDto = z.infer<typeof batchDeleteMessagesSchema>;

export const forwardMessageSchema = z.object({
  messageId: z.string().min(1).max(128).optional(),
  conversationIds: z.array(z.string().min(1).max(128)).min(1).max(50),
  hideAuthor: z.boolean().optional(),
});
export type ForwardMessageDto = z.infer<typeof forwardMessageSchema>;

export const forwardMultipleMessagesSchema = z.object({
  messageIds: z.array(z.string().min(1).max(128)).min(1).max(50),
  conversationIds: z.array(z.string().min(1).max(128)).min(1).max(50),
  hideAuthor: z.boolean().optional(),
});
export type ForwardMultipleMessagesDto = z.infer<typeof forwardMultipleMessagesSchema>;

export const reactToMessageSchema = z.object({
  messageId: z.string().min(1).max(128).optional(),
  emoji: z.string().min(1).max(32),
});
export type ReactToMessageDto = z.infer<typeof reactToMessageSchema>;

export const pinMessageSchema = z.object({
  messageId: z.string().min(1).max(128).optional(),
});
export type PinMessageDto = z.infer<typeof pinMessageSchema>;

export const togglePinMessageSchema = z.object({
  conversationId: z.string().min(1).max(128),
  messageId: z.string().min(1).max(128),
});
export type TogglePinMessageDto = z.infer<typeof togglePinMessageSchema>;

export const markReadSchema = z.object({
  conversationId: z.string().min(1).max(128),
  messageId: z.string().min(1).max(128).optional(),
});
export type MarkReadDto = z.infer<typeof markReadSchema>;

export const getOnlineStatusSchema = z.object({
  userIds: z.array(z.string().min(1).max(128)).min(1).max(100),
});
export type GetOnlineStatusDto = z.infer<typeof getOnlineStatusSchema>;

export const getMessagesQuerySchema = z.object({
  before: z.string().min(1).max(128).optional(),
  after: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});
export type GetMessagesQueryDto = z.infer<typeof getMessagesQuerySchema>;

export const getChatActivityQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  timezone: z.string().max(64).optional(),
});
export type GetChatActivityQueryDto = z.infer<typeof getChatActivityQuerySchema>;

export const getMessagesAroundDateQuerySchema = z.object({
  date: z.string().min(1).max(64),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});
export type GetMessagesAroundDateQueryDto = z.infer<typeof getMessagesAroundDateQuerySchema>;

export interface DayActivityItem {
  messageCount: number;
  previewMediaUrl?: string | undefined;
  firstMessageSnippet?: string | undefined;
  firstMessageId?: string | undefined;
  mediaCount?: number | undefined;
}

export type ChatActivityMap = Record<string, DayActivityItem>;

export const searchMessagesQuerySchema = z.object({
  q: z.string().min(1).max(256),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
export type SearchMessagesQueryDto = z.infer<typeof searchMessagesQuerySchema>;

export const reportSchema = z.object({
  messageId: z.string().min(1).max(128).optional(),
  category: z.string().min(1).max(64),
  details: z.string().max(1024).optional(),
});
export type ReportDto = z.infer<typeof reportSchema>;

export const createDirectConversationSchema = z.object({
  participantId: z.string().min(1).max(128),
});
export type CreateDirectConversationDto = z.infer<typeof createDirectConversationSchema>;

export const createGroupConversationSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  memberIds: z.array(z.string().min(1).max(128)).min(1).max(100),
});
export type CreateGroupConversationDto = z.infer<typeof createGroupConversationSchema>;

export const updateGroupConversationSchema = z.object({
  name: z.string().max(128).optional(),
  description: z.string().max(512).optional(),
});
export type UpdateGroupConversationDto = z.infer<typeof updateGroupConversationSchema>;

export const updateAdminPermissionsSchema = z.object({
  permissions: z.coerce.number().int().min(0).optional(),
  canEditGroup: z.boolean().optional(),
  canDeleteMessages: z.boolean().optional(),
  canManageMembers: z.boolean().optional(),
  canPinMessages: z.boolean().optional(),
  canInviteUsers: z.boolean().optional(),
});
export type UpdateAdminPermissionsDto = z.infer<typeof updateAdminPermissionsSchema>;

export const setNicknameSchema = z.object({
  targetUserId: z.string().min(1).max(128),
  nickname: z.string().max(64).nullable().optional(),
});
export type SetNicknameDto = z.infer<typeof setNicknameSchema>;

export const setThemeSchema = z.object({
  theme: z.string().max(128).nullable().optional(),
  applyToAll: z.coerce.boolean().optional(),
});
export type SetThemeDto = z.infer<typeof setThemeSchema>;

export const muteConversationSchema = z.object({
  muteLevel: z.nativeEnum(MuteLevel),
  mutedUntil: z.string().max(64).optional(),
});
export type MuteConversationDto = z.infer<typeof muteConversationSchema>;

export const addMembersSchema = z.object({
  memberIds: z.array(z.string().min(1).max(128)).min(1).max(100),
});
export type AddMembersDto = z.infer<typeof addMembersSchema>;

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1).max(128),
});
export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;

export const promoteMemberSchema = z.object({
  userId: z.string().min(1).max(128),
});
export type PromoteMemberDto = z.infer<typeof promoteMemberSchema>;

export interface UserSnapshot {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
  defaultChatTheme?: string | null;
  flags?: number | undefined;
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
  waveform?: number[] | undefined;
  isSpoiler?: boolean | undefined;
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
  clientSeq?: number | null;
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
  permissions: number;
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

export const FolderFilterType = {
  ALL: 'ALL',
  PERSONAL: 'PERSONAL',
  WORK: 'WORK',
  GROUPS: 'GROUPS',
  CHANNELS: 'CHANNELS',
  UNREAD: 'UNREAD',
  CUSTOM: 'CUSTOM',
} as const;
export type FolderFilterType = (typeof FolderFilterType)[keyof typeof FolderFilterType];

export const createFolderSchema = z.object({
  name: z.string().min(1).max(32),
  icon: z.string().max(64).nullable().optional(),
  emoji: z.string().max(16).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#8b5cf6'),
  filterType: z.nativeEnum(FolderFilterType).default('CUSTOM'),
  includeIds: z.array(z.string().uuid()).default([]),
  excludeIds: z.array(z.string().uuid()).default([]),
});
export type CreateFolderDto = z.infer<typeof createFolderSchema>;

export const updateFolderSchema = createFolderSchema.partial().extend({
  order: z.number().int().min(0).optional(),
});
export type UpdateFolderDto = z.infer<typeof updateFolderSchema>;

export const reorderFoldersSchema = z.object({
  folderIds: z.array(z.string().uuid()).min(1),
});
export type ReorderFoldersDto = z.infer<typeof reorderFoldersSchema>;

export interface ChatFolderView {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  emoji: string | null;
  color: string;
  order: number;
  filterType: FolderFilterType;
  includeIds: string[];
  excludeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const globalSearchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['all', 'messages', 'media', 'files', 'links', 'people']).default('all'),
  conversationId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});
export type GlobalSearchDto = z.infer<typeof globalSearchSchema>;

export interface GlobalSearchResult {
  messages: Array<{
    id: string;
    conversationId: string;
    conversationTitle: string;
    conversationAvatar: string | null;
    isGroup: boolean;
    senderId: string;
    senderName: string;
    senderAvatar: string | null;
    body: string | null;
    createdAt: string;
    highlightSnippet?: string | undefined;
  }>;
  media: Array<{
    id: string;
    messageId: string;
    conversationId: string;
    url: string;
    fileName: string | null;
    mimeType: string | null;
    size: number | null;
    type: AttachmentType;
    createdAt: string;
  }>;
  people: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isOnline: boolean;
  }>;
}

export const uploadPrekeysSchema = z.object({
  identityKeySpki: z.string().min(10).max(4096),
  signedPrekeySpki: z.string().min(10).max(4096),
  signedPrekeySig: z.string().min(10).max(4096),
  oneTimePrekeys: z
    .array(
      z.object({
        keyId: z.number().int().min(0),
        keySpki: z.string().min(10).max(4096),
      }),
    )
    .min(1)
    .max(200),
});
export type UploadPrekeysDto = z.infer<typeof uploadPrekeysSchema>;

export const replenishPrekeysSchema = z.object({
  oneTimePrekeys: z
    .array(
      z.object({
        keyId: z.number().int().min(0),
        keySpki: z.string().min(10).max(4096),
      }),
    )
    .min(1)
    .max(200),
});
export type ReplenishPrekeysDto = z.infer<typeof replenishPrekeysSchema>;

export interface PrekeyBundleView {
  userId: string;
  identityKeySpki: string;
  signedPrekeySpki: string;
  signedPrekeySig: string;
  oneTimePrekey?: {
    keyId: number;
    keySpki: string;
  } | null;
}
