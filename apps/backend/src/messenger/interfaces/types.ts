import type { Prisma } from '@prisma/client';

export const userSnapshot = {
  id: true,
  username: true,
  displayName: true,
  displayNameStyle: true,
  avatar: true,
  activeDecoration: true,
  activeNameplate: true,
  isVerified: true,
  primaryBadge: true,
  defaultChatTheme: true,
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
  waveform: true,
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
      deletedFor: { select: { userId: true } },
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

/** List previews do not display reactions or pin backreferences. Deletion
 * visibility only needs the requesting user's row, including on the reply. */
export function conversationPreviewMessageInclude(userId: string) {
  const deletedFor = {
    where: { userId },
    select: { userId: true },
    take: 1,
  } satisfies Prisma.MessageDeletionFindManyArgs;
  return {
    sender: messageInclude.sender,
    attachments: messageInclude.attachments,
    conversation: {
      select: {
        participants: {
          where: { leftAt: null },
          orderBy: { lastReadAt: 'desc' },
          take: 64,
          select: { userId: true, lastReadAt: true },
        },
      },
    },
    replyTo: {
      include: {
        sender: messageInclude.replyTo.include.sender,
        attachments: messageInclude.replyTo.include.attachments,
        deletedFor,
      },
    },
    forwardedFrom: messageInclude.forwardedFrom,
    deletedFor,
  } satisfies Prisma.MessageInclude;
}

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

export const callParticipantInclude = {
  user: { select: userSnapshot },
} satisfies Prisma.CallParticipantInclude;

export const callInclude = {
  initiator: { select: userSnapshot },
  participants: {
    include: callParticipantInclude,
  },
} satisfies Prisma.CallInclude;

export type CallWithDetails = Prisma.CallGetPayload<{
  include: typeof callInclude;
}>;

export type CallParticipantWithUser = Prisma.CallParticipantGetPayload<{
  include: typeof callParticipantInclude;
}>;
