import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentType, MessageType } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';
import { uid } from 'uid';
import { PrismaService } from '@common/prisma';
import { uploadToStorageWithFallback } from '../../common/media/image-processor';
import { CONVERSATIONS_REPOSITORY } from '../interfaces/conversations-repository.interface';
import type { IConversationsRepository } from '../interfaces/conversations-repository.interface';
import { MESSAGES_REPOSITORY } from '../interfaces/messages-repository.interface';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import { MessengerMapper } from '../messenger.mapper';
import type {
  GetMessagesQueryDto,
  SearchMessagesQueryDto,
  EditMessageDto,
  DeleteMessageDto,
  BatchDeleteMessagesDto,
  ForwardMessageDto,
  ForwardMultipleMessagesDto,
  ReactToMessageDto,
  SendMessageDto,
  MessageView,
  PaginatedMessages,
} from '@common/contracts';

@Injectable()
export class MessagesService {
  private readonly s3: S3Client;

  constructor(
    @Inject(CONVERSATIONS_REPOSITORY)
    private readonly convsRepo: IConversationsRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepo: IMessagesRepository,
    private readonly mapper: MessengerMapper,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.s3 = new S3Client({
      endpoint:
        this.configService.get<string>('MINIO_ENDPOINT') ??
        this.configService.get<string>('S3_ENDPOINT') ??
        'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') ??
          this.configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ??
          this.configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: true,
    });
  }

  async uploadAttachment(
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<{
    type: AttachmentType;
    url: string;
    fileName: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
  }> {
    await this.assertMember(conversationId, userId);
    await this.assertNotBlockedDirect(conversationId, userId);

    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
    if (file.buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 25 MB limit');
    }

    const mimetype = (file.mimetype || '').toLowerCase();
    const originalName = (file.originalname || '').toLowerCase();
    let attachmentType: AttachmentType = AttachmentType.FILE;

    if (mimetype === 'image/gif' || originalName.endsWith('.gif')) {
      attachmentType = AttachmentType.GIF;
    } else if (
      mimetype.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|avif|bmp|svg)$/i.test(originalName)
    ) {
      attachmentType = AttachmentType.IMAGE;
    } else if (mimetype.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/i.test(originalName)) {
      attachmentType = AttachmentType.VIDEO;
    } else if (
      mimetype.startsWith('audio/') ||
      /\.(mp3|wav|ogg|m4a|aac|opus|webm)$/i.test(originalName)
    ) {
      attachmentType = AttachmentType.AUDIO;
    }

    const fileId = uid(16);
    const originalExt =
      file.originalname?.split('.').pop() ||
      (attachmentType === AttachmentType.AUDIO
        ? 'webm'
        : attachmentType === AttachmentType.VIDEO
          ? 'webm'
          : 'bin');
    const key = `attachments/${conversationId}/${fileId}.${originalExt}`;

    const bucket = this.configService.get<string>('MINIO_BUCKET', 'attachments');
    const publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';

    const url = await uploadToStorageWithFallback(this.s3, {
      bucket,
      key,
      buffer: file.buffer,
      contentType: file.mimetype || 'application/octet-stream',
      publicUrl,
    });

    return {
      type: attachmentType,
      url,
      fileName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.buffer.length,
    };
  }

  async send(conversationId: string, senderId: string, dto: SendMessageDto): Promise<MessageView> {
    await this.assertMember(conversationId, senderId);
    await this.assertNotBlockedDirect(conversationId, senderId);

    let finalMessageType = dto.messageType || MessageType.TEXT;
    if (
      (!dto.messageType || dto.messageType === MessageType.TEXT) &&
      dto.attachments &&
      dto.attachments.length > 0 &&
      (!dto.text || !dto.text.trim())
    ) {
      finalMessageType = dto.attachments[0].type as unknown as MessageType;
    }

    // Backend validation against circle spoofing & duration limits (max 60s for video circles, max 60m for audio/video)
    if (dto.attachments && dto.attachments.length > 0) {
      for (const att of dto.attachments) {
        const isVideoNote =
          att.type === AttachmentType.VIDEO &&
          (att.fileName?.includes('video_note') ||
            att.mimeType?.includes('video_note') ||
            (att.width && att.height && att.width === att.height));

        if (isVideoNote && att.duration && att.duration > 65) {
          throw new BadRequestException('Video notes (circles) cannot exceed 60 seconds');
        }

        if (
          (att.type === AttachmentType.AUDIO || att.type === AttachmentType.VIDEO) &&
          att.duration &&
          att.duration > 3660
        ) {
          throw new BadRequestException('Audio and video messages cannot exceed 60 minutes');
        }

        if (att.size && att.size > 50 * 1024 * 1024) {
          throw new BadRequestException('Attachment size cannot exceed 50 MB');
        }
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        body: dto.text || null,
        messageType: finalMessageType,
        replyToId: dto.replyToId || undefined,
        forwardedFromId: dto.forwardedFromId || undefined,
        attachments:
          dto.attachments && dto.attachments.length > 0
            ? {
                create: dto.attachments.map((att) => ({
                  type: att.type,
                  url: att.url,
                  fileName: att.fileName || null,
                  mimeType: att.mimeType || null,
                  size: att.size != null ? Math.round(att.size) : null,
                  width: att.width != null ? Math.round(att.width) : null,
                  height: att.height != null ? Math.round(att.height) : null,
                  duration: att.duration != null ? Math.round(att.duration) : null,
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

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
    const pinnedSet = new Set(pinnedIds);

    return this.mapper.mapMessage(message, senderId, pinnedSet);
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesQueryDto,
  ): Promise<PaginatedMessages> {
    await this.assertMember(conversationId, userId);

    const hiddenUserIds = await this.getHiddenUserIds(userId);
    const limit = Math.min(query.limit ?? 50, 100);
    const messages = await this.messagesRepo.findMany({
      conversationId,
      requestingUserId: userId,
      before: query.before,
      after: query.after,
      limit: limit + 1,
      hiddenUserIds,
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

  async getAround(
    conversationId: string,
    messageId: string,
    userId: string,
    limit = 50,
  ): Promise<PaginatedMessages> {
    await this.assertMember(conversationId, userId);

    const hiddenUserIds = await this.getHiddenUserIds(userId);
    const messages = await this.messagesRepo.findAround({
      conversationId,
      targetMessageId: messageId,
      requestingUserId: userId,
      limit,
      hiddenUserIds,
    });

    const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
    const pinnedSet = new Set(pinnedIds);

    return {
      data: messages.map((m) => this.mapper.mapMessage(m, userId, pinnedSet)),
      hasMore: false,
      nextCursor: null,
    };
  }

  async edit(messageId: string, userId: string, dto: EditMessageDto): Promise<MessageView> {
    const msg = await this.messagesRepo.findOne(messageId, userId);
    if (!msg) throw new NotFoundException('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenException('Cannot edit others messages');
    if (msg.messageType !== 'TEXT')
      throw new ForbiddenException('Only text messages can be edited');

    await this.assertMember(msg.conversationId, userId);

    const updated = await this.messagesRepo.edit(messageId, dto.body);
    const pinnedIds = await this.convsRepo.findPinnedMessages(msg.conversationId);
    return this.mapper.mapMessage(updated, userId, new Set(pinnedIds));
  }

  async delete(
    messageId: string,
    userId: string,
    dto: DeleteMessageDto,
  ): Promise<{ messageId: string; deletedForAll: boolean }> {
    const msg = await this.messagesRepo.findOne(messageId, userId);
    if (!msg) throw new NotFoundException('Message not found');
    await this.assertMember(msg.conversationId, userId);

    const forAll = dto.forAll ?? false;

    if (forAll) {
      if (msg.senderId !== userId) {
        const p = await this.convsRepo.findParticipant(msg.conversationId, userId);
        if (!p || (p.role !== 'ADMIN' && p.role !== 'OWNER')) {
          throw new ForbiddenException('Cannot delete message for everyone');
        }

        const senderParticipant = await this.convsRepo.findParticipant(
          msg.conversationId,
          msg.senderId,
        );
        if (senderParticipant) {
          if (senderParticipant.role === 'OWNER') {
            throw new ForbiddenException('Cannot delete messages from the group owner');
          }
          if (p.role === 'ADMIN' && senderParticipant.role === 'ADMIN') {
            throw new ForbiddenException('Admins cannot delete messages from other admins');
          }
        }
      }
      await this.messagesRepo.deleteForAll(messageId);
    } else {
      await this.messagesRepo.deleteForMe(messageId, userId);
    }

    return { messageId, deletedForAll: forAll };
  }

  async batchDelete(
    conversationId: string,
    userId: string,
    dto: BatchDeleteMessagesDto,
  ): Promise<{ deletedIds: string[]; forAll: boolean }> {
    await this.assertMember(conversationId, userId);

    const messageIds = dto.messageIds;
    if (messageIds.length === 0) {
      return { deletedIds: [], forAll: !!dto.forAll };
    }
    if (messageIds.length > 50) {
      throw new BadRequestException('Cannot batch delete more than 50 messages at once');
    }

    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const participant = conv.participants.find((p) => p.userId === userId);
    if (!participant || participant.leftAt) {
      throw new ForbiddenException('You are not an active participant');
    }

    const forAll = dto.forAll ?? false;

    if (forAll) {
      const isGroupAdminOrOwner =
        conv.type === 'GROUP' && (participant.role === 'ADMIN' || participant.role === 'OWNER');

      const messages = await this.prisma.message.findMany({
        where: {
          id: { in: messageIds },
          conversationId,
        },
        select: { id: true, senderId: true },
      });

      if (!isGroupAdminOrOwner) {
        const unauthorized = messages.some((m) => m.senderId !== userId);
        if (unauthorized) {
          throw new ForbiddenException('Cannot delete other users messages for everyone');
        }
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.message.updateMany({
          where: { id: { in: messageIds }, conversationId },
          data: {
            body: null,
            messageType: 'DELETED',
            deletedAt: new Date(),
            deletedForAll: true,
          },
        });
      });
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.messageDeletion.createMany({
          data: messageIds.map((id) => ({ messageId: id, userId })),
          skipDuplicates: true,
        });
      });
    }

    return { deletedIds: messageIds, forAll };
  }

  async forward(messageId: string, userId: string, dto: ForwardMessageDto): Promise<MessageView[]> {
    const original = await this.messagesRepo.findOne(messageId, userId);
    if (!original) throw new NotFoundException('Message not found');

    const results: MessageView[] = [];

    for (const conversationId of dto.conversationIds) {
      await this.assertMember(conversationId, userId);

      const msg = await this.messagesRepo.create({
        conversationId,
        senderId: userId,
        body: original.body ?? undefined,
        messageType: original.messageType,
        forwardedFromId: dto.hideAuthor ? undefined : messageId,
      });
      await this.convsRepo.touchUpdatedAt(conversationId);
      const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
      results.push(this.mapper.mapMessage(msg, userId, new Set(pinnedIds)));
    }

    return results;
  }

  async batchForward(
    conversationId: string,
    userId: string,
    dto: ForwardMultipleMessagesDto,
  ): Promise<MessageView[]> {
    await this.assertMember(conversationId, userId);

    const messageIds = dto.messageIds;
    if (messageIds.length > 50) {
      throw new BadRequestException('Cannot batch forward more than 50 messages at once');
    }

    const messages = await this.prisma.message.findMany({
      where: { id: { in: messageIds }, conversationId },
      include: { attachments: true },
      orderBy: { createdAt: 'asc' },
    });

    const results: MessageView[] = [];

    for (const targetConvId of dto.conversationIds) {
      await this.assertMember(targetConvId, userId);

      for (const msg of messages) {
        const created = await this.messagesRepo.create({
          conversationId: targetConvId,
          senderId: userId,
          body: msg.body ?? undefined,
          messageType: msg.messageType,
          forwardedFromId: dto.hideAuthor ? undefined : msg.id,
        });
        await this.convsRepo.touchUpdatedAt(targetConvId);
        const pinnedIds = await this.convsRepo.findPinnedMessages(targetConvId);
        results.push(this.mapper.mapMessage(created, userId, new Set(pinnedIds)));
      }
    }

    return results;
  }

  async addReaction(
    messageId: string,
    userId: string,
    dto: ReactToMessageDto,
  ): Promise<MessageView> {
    const msg = await this.messagesRepo.findOne(messageId, userId);
    if (!msg) throw new NotFoundException('Message not found');
    await this.assertMember(msg.conversationId, userId);

    await this.messagesRepo.addReaction(messageId, userId, dto.emoji);
    const updated = await this.messagesRepo.findOne(messageId, userId);
    const pinnedIds = await this.convsRepo.findPinnedMessages(msg.conversationId);
    return this.mapper.mapMessage(updated!, userId, new Set(pinnedIds));
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<MessageView> {
    const msg = await this.messagesRepo.findOne(messageId, userId);
    if (!msg) throw new NotFoundException('Message not found');
    await this.assertMember(msg.conversationId, userId);

    await this.messagesRepo.removeReaction(messageId, userId, emoji);
    const updated = await this.messagesRepo.findOne(messageId, userId);
    const pinnedIds = await this.convsRepo.findPinnedMessages(msg.conversationId);
    return this.mapper.mapMessage(updated!, userId, new Set(pinnedIds));
  }

  async pinMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
    await this.assertMember(conversationId, userId);

    const belongs = await this.messagesRepo.belongsToConversation(messageId, conversationId);
    if (!belongs) throw new NotFoundException('Message not found in this conversation');

    await this.convsRepo.pinMessage(conversationId, messageId, userId);
  }

  async unpinMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
    await this.assertMember(conversationId, userId);
    await this.convsRepo.unpinMessage(conversationId, messageId);
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
    const hiddenUserIds = await this.getHiddenUserIds(userId);
    const limit = Math.min(query.limit ?? 30, 100);
    const results = await this.messagesRepo.search(conversationId, query.q, limit, hiddenUserIds);
    const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
    const pinnedSet = new Set(pinnedIds);
    return results.map((m) => this.mapper.mapMessage(m, userId, pinnedSet));
  }

  private async assertMember(conversationId: string, userId: string): Promise<void> {
    const p = await this.convsRepo.findParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');
  }

  private async getHiddenUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    const hidden = new Set<string>();
    for (const row of rows) {
      hidden.add(row.blockerId === userId ? row.blockedId : row.blockerId);
    }
    return Array.from(hidden);
  }

  private async assertNotBlockedDirect(conversationId: string, senderId: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        type: true,
        participants: { where: { leftAt: null }, select: { userId: true } },
      },
    });

    if (!conversation || conversation.type !== 'DIRECT') return;

    const otherId = conversation.participants.find((p) => p.userId !== senderId)?.userId;
    if (!otherId) return;

    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: otherId },
          { blockerId: otherId, blockedId: senderId },
        ],
      },
      select: { blockerId: true },
    });
    if (block) throw new ForbiddenException('You cannot message this user');
  }
}
