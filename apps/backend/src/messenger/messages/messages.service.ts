import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttachmentType, MessageType, type Prisma } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';
import { uid } from 'uid';
import { PrismaService } from '@common/prisma';
import { SnowflakeService } from '../../common/id/snowflake.service';
import { uploadToStorageWithFallback } from '../../common/media/image-processor';
import { isR2Endpoint } from '../../common/storage/storage-url.util';
import { CONVERSATIONS_REPOSITORY } from '../interfaces/conversations-repository.interface';
import type { IConversationsRepository } from '../interfaces/conversations-repository.interface';
import { MESSAGES_REPOSITORY } from '../interfaces/messages-repository.interface';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import { messageInclude } from '../interfaces/types';
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
  ChatActivityMap,
} from '@common/contracts';
import {
  Permission,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_MEMBER_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS,
  isE2eeEnvelopeShape,
} from '@common/contracts';

import { FastPathChatService } from '../services/fast-path-chat.service';

@Injectable()
export class MessagesService implements OnModuleDestroy {
  private readonly s3: S3Client;

  onModuleDestroy(): void {
    this.s3.destroy();
  }

  constructor(
    @Inject(CONVERSATIONS_REPOSITORY)
    private readonly convsRepo: IConversationsRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepo: IMessagesRepository,
    private readonly mapper: MessengerMapper,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional()
    private readonly snowflake?: SnowflakeService,
    @Optional()
    private readonly fastPath?: FastPathChatService,
  ) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const endpoint =
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined) ??
      this.configService.get<string>('R2_ENDPOINT') ??
      this.configService.get<string>('MINIO_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      'http://localhost:9000';

    const isR2 = Boolean(accountId) || isR2Endpoint(endpoint);

    this.s3 = new S3Client({
      endpoint,
      region: isR2 ? 'auto' : 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('R2_ACCESS_KEY_ID') ??
          this.configService.get<string>('MINIO_ACCESS_KEY') ??
          this.configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          this.configService.get<string>('R2_SECRET_ACCESS_KEY') ??
          this.configService.get<string>('MINIO_SECRET_KEY') ??
          this.configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: !isR2,
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

    const bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'attachments');
    const publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';

    let finalContentType = file.mimetype || '';
    if (
      !finalContentType ||
      finalContentType === 'text/plain' ||
      finalContentType === 'application/octet-stream'
    ) {
      if (originalExt === 'webm') {
        finalContentType = attachmentType === AttachmentType.AUDIO ? 'audio/webm' : 'video/webm';
      } else if (originalExt === 'mp4') {
        finalContentType = 'video/mp4';
      } else if (originalExt === 'mp3') {
        finalContentType = 'audio/mpeg';
      } else if (originalExt === 'png') {
        finalContentType = 'image/png';
      } else if (originalExt === 'jpg' || originalExt === 'jpeg') {
        finalContentType = 'image/jpeg';
      } else if (originalExt === 'gif') {
        finalContentType = 'image/gif';
      } else if (originalExt === 'webp') {
        finalContentType = 'image/webp';
      } else {
        finalContentType = 'application/octet-stream';
      }
    }
    // Clean any parameters (e.g. video/webm;codecs=vp8,opus -> video/webm) for HTTP storage headers
    if (finalContentType.includes(';')) {
      finalContentType = finalContentType.split(';')[0].trim();
    }

    const url = await uploadToStorageWithFallback(this.s3, {
      bucket,
      key,
      buffer: file.buffer,
      contentType: finalContentType,
      publicUrl,
    });

    return {
      type: attachmentType,
      url,
      fileName: file.originalname,
      mimeType: finalContentType,
      size: file.buffer.length,
    };
  }

  async send(conversationId: string, senderId: string, dto: SendMessageDto): Promise<MessageView> {
    const requiredPerm =
      dto.attachments && dto.attachments.length > 0
        ? Permission.CAN_SEND_MEDIA
        : Permission.CAN_SEND_TEXT;

    // Fast-Path: single CPU instruction bitwise check in memory (~0.00001 ms)
    const fastCheck = this.fastPath?.checkFastPath(conversationId, senderId, requiredPerm);

    if (fastCheck === false) {
      throw new ForbiddenException(
        'You do not have permission to send messages in this conversation',
      );
    }

    if (fastCheck !== true) {
      // Slow-Path: full DB member, block and role resolution
      await this.assertMember(conversationId, senderId);
      await this.assertNotBlockedDirect(conversationId, senderId);

      const senderParticipant = await this.convsRepo.findParticipant(conversationId, senderId);
      if (senderParticipant) {
        const rawPerms = (senderParticipant as unknown as { permissions?: number }).permissions;
        const pFlags =
          rawPerms !== undefined && rawPerms !== null && rawPerms !== 0
            ? rawPerms
            : senderParticipant.role === 'OWNER'
              ? DEFAULT_OWNER_PERMISSIONS
              : senderParticipant.role === 'ADMIN'
                ? DEFAULT_ADMIN_PERMISSIONS
                : DEFAULT_MEMBER_PERMISSIONS;

        this.fastPath?.setPermissions(conversationId, senderId, pFlags);

        if ((pFlags & Permission.IS_BANNED) !== 0) {
          throw new ForbiddenException('You are banned from sending messages in this conversation');
        }
        if ((pFlags & Permission.IS_MUTED) !== 0) {
          throw new ForbiddenException('You are muted in this conversation');
        }
        if (dto.text && (pFlags & Permission.CAN_SEND_TEXT) === 0) {
          throw new ForbiddenException('You do not have permission to send text messages');
        }
        if (
          dto.attachments &&
          dto.attachments.length > 0 &&
          (pFlags & Permission.CAN_SEND_MEDIA) === 0
        ) {
          throw new ForbiddenException('You do not have permission to send media');
        }
      }
    }

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

    const participantIds = await this.convsRepo.findParticipantIds(conversationId);
    const recipientIds = participantIds.filter((id) => id !== senderId);

    const { mappedMessage } = await this.prisma.$transaction(async (tx) => {
      const snowflakeId = this.snowflake ? this.snowflake.generate() : undefined;
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          body: dto.text || null,
          clientSeq: dto.clientSeq ?? null,
          messageType: finalMessageType,
          replyToId: dto.replyToId || null,
          forwardedFromId: dto.forwardedFromId || null,
          ...(snowflakeId ? { id: snowflakeId } : {}),
          ...(dto.attachments && dto.attachments.length > 0
            ? {
                attachments: {
                  create: dto.attachments.map((att) => ({
                    type: att.type,
                    url: att.url,
                    fileName: att.fileName || null,
                    mimeType: att.mimeType || null,
                    size: att.size != null ? Math.round(att.size) : null,
                    width: att.width != null ? Math.round(att.width) : null,
                    height: att.height != null ? Math.round(att.height) : null,
                    duration: att.duration != null ? Math.round(att.duration) : null,
                    waveform: Array.isArray(att.waveform)
                      ? att.waveform.map((w) => Math.min(100, Math.max(0, Math.round(w))))
                      : [],
                    thumbnailUrl: att.thumbnailUrl || null,
                  })),
                },
              }
            : {}),
        },
        include: messageInclude,
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const pinnedIds = await this.convsRepo.findPinnedMessages(conversationId);
      const pinnedSet = new Set(pinnedIds);
      const mapped = this.mapper.mapMessage(message, senderId, pinnedSet);

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'MESSAGE',
          aggregateId: message.id,
          eventType: 'MESSAGE_SENT',
          payload: {
            messageId: message.id,
            conversationId,
            senderId,
            recipientIds,
            messageView: JSON.parse(JSON.stringify(mapped)) as Prisma.InputJsonValue,
          },
          status: 'PENDING',
        },
      });

      return { message, mappedMessage: mapped };
    });

    return mappedMessage;
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

  async getAroundDate(
    conversationId: string,
    dateIso: string,
    userId: string,
    limit = 50,
  ): Promise<PaginatedMessages> {
    await this.assertMember(conversationId, userId);

    const hiddenUserIds = await this.getHiddenUserIds(userId);
    const parsedDate = new Date(dateIso);
    const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const messages = await this.messagesRepo.findAroundDate({
      conversationId,
      targetDate: validDate,
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

  async getActivityMap(
    conversationId: string,
    year: number,
    month: number,
    timezone: string | undefined,
    userId: string,
  ): Promise<ChatActivityMap> {
    await this.assertMember(conversationId, userId);

    const hiddenUserIds = await this.getHiddenUserIds(userId);
    return this.messagesRepo.getActivityMap({
      conversationId,
      year,
      month,
      timezone,
      requestingUserId: userId,
      hiddenUserIds,
    });
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
        const pFlags =
          (p as unknown as { permissions?: number })?.permissions ??
          (p?.role === 'OWNER'
            ? DEFAULT_OWNER_PERMISSIONS
            : p?.role === 'ADMIN'
              ? DEFAULT_ADMIN_PERMISSIONS
              : DEFAULT_MEMBER_PERMISSIONS);

        if (!p || (p.role !== 'OWNER' && (pFlags & Permission.CAN_DELETE) === 0)) {
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
      const pFlags =
        (participant as unknown as { permissions?: number }).permissions ??
        (participant.role === 'OWNER'
          ? DEFAULT_OWNER_PERMISSIONS
          : participant.role === 'ADMIN'
            ? DEFAULT_ADMIN_PERMISSIONS
            : DEFAULT_MEMBER_PERMISSIONS);

      const isGroupAdminOrOwner =
        conv.type === 'GROUP' &&
        (participant.role === 'OWNER' || (pFlags & Permission.CAN_DELETE) !== 0);

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
    if (original.body && isE2eeEnvelopeShape(original.body)) {
      // Defense in depth: a server-side copy would plant undecryptable
      // ciphertext in the target dialog. Modern clients re-encrypt per
      // target and never hit this; stale/hand-rolled callers fail loudly
      // instead of corrupting silently.
      throw new BadRequestException(
        'Encrypted messages must be re-encrypted client-side before forwarding',
      );
    }

    const totalConvs = dto.conversationIds.length;
    const results: MessageView[] = new Array<MessageView>(totalConvs);

    for (let i = 0; i < totalConvs; i++) {
      const conversationId = dto.conversationIds[i];
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
      results[i] = this.mapper.mapMessage(msg, userId, new Set(pinnedIds));
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

    const totalCount = dto.conversationIds.length * messages.length;
    const results: MessageView[] = new Array<MessageView>(totalCount);
    let resIndex = 0;

    for (const targetConvId of dto.conversationIds) {
      await this.assertMember(targetConvId, userId);
      const pinnedIds = await this.convsRepo.findPinnedMessages(targetConvId);
      const pinnedSet = new Set(pinnedIds);

      for (const msg of messages) {
        if (msg.body && isE2eeEnvelopeShape(msg.body)) {
          throw new BadRequestException(
            'Encrypted messages must be re-encrypted client-side before forwarding',
          );
        }
        const created = await this.messagesRepo.create({
          conversationId: targetConvId,
          senderId: userId,
          body: msg.body ?? undefined,
          messageType: msg.messageType,
          forwardedFromId: dto.hideAuthor ? undefined : msg.id,
        });
        results[resIndex++] = this.mapper.mapMessage(created, userId, pinnedSet);
      }
      await this.convsRepo.touchUpdatedAt(targetConvId);
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

    const p = await this.convsRepo.findParticipant(msg.conversationId, userId);
    if (p) {
      const pFlags =
        (p as unknown as { permissions?: number }).permissions ??
        (p.role === 'OWNER'
          ? DEFAULT_OWNER_PERMISSIONS
          : p.role === 'ADMIN'
            ? DEFAULT_ADMIN_PERMISSIONS
            : DEFAULT_MEMBER_PERMISSIONS);

      if ((pFlags & Permission.CAN_ADD_REACTIONS) === 0) {
        throw new ForbiddenException('You do not have permission to react to messages');
      }
    }

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

    const p = await this.convsRepo.findParticipant(conversationId, userId);
    if (p) {
      const pFlags = (p as unknown as { permissions?: number }).permissions;
      if (
        pFlags !== undefined &&
        pFlags !== null &&
        pFlags !== 0 &&
        p.role !== 'OWNER' &&
        p.role !== 'ADMIN' &&
        (pFlags & Permission.CAN_PIN_MESSAGES) === 0
      ) {
        throw new ForbiddenException('You do not have permission to pin messages');
      }
    }

    await this.convsRepo.pinMessage(conversationId, messageId, userId);
  }

  async unpinMessage(conversationId: string, messageId: string, userId: string): Promise<void> {
    await this.assertMember(conversationId, userId);

    const p = await this.convsRepo.findParticipant(conversationId, userId);
    if (p) {
      const pFlags = (p as unknown as { permissions?: number }).permissions;
      if (
        pFlags !== undefined &&
        pFlags !== null &&
        pFlags !== 0 &&
        p.role !== 'OWNER' &&
        p.role !== 'ADMIN' &&
        (pFlags & Permission.CAN_PIN_MESSAGES) === 0
      ) {
        throw new ForbiddenException('You do not have permission to unpin messages');
      }
    }

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
    const fast = this.fastPath?.checkFastPath(conversationId, userId, 0);
    if (fast === true) return;

    const p = await this.convsRepo.findParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');

    const mask = this.fastPath?.computeMask(
      p.role,
      (p as unknown as { permissions?: number }).permissions,
    );
    if (mask !== undefined) {
      this.fastPath?.setPermissions(conversationId, userId, mask);
    }
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
