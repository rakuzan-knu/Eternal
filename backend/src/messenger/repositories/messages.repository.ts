import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MessageReaction, ConversationParticipant } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import type { MessageWithDetails } from '../interfaces/types';
import { messageInclude } from '../interfaces/types';

@Injectable()
export class MessagesRepository implements IMessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    conversationId: string;
    senderId: string;
    body?: string;
    messageType?: string;
    replyToId?: string;
    forwardedFromId?: string;
  }): Promise<MessageWithDetails> {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        body: data.body ?? null,
        messageType: (data.messageType ?? 'TEXT') as Prisma.MessageCreateInput['messageType'],
        replyToId: data.replyToId ?? null,
        forwardedFromId: data.forwardedFromId ?? null,
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
      orderBy: { createdAt: 'desc' },
      take: take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: messageInclude,
    });
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
    return this.prisma.messageReaction.upsert({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
      update: { createdAt: new Date() },
      create: { messageId, userId, emoji },
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
