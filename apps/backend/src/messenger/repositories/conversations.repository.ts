import { MessageBodyService } from '../../common/cassandra/message-body.service';
import { buildConversationPageQuery } from '../conversations/conversation-page.query';
import { Injectable, Optional } from '@nestjs/common';
import { MuteLevel, ParticipantRole, Prisma } from '@prisma/client';
import type { Conversation, ConversationParticipant } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { withUnreadWriteLock } from '../unread/unread-write-lock';
import type {
  IConversationsRepository,
  ConversationPageOptions,
  ConversationPageSelection,
} from '../interfaces/conversations-repository.interface';
import type {
  ConversationWithDetails,
  ParticipantWithUser,
  MessageWithDetails,
} from '../interfaces/types';
import type { UserSnapshot } from '@common/contracts';
import {
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  Permission,
} from '@common/contracts';
import {
  messageBodyOmit,
  conversationInclude,
  participantInclude,
  userSnapshot,
  conversationPreviewMessageInclude,
} from '../interfaces/types';

@Injectable()
export class ConversationsRepository implements IConversationsRepository {
  async isCommunityChannel(conversationId: string): Promise<boolean> {
    return Boolean(
      await this.prisma.communityChannel.findUnique({
        where: { conversationId },
        select: { communityId: true },
      }),
    );
  }
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly messageBodies?: MessageBodyService,
  ) {}

  findDirectBetween(userAId: string, userBId: string): Promise<Conversation | null> {
    return this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: userAId } } },
          { participants: { some: { userId: userBId } } },
        ],
      },
    });
  }

  async createDirect(userAId: string, userBId: string): Promise<ConversationWithDetails> {
    return this.hydrate(
      this.prisma.conversation.create({
        data: {
          type: 'DIRECT',
          participants: {
            create: [
              {
                userId: userAId,
                permissions: DEFAULT_MEMBER_PERMISSIONS | Permission.CAN_PIN_MESSAGES,
              },
              {
                userId: userBId,
                permissions: DEFAULT_MEMBER_PERMISSIONS | Permission.CAN_PIN_MESSAGES,
              },
            ],
          },
        },
        include: conversationInclude,
      }),
    );
  }

  async createGroup(data: {
    name: string;
    description?: string;
    createdById: string;
    memberIds: string[];
  }): Promise<ConversationWithDetails> {
    const allMemberIds = Array.from(new Set([data.createdById, ...data.memberIds]));
    return this.hydrate(
      this.prisma.conversation.create({
        data: {
          type: 'GROUP',
          name: data.name,
          description: data.description ?? null,
          createdById: data.createdById,
          participants: {
            create: allMemberIds.map((userId) => ({
              userId,
              role: userId === data.createdById ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
              permissions:
                userId === data.createdById
                  ? DEFAULT_OWNER_PERMISSIONS
                  : DEFAULT_MEMBER_PERMISSIONS,
            })),
          },
        },
        include: conversationInclude,
      }),
    );
  }

  findAllForUser(userId: string): Promise<ConversationWithDetails[]> {
    return this.hydrate(
      this.prisma.conversation.findMany({
        where: {
          participants: {
            some: { userId, leftAt: null },
          },
        },
        orderBy: { updatedAt: 'desc' },
        include: conversationInclude,
      }),
    );
  }

  async getPageSnapshot(userId: string): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      // Updates take the shared form of this lock until their transaction commits.
      // The fence prevents late commits from changing a completed snapshot.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('conversation-page:' || ${userId}, 0))`;
      // Preserve database microseconds: Date would truncate the fence to ms.
      const rows = await tx.$queryRaw<
        Array<{ snapshot: string }>
      >`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS snapshot`;
      return rows[0].snapshot;
    });
  }

  async findPageForUser(
    userId: string,
    options: ConversationPageOptions,
  ): Promise<ConversationPageSelection> {
    const selected = await this.prisma.$queryRaw<
      Array<{ id: string; createdAt: Date; unreadCount: bigint }>
    >(buildConversationPageQuery(userId, options));
    const window = selected.slice(0, options.limit);
    if (!window.length) return { rows: [], hasMore: false, boundary: null };
    const previewMessageInclude = conversationPreviewMessageInclude(userId);
    const mapPreview = (
      message: Prisma.MessageGetPayload<{
        omit: typeof messageBodyOmit;
        include: typeof previewMessageInclude;
      }>,
    ): MessageWithDetails => ({ ...message, reactions: [], pinnedIn: [] });
    const [conversations, ownParticipants] = await Promise.all([
      this.prisma.conversation.findMany({
        where: {
          id: { in: window.map((row) => row.id) },
          participants: { some: { userId, leftAt: null } },
        },
        include: {
          ...conversationInclude,
          participants: {
            where: { leftAt: null, userId: { not: userId } },
            orderBy: { userId: 'asc' },
            take: 63,
            include: participantInclude,
          },
          _count: { select: { participants: { where: { leftAt: null } } } },
          messages: { ...conversationInclude.messages, include: previewMessageInclude },
          pinnedMessages: {
            ...conversationInclude.pinnedMessages,
            take: 50,
            include: { message: { omit: messageBodyOmit, include: previewMessageInclude } },
          },
        },
      }),
      this.prisma.conversationParticipant.findMany({
        where: { conversationId: { in: window.map((row) => row.id) }, userId, leftAt: null },
        include: participantInclude,
      }),
    ]);
    if (this.messageBodies) await this.messageBodies.hydrate(conversations);

    const ownById = new Map(
      ownParticipants.map((participant) => [participant.conversationId, participant]),
    );
    const byId = new Map(
      conversations.map((conversation) => [
        conversation.id,
        {
          ...conversation,
          messages: (conversation.messages ?? []).map(mapPreview),
          pinnedMessages: (conversation.pinnedMessages ?? []).map((pin) => ({
            ...pin,
            message: mapPreview(pin.message),
          })),
        },
      ]),
    );
    return {
      rows: window.flatMap((row) => {
        const conversation = byId.get(row.id);
        const own = ownById.get(row.id);
        return conversation
          ? [
              {
                conversation: {
                  ...conversation,
                  participants: [...(own ? [own] : []), ...(conversation.participants ?? [])],
                },
                unreadCount: Number(row.unreadCount),
                participantCount:
                  conversation._count?.participants ?? conversation.participants?.length ?? 0,
              },
            ]
          : [];
      }),
      hasMore: selected.length > options.limit,
      boundary: window[window.length - 1],
    };
  }

  findOneForUser(conversationId: string, userId: string): Promise<ConversationWithDetails | null> {
    return this.hydrate(
      this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          participants: { some: { userId, leftAt: null } },
        },
        include: conversationInclude,
      }),
    );
  }

  updateGroup(
    conversationId: string,
    data: {
      name?: string | undefined;
      description?: string | undefined;
      avatar?: string | null | undefined;
    },
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      },
    });
  }

  findParticipant(conversationId: string, userId: string): Promise<ConversationParticipant | null> {
    return this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }

  findParticipants(conversationId: string): Promise<ParticipantWithUser[]> {
    return this.prisma.conversationParticipant.findMany({
      where: { conversationId, leftAt: null },
      include: participantInclude,
    });
  }

  async findBlockedUsers(blockerId: string): Promise<UserSnapshot[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      select: { blocked: { select: userSnapshot } },
    });
    return rows.map((r) => r.blocked);
  }

  async findParticipantIds(conversationId: string): Promise<string[]> {
    const rows = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, leftAt: null },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  async addParticipants(conversationId: string, userIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      userIds.map((userId) =>
        this.prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId, userId } },
          update: { leftAt: null, joinedAt: new Date() },
          create: { conversationId, userId, permissions: DEFAULT_MEMBER_PERMISSIONS },
        }),
      ),
    );
  }

  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { leftAt: new Date() },
    });
  }

  updateParticipant(
    conversationId: string,
    userId: string,
    data: Partial<{
      nickname: string | null;
      theme: string | null;
      muteLevel: MuteLevel;
      mutedUntil: Date | null;
      role: ParticipantRole;
      permissions: number;
      archivedAt: Date | null;
      leftAt: Date | null;
      pinnedAt: Date | null;
      lastReadAt: Date;
    }>,
  ): Promise<ConversationParticipant> {
    return this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data,
    });
  }

  async setUserDefaultChatTheme(userId: string, theme: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultChatTheme: theme },
    });
  }

  async updateAllParticipantsForUser(
    userId: string,
    data: Partial<{ theme: string | null }>,
  ): Promise<void> {
    await this.prisma.conversationParticipant.updateMany({
      where: { userId },
      data,
    });
  }

  async touchUpdatedAt(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async countUnread(
    conversationId: string,
    userId: string,
    hiddenUserIds: string[] = [],
  ): Promise<number> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      select: { joinedAt: true, lastReadAt: true },
    });

    if (!participant || participant.joinedAt === null) return 0;

    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { notIn: [userId, ...hiddenUserIds] },
        deletedAt: null,
        deletedForAll: false,
        createdAt: {
          gte: participant.joinedAt,
          gt: participant.lastReadAt,
        },
        deletedFor: { none: { userId } },
      },
    });
  }

  findPinnedMessages(conversationId: string): Promise<string[]> {
    return this.prisma.pinnedMessage
      .findMany({
        where: { conversationId },
        orderBy: { pinnedAt: 'desc' },
        select: { messageId: true },
      })
      .then((rows) => rows.map((r) => r.messageId));
  }

  async pinMessage(
    conversationId: string,
    messageId: string,
    pinnedByUserId: string,
  ): Promise<void> {
    await withUnreadWriteLock(
      this.prisma,
      { conversationIds: [conversationId], requireWritableChannel: true, actorId: pinnedByUserId },
      (tx) =>
        tx.pinnedMessage.upsert({
          where: { conversationId_messageId: { conversationId, messageId } },
          update: { pinnedByUserId, pinnedAt: new Date() },
          create: { conversationId, messageId, pinnedByUserId },
        }),
    );
  }

  async unpinMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
    await withUnreadWriteLock(
      this.prisma,
      { conversationIds: [conversationId], actorId: userId },
      (tx) =>
        tx.pinnedMessage.delete({
          where: { conversationId_messageId: { conversationId, messageId } },
        }),
    );
  }

  async updateSharedTheme(conversationId: string, theme: string | null): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        sharedTheme: theme,
        sharedThemeUpdatedAt: theme ? new Date() : null,
      },
    });
  }
  private async hydrate<T>(result: Promise<T>): Promise<T> {
    const value = await result;
    return this.messageBodies ? this.messageBodies.hydrate(value) : value;
  }
}
