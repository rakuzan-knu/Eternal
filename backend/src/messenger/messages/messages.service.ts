import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { MessageType, AttachmentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CONVERSATIONS_REPOSITORY } from '../interfaces/conversations-repository.interface';
import type { IConversationsRepository } from '../interfaces/conversations-repository.interface';
import { MESSAGES_REPOSITORY } from '../interfaces/messages-repository.interface';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import { MessengerMapper } from '../messenger.mapper';
import type { GetMessagesQueryDto, SearchMessagesQueryDto } from '../dto/message.dto';
import type { MessageView, PaginatedMessages } from '../dto/responses.dto';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(CONVERSATIONS_REPOSITORY)
    private readonly convsRepo: IConversationsRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepo: IMessagesRepository,
    private readonly mapper: MessengerMapper,
    private readonly prisma: PrismaService,
  ) {}

  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesQueryDto,
  ): Promise<PaginatedMessages> {
    await this.assertMember(conversationId, userId);

    const limit = Math.min(query.limit ?? 50, 100);
    const messages = await this.messagesRepo.findMany({
      conversationId,
      requestingUserId: userId,
      before: query.before,
      after: query.after,
      limit: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

    const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
    const pinnedSet = new Set(pinnedIds);

    return {
      data: data.map((m) => this.mapper.mapMessage(m, userId, pinnedSet)),
      hasMore,
      nextCursor,
    };
  }

  async markRead(conversationId: string, userId: string, messageId?: string): Promise<boolean> {
    await this.assertMember(conversationId, userId);

    let targetSenderId: string | null = null;

    if (messageId) {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true },
      });
      if (message) {
        targetSenderId = message.senderId;
      }
    } else {
      const lastMessage = await this.prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { senderId: true },
      });
      if (lastMessage) {
        targetSenderId = lastMessage.senderId;
      }
    }

    if (targetSenderId === userId) {
      return false;
    }

    await this.messagesRepo.markAllRead(conversationId, userId);
    return true;
  }

  async search(
    conversationId: string,
    userId: string,
    query: SearchMessagesQueryDto,
  ): Promise<MessageView[]> {
    await this.assertMember(conversationId, userId);
    const limit = Math.min(query.limit ?? 30, 100);
    const results = await this.messagesRepo.search(conversationId, query.q, limit);
    const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
    const pinnedSet = new Set(pinnedIds);
    return results.map((m) => this.mapper.mapMessage(m, userId, pinnedSet));
  }

  private async assertMember(conversationId: string, userId: string): Promise<void> {
    const p = await this.convsRepo.findParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');
  }

  async send(
    conversationId: string,
    senderId: string,
    dto: {
      text?: string;
      messageType?: MessageType;
      attachments?: Array<{
        type: AttachmentType;
        url: string;
        fileName?: string;
        mimeType?: string;
        size?: number;
        width?: number;
        height?: number;
        duration?: number;
        thumbnailUrl?: string;
      }>;
    },
  ): Promise<MessageView> {
    let finalMessageType = dto.messageType || MessageType.TEXT;
    if (!dto.messageType && dto.attachments && dto.attachments.length > 0) {
      finalMessageType = dto.attachments[0].type as unknown as MessageType;
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body: dto.text || null,
        messageType: finalMessageType,
        attachments:
          dto.attachments && dto.attachments.length > 0
            ? {
                create: dto.attachments.map((att) => ({
                  type: att.type,
                  url: att.url,
                  fileName: att.fileName || null,
                  mimeType: att.mimeType || null,
                  size: att.size || null,
                  width: att.width || null,
                  height: att.height || null,
                  duration: att.duration || null,
                  thumbnailUrl: att.thumbnailUrl || null,
                })),
              }
            : undefined,
      },
      include: {
        sender: true,
        attachments: true,
        conversation: {
          include: {
            participants: true,
          },
        },
        replyTo: {
          include: {
            sender: true,
            attachments: true,
          },
        },
        forwardedFrom: {
          include: {
            sender: true,
            attachments: true,
          },
        },
        reactions: {
          include: {
            user: true,
          },
        },
        deletedFor: true,
        pinnedIn: true,
        replies: true,
        forwards: true,
      },
    });

    const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
    const pinnedSet = new Set(pinnedIds);

    return this.mapper.mapMessage(message, senderId, pinnedSet);
  }
}
