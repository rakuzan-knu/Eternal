import type { Prisma } from '@prisma/client';

export const userSnapshot = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} satisfies Prisma.UserSelect;

export const attachmentFields = {
  id: true,
  type: true,
  url: true,
  fileName: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  duration: true,
  thumbnailUrl: true,
} satisfies Prisma.MessageAttachmentSelect;

export const reactionFields = {
  id: true,
  emoji: true,
  userId: true,
  user: { select: userSnapshot },
  createdAt: true,
} satisfies Prisma.MessageReactionSelect;

export const messageInclude = {
  sender: { select: userSnapshot },
  attachments: { select: attachmentFields },
  reactions: {
    select: reactionFields,
  },
  conversation: {
    select: {
      participants: {
        select: {
          userId: true,
          lastReadAt: true,
        },
      },
    },
  },
  replyTo: {
    include: {
      sender: { select: userSnapshot },
      attachments: { select: attachmentFields },
    },
  },
  forwardedFrom: {
    include: {
      sender: { select: userSnapshot },
    },
  },
  pinnedIn: {
    select: { conversationId: true },
  },
  deletedFor: {
    select: { userId: true },
  },
} satisfies Prisma.MessageInclude;

export const participantInclude = {
  user: { select: userSnapshot },
} satisfies Prisma.ConversationParticipantInclude;

export const conversationInclude = {
  participants: {
    where: { leftAt: null },
    include: participantInclude,
  },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: messageInclude,
  },
  pinnedMessages: {
    orderBy: { pinnedAt: 'desc' as const },
    include: {
      message: { include: messageInclude },
    },
  },
} satisfies Prisma.ConversationInclude;

export type MessageWithDetails = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

export type ParticipantWithUser = Prisma.ConversationParticipantGetPayload<{
  include: typeof participantInclude;
}>;

export type ConversationWithDetails = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;
