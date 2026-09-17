import { Injectable, Optional } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import type { MessageReaction, ConversationParticipant } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { SnowflakeService } from '../../common/id/snowflake.service';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import type { MessageWithDetails } from '../interfaces/types';
import { messageInclude } from '../interfaces/types';
import type { ChatActivityMap } from '@common/contracts';

@Injectable()
export class MessagesRepository implements IMessagesRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly snowflake?: SnowflakeService,
  ) {}

  async create(data: {
    conversationId: string;
    senderId: string;
    body?: string | undefined;
    clientSeq?: number | undefined;
    messageType?: string | undefined;
    replyToId?: string | undefined;
    forwardedFromId?: string | undefined;
    id?: string | undefined;
  }): Promise<MessageWithDetails> {
    const msgId = data.id ?? (this.snowflake ? this.snowflake.generate() : undefined);
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        body: data.body ?? null,
        clientSeq: data.clientSeq ?? null,
        messageType: (data.messageType as MessageType) || MessageType.TEXT,
        replyToId: data.replyToId ?? null,
        forwardedFromId: data.forwardedFromId ?? null,
        ...(msgId ? { id: msgId } : {}),
      },
      include: messageInclude,
    });
  }

  async findMany(params: {
    conversationId: string;
    requestingUserId: string;
    before?: string;
    after?: string;
    limit: number;
    hiddenUserIds?: string[];
  }): Promise<MessageWithDetails[]> {
    const { conversationId, requestingUserId, before, after, limit, hiddenUserIds } = params;
    const cursor = before ?? after;
    const take = before ? limit : after ? -limit : limit;

    return this.prisma.message.findMany({
      where: {
        conversationId,
        deletedForAll: false,
        deletedFor: { none: { userId: requestingUserId } },
        ...(hiddenUserIds && hiddenUserIds.length > 0
          ? { senderId: { notIn: hiddenUserIds } }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { clientSeq: 'desc' }, { id: 'desc' }],
      take: take,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      include: messageInclude,
    });
  }

  async findAround(params: {
    conversationId: string;
    targetMessageId: string;
    requestingUserId: string;
    limit: number;
    hiddenUserIds?: string[] | undefined;
  }): Promise<MessageWithDetails[]> {
    const { conversationId, targetMessageId, requestingUserId, limit, hiddenUserIds } = params;
    const target = await this.prisma.message.findUnique({
      where: { id: targetMessageId },
      select: { createdAt: true },
    });
    if (!target) return [];

    const half = Math.max(1, Math.floor(limit / 2));

    const [beforeMsgs, afterMsgs] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId,
          deletedForAll: false,
          deletedFor: { none: { userId: requestingUserId } },
          createdAt: { lte: target.createdAt },
          ...(hiddenUserIds && hiddenUserIds.length > 0
            ? { senderId: { notIn: hiddenUserIds } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: half + 1,
        include: messageInclude,
      }),
      this.prisma.message.findMany({
        where: {
          conversationId,
          deletedForAll: false,
          deletedFor: { none: { userId: requestingUserId } },
          createdAt: { gt: target.createdAt },
          ...(hiddenUserIds && hiddenUserIds.length > 0
            ? { senderId: { notIn: hiddenUserIds } }
            : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: half,
        include: messageInclude,
      }),
    ]);

    const combined = [...afterMsgs.reverse(), ...beforeMsgs];
    const map = new Map<string, MessageWithDetails>();
    combined.forEach((m) => map.set(m.id, m));
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async findAroundDate(params: {
    conversationId: string;
    targetDate: Date;
    requestingUserId: string;
    limit: number;
    hiddenUserIds?: string[];
  }): Promise<MessageWithDetails[]> {
    const { conversationId, targetDate, requestingUserId, limit, hiddenUserIds } = params;

    let anchor = await this.prisma.message.findFirst({
      where: {
        conversationId,
        deletedForAll: false,
        deletedFor: { none: { userId: requestingUserId } },
        createdAt: { gte: targetDate },
        ...(hiddenUserIds && hiddenUserIds.length > 0
          ? { senderId: { notIn: hiddenUserIds } }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!anchor) {
      anchor = await this.prisma.message.findFirst({
        where: {
          conversationId,
          deletedForAll: false,
          deletedFor: { none: { userId: requestingUserId } },
          createdAt: { lte: targetDate },
          ...(hiddenUserIds && hiddenUserIds.length > 0
            ? { senderId: { notIn: hiddenUserIds } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
    }

    if (!anchor) return [];

    return this.findAround({
      conversationId,
      targetMessageId: anchor.id,
      requestingUserId,
      limit,
      hiddenUserIds,
    });
  }

  async getActivityMap(params: {
    conversationId: string;
    year: number;
    month: number;
    timezone?: string | undefined;
    requestingUserId: string;
    hiddenUserIds?: string[] | undefined;
  }): Promise<ChatActivityMap> {
    const {
      conversationId,
      year,
      month,
      timezone = 'UTC',
      requestingUserId,
      hiddenUserIds,
    } = params;

    const startDateUtc = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDateUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0));
    const windowStart = new Date(startDateUtc.getTime() - 36 * 3600 * 1000);
    const windowEnd = new Date(endDateUtc.getTime() + 36 * 3600 * 1000);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedForAll: false,
        deletedFor: { none: { userId: requestingUserId } },
        createdAt: {
          gte: windowStart,
          lt: windowEnd,
        },
        ...(hiddenUserIds && hiddenUserIds.length > 0
          ? { senderId: { notIn: hiddenUserIds } }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        attachments: true,
      },
    });

    let formatter: Intl.DateTimeFormat;
    try {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    }

    const targetMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const activityMap: Record<
      string,
      {
        messageCount: number;
        previewMediaUrl?: string | undefined;
        firstMessageSnippet?: string | undefined;
        firstMessageId?: string | undefined;
        mediaCount?: number | undefined;
      }
    > = {};

    for (const msg of messages) {
      const dayKey = formatter.format(new Date(msg.createdAt));
      if (!dayKey.startsWith(targetMonthPrefix)) {
        continue;
      }

      if (!activityMap[dayKey]) {
        let snippet: string | undefined = undefined;
        if (msg.body) {
          snippet = msg.body.slice(0, 80);
        } else if (msg.attachments && msg.attachments.length > 0) {
          const firstAtt = msg.attachments[0];
          if (firstAtt.type === 'IMAGE') snippet = '📷 Photo';
          else if (firstAtt.type === 'VIDEO') snippet = '🎥 Video';
          else if (firstAtt.type === 'AUDIO') snippet = '🎤 Voice message';
          else snippet = '📎 Attachment';
        } else if (msg.messageType === 'STICKER') {
          snippet = '🎭 Sticker';
        }

        activityMap[dayKey] = {
          messageCount: 1,
          firstMessageSnippet: snippet,
          firstMessageId: msg.id,
          mediaCount: 0,
        };
      } else {
        activityMap[dayKey].messageCount += 1;
      }

      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.type === 'IMAGE' || att.type === 'VIDEO') {
            activityMap[dayKey].mediaCount = (activityMap[dayKey].mediaCount || 0) + 1;
            if (!activityMap[dayKey].previewMediaUrl) {
              activityMap[dayKey].previewMediaUrl = att.thumbnailUrl || att.url;
            }
          }
        }
      }
    }

    return activityMap;
  }

  findOne(messageId: string, _requestingUserId: string): Promise<MessageWithDetails | null> {
    void _requestingUserId;

    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });
  }

  async edit(messageId: string, body: string): Promise<MessageWithDetails> {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { body, editedAt: new Date() },
      include: messageInclude,
    });
  }

  async deleteForAll(messageId: string): Promise<void> {
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        body: null,
        messageType: 'DELETED',
        deletedAt: new Date(),
        deletedForAll: true,
      },
    });
  }

  async deleteForMe(messageId: string, userId: string): Promise<void> {
    await this.prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { deletedAt: new Date() },
      create: { messageId, userId },
    });
  }

  async markRead(messageId: string, userId: string): Promise<ConversationParticipant | null> {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true, createdAt: true },
    });

    if (!msg) return null;

    return this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: msg.conversationId, userId } },
      data: { lastReadAt: msg.createdAt },
    });
  }

  async markAllRead(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    return this.prisma.$transaction(async (tx) => {
      await tx.messageReaction.deleteMany({
        where: { messageId, userId, emoji: { not: emoji } },
      });
      return tx.messageReaction.upsert({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
        update: { createdAt: new Date() },
        create: { messageId, userId, emoji },
      });
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await this.prisma.messageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
  }

  getReactions(messageId: string): Promise<MessageReaction[]> {
    return this.prisma.messageReaction.findMany({
      where: { messageId },
    });
  }

  search(
    conversationId: string,
    query: string,
    limit: number,
    hiddenUserIds?: string[],
  ): Promise<MessageWithDetails[]> {
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
    return this.prisma.message.findMany({
      where: {
        conversationId,
        body: { contains: escapedQuery, mode: 'insensitive' },
        deletedAt: null,
        deletedForAll: false,
        ...(hiddenUserIds && hiddenUserIds.length > 0
          ? { senderId: { notIn: hiddenUserIds } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: messageInclude,
    });
  }

  findLastMessage(conversationId: string): Promise<MessageWithDetails | null> {
    return this.prisma.message.findFirst({
      where: { conversationId, deletedForAll: false },
      orderBy: { createdAt: 'desc' },
      include: messageInclude,
    });
  }

  async belongsToConversation(messageId: string, conversationId: string): Promise<boolean> {
    const msg = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    return !!msg;
  }
}
