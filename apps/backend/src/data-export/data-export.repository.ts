import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MessageBodyService } from '../common/cassandra/message-body.service';
import type { ExportPosition } from './data-export.cursor';

export interface ExportRecord {
  id: string;
  createdAt: Date;
  item: Record<string, unknown>;
}

function positionWhere(position: ExportPosition) {
  return {
    createdAt: { lte: position.snapshot },
    ...(position.after
      ? {
          OR: [
            { createdAt: { gt: position.after.createdAt } },
            { createdAt: position.after.createdAt, id: { gt: position.after.id } },
          ],
        }
      : {}),
  };
}

export function ownVisibleMessagesWhere(userId: string): Prisma.MessageWhereInput {
  return {
    senderId: userId,
    deletedForAll: false,
    deletedAt: null,
    deletedFor: { none: { userId } },
    conversation: {
      participants: { some: { userId, leftAt: null } },
      OR: [
        { communityChannel: { is: null } },
        {
          communityChannel: {
            is: {
              community: { members: { some: { userId, state: 'ACTIVE' } } },
              OR: [
                { isPrivate: false },
                { allowedUserIds: { has: userId } },
                { community: { ownerId: userId } },
                { community: { members: { some: { userId, state: 'ACTIVE', role: 'ADMIN' } } } },
              ],
            },
          },
        },
      ],
    },
  };
}

@Injectable()
export class DataExportRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBodies: MessageBodyService,
  ) {}

  async account(userId: string): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        birthDate: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user
      ? {
          ...user,
          birthDate: user.birthDate?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }
      : null;
  }

  async profile(userId: string): Promise<Record<string, unknown> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        isPrivate: true,
        activeDecorationId: true,
        activeProfileFrameId: true,
        activeProfileEffectId: true,
        activeNameplateId: true,
      },
    });
  }

  async settings(userId: string): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        autoDeletePeriod: true,
        defaultChatTheme: true,
        privacy: {
          select: {
            lastSeen: true,
            avatar: true,
            banner: true,
            forwardLink: true,
            calls: true,
            voiceMessages: true,
            messages: true,
            birthday: true,
            bio: true,
            groupInvites: true,
            themeProposals: true,
            allowNearbyRecommendations: true,
          },
        },
        notificationSettings: {
          select: {
            enableNotifications: true,
            allowSound: true,
            volume: true,
            showName: true,
            showText: true,
            privateChats: true,
            groups: true,
            reactions: true,
            likes: true,
            comments: true,
            reposts: true,
            followers: true,
            mentions: true,
            system: true,
            toastPosition: true,
            maxToasts: true,
            dndUntil: true,
          },
        },
      },
    });
    if (!user) return null;
    return {
      ...user,
      notificationSettings: user.notificationSettings
        ? {
            ...user.notificationSettings,
            dndUntil: user.notificationSettings.dndUntil?.toISOString() ?? null,
          }
        : null,
    };
  }

  async posts(userId: string, position: ExportPosition, take: number): Promise<ExportRecord[]> {
    const rows = await this.prisma.post.findMany({
      where: { authorId: userId, ...positionWhere(position) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
      select: { id: true, content: true, createdAt: true, updatedAt: true },
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      item: {
        ...row,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    }));
  }

  async comments(userId: string, position: ExportPosition, take: number): Promise<ExportRecord[]> {
    const rows = await this.prisma.comment.findMany({
      where: { userId, isDeleted: false, ...positionWhere(position) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        text: true,
        postId: true,
        parentId: true,
        rootParentId: true,
        isPinned: true,
        createdAt: true,
      },
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      item: { ...row, createdAt: row.createdAt.toISOString() },
    }));
  }

  async messages(userId: string, position: ExportPosition, take: number): Promise<ExportRecord[]> {
    const rows = await this.prisma.message.findMany({
      where: { AND: [ownVisibleMessagesWhere(userId), positionWhere(position)] },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take,
      select: {
        id: true,
        conversationId: true,
        body: true,
        bodyArchived: true,
        bodyRevision: true,
        messageType: true,
        editedAt: true,
        createdAt: true,
        attachments: {
          select: { id: true, type: true, fileName: true, mimeType: true, size: true },
        },
      },
    });
    await this.messageBodies.hydrate(rows);
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      item: {
        id: row.id,
        conversationId: row.conversationId,
        body: row.body,
        messageType: row.messageType,
        editedAt: row.editedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        attachments: row.attachments,
      },
    }));
  }
}
