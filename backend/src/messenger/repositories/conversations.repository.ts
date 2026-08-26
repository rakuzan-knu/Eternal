import { Injectable } from '@nestjs/common';
import { MuteLevel, ParticipantRole } from '@prisma/client';
import type { Conversation, ConversationParticipant } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type { IConversationsRepository } from '../interfaces/conversations-repository.interface';
import type { ConversationWithDetails, ParticipantWithUser } from '../interfaces/types';
import type { UserSnapshot } from '@common/contracts';
import { conversationInclude, participantInclude, userSnapshot } from '../interfaces/types';

@Injectable()
export class ConversationsRepository implements IConversationsRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      include: conversationInclude,
    });
  }

  async createGroup(data: {
    name: string;
    description?: string;
    createdById: string;
    memberIds: string[];
  }): Promise<ConversationWithDetails> {
    const allMemberIds = Array.from(new Set([data.createdById, ...data.memberIds]));
    return this.prisma.conversation.create({
      data: {
        type: 'GROUP',
        name: data.name,
        description: data.description,
        createdById: data.createdById,
        participants: {
          create: allMemberIds.map((userId) => ({
            userId,
            role: userId === data.createdById ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
          })),
        },
      },
      include: conversationInclude,
    });
  }

  findAllForUser(userId: string): Promise<ConversationWithDetails[]> {
    return this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId, leftAt: null },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: conversationInclude,
    });
  }

  findOneForUser(conversationId: string, userId: string): Promise<ConversationWithDetails | null> {
    return this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId, leftAt: null } },
      },
      include: conversationInclude,
    });
  }

  updateGroup(
    conversationId: string,
    data: { name?: string; description?: string; avatar?: string | null },
  ): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data,
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
          create: { conversationId, userId },
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
    await this.prisma.pinnedMessage.upsert({
      where: { conversationId_messageId: { conversationId, messageId } },
      update: { pinnedByUserId, pinnedAt: new Date() },
      create: { conversationId, messageId, pinnedByUserId },
    });
  }

  async unpinMessage(conversationId: string, messageId: string): Promise<void> {
    await this.prisma.pinnedMessage.delete({
      where: { conversationId_messageId: { conversationId, messageId } },
    });
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
}
