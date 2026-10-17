import { MessageBodyService } from '../../common/cassandra/message-body.service';
import { Injectable, Optional } from '@nestjs/common';
import { AttachmentType, MessageType, Prisma } from '@prisma/client';
import type { MessageReaction, ConversationParticipant } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { SnowflakeService } from '../../common/id/snowflake.service';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import type { MessageWithDetails } from '../interfaces/types';
import { messageBodyOmit, messageInclude } from '../interfaces/types';
import type { ChatActivityMap } from '@common/contracts';
import { withUnreadWriteLock } from '../unread/unread-write-lock';

@Injectable()
export class MessagesRepository implements IMessagesRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    private readonly snowflake?: SnowflakeService,
    @Optional() private readonly messageBodies?: MessageBodyService,
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
    attachments?:
      | Array<{
          type: AttachmentType;
          url: string;
          fileName?: string | null | undefined;
          mimeType?: string | null | undefined;
          size?: number | null | undefined;
          width?: number | null | undefined;
          height?: number | null | undefined;
          duration?: number | null | undefined;
          waveform?: number[] | any | undefined;
          thumbnailUrl?: string | null | undefined;
        }>
      | undefined;
  }): Promise<MessageWithDetails> {
    const msgId = data.id ?? (this.snowflake ? this.snowflake.generate() : undefined);
    return this.hydrate(
      withUnreadWriteLock(this.prisma, { conversationIds: [data.conversationId] }, (tx) =>
        tx.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: data.senderId,
            body: data.body ?? null,
            clientSeq: data.clientSeq ?? null,
            messageType: (data.messageType as MessageType) || MessageType.TEXT,
            replyToId: data.replyToId ?? null,
            forwardedFromId: data.forwardedFromId ?? null,
            ...(msgId ? { id: msgId } : {}),
            ...(data.attachments && data.attachments.length > 0
              ? {
                  attachments: {
                    create: data.attachments.map((att) => ({
                      type: att.type,
                      url: att.url,
                      fileName: att.fileName || null,
                      mimeType: att.mimeType || null,
                      size: att.size != null ? Math.round(att.size) : null,
                      width: att.width != null ? Math.round(att.width) : null,
                      height: att.height != null ? Math.round(att.height) : null,
                      duration: att.duration != null ? Math.round(att.duration) : null,
                      waveform: Array.isArray(att.waveform)
                        ? att.waveform.map((w: number) => Math.min(100, Math.max(0, Math.round(w))))
                        : [],
                      thumbnailUrl: att.thumbnailUrl || null,
                    })),
                  },
                }
              : {}),
          },
          omit: messageBodyOmit,
          include: messageInclude,
        }),
      ),
    );
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

    return this.hydrate(
      this.prisma.message.findMany({
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
        omit: messageBodyOmit,
        include: messageInclude,
      }),
    );
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
        omit: messageBodyOmit,
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
        omit: messageBodyOmit,
        include: messageInclude,
      }),
    ]);

    const combined = [...afterMsgs.reverse(), ...beforeMsgs];
    const map = new Map<string, MessageWithDetails>();
    combined.forEach((m) => map.set(m.id, m));
    return this.hydrate(
      Promise.resolve(
        Array.from(map.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      ),
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
      omit: messageBodyOmit,
      include: {
        attachments: true,
      },
    });

    if (this.messageBodies) await this.messageBodies.hydrate(messages);

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

  findOne(messageId: string, requestingUserId: string): Promise<MessageWithDetails | null> {
    return this.hydrate(
      this.prisma.message.findFirst({
        where: {
          id: messageId,
          deletedForAll: false,
          deletedFor: { none: { userId: requestingUserId } },
          conversation: { participants: { some: { userId: requestingUserId, leftAt: null } } },
        },
        omit: messageBodyOmit,
        include: messageInclude,
      }),
    );
  }

  async edit(messageId: string, body: string): Promise<MessageWithDetails> {
    return this.hydrate(
      this.prisma.message.update({
        where: { id: messageId },
        data: { body, editedAt: new Date() },
        omit: messageBodyOmit,
        include: messageInclude,
      }),
    );
  }

  async deleteForAll(messageId: string): Promise<void> {
    await withUnreadWriteLock(this.prisma, { messageIds: [messageId] }, (tx) =>
      tx.message.update({
        where: { id: messageId },
        omit: messageBodyOmit,
        data: {
          body: null,
          messageType: 'DELETED',
          deletedAt: new Date(),
          deletedForAll: true,
        },
      }),
    );
  }

  async deleteForMe(messageId: string, userId: string): Promise<void> {
    await withUnreadWriteLock(this.prisma, { messageIds: [messageId] }, (tx) =>
      tx.messageDeletion.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { deletedAt: new Date() },
        create: { messageId, userId },
      }),
    );
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
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`
        SELECT id FROM "ConversationParticipant"
        WHERE "conversationId" = ${conversationId} AND "userId" = ${userId}
        FOR UPDATE
      `);
      // A separate statement after the lock sees sends which committed while
      // this acknowledgement waited. A default send can be beyond wall time
      // after clock skew, so acknowledge the latest visible message as well.
      await tx.$executeRaw(Prisma.sql`
        UPDATE "ConversationParticipant" p SET "lastReadAt" = GREATEST(
          p."lastReadAt", clock_timestamp()::timestamp(3),
          (SELECT MAX(m."createdAt") FROM "Message" m
            WHERE m."conversationId" = p."conversationId"
              AND m."deletedAt" IS NULL AND NOT m."deletedForAll"
              AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d
                WHERE d."messageId" = m.id AND d."userId" = p."userId"))
        ), "updatedAt" = clock_timestamp()::timestamp(3)
        WHERE p."conversationId" = ${conversationId} AND p."userId" = ${userId}
      `);
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
    return this.hydrate(
      this.prisma.message.findMany({
        where: {
          conversationId,
          bodySearch: { contains: escapedQuery, mode: 'insensitive' },
          deletedAt: null,
          deletedForAll: false,
          ...(hiddenUserIds && hiddenUserIds.length > 0
            ? { senderId: { notIn: hiddenUserIds } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        omit: messageBodyOmit,
        include: messageInclude,
      }),
    );
  }

  findLastMessage(conversationId: string): Promise<MessageWithDetails | null> {
    return this.hydrate(
      this.prisma.message.findFirst({
        where: { conversationId, deletedForAll: false },
        orderBy: { createdAt: 'desc' },
        omit: messageBodyOmit,
        include: messageInclude,
      }),
    );
  }

  async belongsToConversation(messageId: string, conversationId: string): Promise<boolean> {
    const msg = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId },
      select: { id: true },
    });
    return !!msg;
  }
  private async hydrate<T>(result: Promise<T>): Promise<T> {
    const value = await result;
    return this.messageBodies ? this.messageBodies.hydrate(value) : value;
  }
}
