import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import {
  optimizeGroupAvatar,
  uploadToStorageWithFallback,
} from '../../common/media/image-processor';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../gateway/messenger.gateway';
import { CONVERSATIONS_REPOSITORY } from '../interfaces/conversations-repository.interface';
import type { IConversationsRepository } from '../interfaces/conversations-repository.interface';
import { MESSAGES_REPOSITORY } from '../interfaces/messages-repository.interface';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import type {
  CreateDirectConversationDto,
  CreateGroupConversationDto,
  SetNicknameDto,
  SetThemeDto,
  MuteConversationDto,
  UpdateGroupConversationDto,
  AddMembersDto,
  TransferOwnershipDto,
  ConversationView,
  UserSnapshot,
  ReportDto,
} from '@common/contracts';
import { MessengerMapper } from '../messenger.mapper';
import type { ReportCategory } from '@prisma/client';

@Injectable()
export class ConversationsService {
  private readonly s3: S3Client;

  constructor(
    @Inject(CONVERSATIONS_REPOSITORY)
    private readonly convsRepo: IConversationsRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepo: IMessagesRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly mapper: MessengerMapper,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional()
    @Inject(forwardRef(() => MessengerGateway))
    private readonly gateway?: MessengerGateway,
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

  async getConversations(userId: string): Promise<ConversationView[]> {
    const [convs, blockCtx] = await Promise.all([
      this.convsRepo.findAllForUser(userId),
      this.getBlockRelationships(userId),
    ]);
    const hiddenUserIds = [...blockCtx.blockedByMe, ...blockCtx.blockingMe];

    return Promise.all(
      convs.map(async (conv) => {
        const unread = await this.convsRepo.countUnread(conv.id, userId, hiddenUserIds);
        return this.mapper.mapConversation(conv, userId, unread, blockCtx);
      }),
    );
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationView> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    const blockCtx = await this.getBlockRelationships(userId);
    const hiddenUserIds = [...blockCtx.blockedByMe, ...blockCtx.blockingMe];
    const unread = await this.convsRepo.countUnread(conv.id, userId, hiddenUserIds);
    return this.mapper.mapConversation(conv, userId, unread, blockCtx);
  }

  async createDirect(userId: string, dto: CreateDirectConversationDto): Promise<ConversationView> {
    if (userId === dto.participantId) {
      throw new BadRequestException('Cannot create a conversation with yourself');
    }

    const other = await this.usersService.findById(dto.participantId);
    if (!other) throw new NotFoundException('User not found');

    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: dto.participantId },
          { blockerId: dto.participantId, blockedId: userId },
        ],
      },
    });
    if (block) throw new ForbiddenException('User is blocked');

    const existing = await this.convsRepo.findDirectBetween(userId, dto.participantId);
    if (existing) {
      // Re-activate any participants who might have left the conversation
      await this.prisma.conversationParticipant.updateMany({
        where: {
          conversationId: existing.id,
          userId: { in: [userId, dto.participantId] },
        },
        data: { leftAt: null },
      });

      const conv = await this.convsRepo.findOneForUser(existing.id, userId);
      if (conv) {
        return this.mapper.mapConversation(conv, userId, 0);
      }
    }

    const conv = await this.convsRepo.createDirect(userId, dto.participantId);
    return this.mapper.mapConversation(conv, userId, 0);
  }

  async createGroup(userId: string, dto: CreateGroupConversationDto): Promise<ConversationView> {
    const uniqueMemberIds = Array.from(new Set(dto.memberIds)).filter((id) => id !== userId);

    if (uniqueMemberIds.length > 0) {
      const existingUsersCount = await this.prisma.user.count({
        where: { id: { in: uniqueMemberIds } },
      });
      if (existingUsersCount !== uniqueMemberIds.length) {
        throw new NotFoundException('One or more users not found');
      }

      const block = await this.prisma.userBlock.findFirst({
        where: {
          blockerId: { in: uniqueMemberIds },
          blockedId: userId,
        },
      });
      if (block) throw new ForbiddenException('One or more users have blocked you');
    }

    const groupName = dto.name?.trim() || 'New Group';

    const conv = await this.convsRepo.createGroup({
      name: groupName,
      description: dto.description?.trim() || undefined,
      createdById: userId,
      memberIds: uniqueMemberIds,
    });
    return this.mapper.mapConversation(conv, userId, 0);
  }

  async updateGroup(
    conversationId: string,
    userId: string,
    dto: UpdateGroupConversationDto,
  ): Promise<ConversationView> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'GROUP') throw new BadRequestException('Not a group conversation');

    const p = conv.participants.find((p) => p.userId === userId);
    if (!p || (p.role !== 'ADMIN' && p.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can update the group');
    }

    await this.convsRepo.updateGroup(conversationId, dto);

    if (dto.name && dto.name !== conv.name) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const userName = user?.displayName || user?.username || 'User';
      await this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          messageType: 'SYSTEM',
          body: `Пользователь ${userName} сменил название группы на ${dto.name}`,
        },
      });
    }

    return this.getConversation(conversationId, userId);
  }

  async addMembers(
    conversationId: string,
    userId: string,
    dto: AddMembersDto,
  ): Promise<ConversationView> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'GROUP') throw new BadRequestException('Not a group');

    const p = conv.participants.find((p) => p.userId === userId);
    if (!p || (p.role !== 'ADMIN' && p.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can add members');
    }

    const existingUsersCount = await this.prisma.user.count({
      where: { id: { in: dto.memberIds } },
    });
    if (existingUsersCount !== dto.memberIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: { in: dto.memberIds }, blockedId: userId },
          { blockerId: userId, blockedId: { in: dto.memberIds } },
        ],
      },
    });
    if (block) throw new ForbiddenException('Cannot add members due to privacy settings / blocks');

    await this.convsRepo.addParticipants(conversationId, dto.memberIds);
    return this.getConversation(conversationId, userId);
  }

  async removeMember(conversationId: string, adminId: string, targetUserId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, adminId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'GROUP') throw new BadRequestException('Not a group');

    const admin = conv.participants.find((p) => p.userId === adminId);
    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can remove members');
    }

    const target = conv.participants.find((p) => p.userId === targetUserId);
    if (!target) throw new NotFoundException('User is not in this conversation');
    if (target.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the owner');
    }
    if (admin.role === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    await this.convsRepo.removeParticipant(conversationId, targetUserId);
  }

  async updateAdminPermissions(
    conversationId: string,
    ownerId: string,
    targetUserId: string,
    permissions: {
      canEditGroup?: boolean;
      canDeleteMessages?: boolean;
      canManageMembers?: boolean;
      canPinMessages?: boolean;
      canInviteUsers?: boolean;
    },
  ): Promise<{ success: boolean; permissions: Record<string, boolean> }> {
    const conv = await this.convsRepo.findOneForUser(conversationId, ownerId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'GROUP') {
      throw new BadRequestException('Admin permissions are only applicable to group conversations');
    }

    const owner = conv.participants.find((p) => p.userId === ownerId);
    if (!owner || owner.role !== 'OWNER') {
      throw new ForbiddenException('Only the group owner can customize admin permissions');
    }

    const target = conv.participants.find((p) => p.userId === targetUserId);
    if (!target) throw new NotFoundException('Target user not in group');
    if (target.role !== 'ADMIN') {
      throw new BadRequestException('Target user must have ADMIN role');
    }

    return {
      success: true,
      permissions: {
        canEditGroup: permissions.canEditGroup ?? true,
        canDeleteMessages: permissions.canDeleteMessages ?? true,
        canManageMembers: permissions.canManageMembers ?? true,
        canPinMessages: permissions.canPinMessages ?? true,
        canInviteUsers: permissions.canInviteUsers ?? true,
      },
    };
  }

  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type === 'DIRECT') {
      throw new BadRequestException('Cannot leave a direct conversation; delete it instead');
    }

    const p = conv.participants.find((p) => p.userId === userId);
    if (!p) throw new NotFoundException('Not a member');

    if (p.role === 'OWNER') {
      throw new ForbiddenException('Owner must transfer ownership before leaving');
    }

    await this.convsRepo.removeParticipant(conversationId, userId);
  }

  async transferOwnership(
    conversationId: string,
    userId: string,
    dto: TransferOwnershipDto,
  ): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const owner = conv.participants.find((p) => p.userId === userId);
    if (!owner || owner.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can transfer ownership');
    }

    const newOwner = conv.participants.find((p) => p.userId === dto.newOwnerId);
    if (!newOwner) throw new NotFoundException('New owner not in conversation');

    await this.prisma.$transaction([
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { role: 'MEMBER' },
      }),
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId: dto.newOwnerId } },
        data: { role: 'OWNER' },
      }),
    ]);
  }

  async promoteMember(
    conversationId: string,
    adminId: string,
    targetUserId: string,
  ): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, adminId);
    if (!conv) throw new NotFoundException('Conversation not found');
    const admin = conv.participants.find((p) => p.userId === adminId);
    if (!admin || admin.role !== 'OWNER') {
      throw new ForbiddenException('Only the group owner can promote members to admin');
    }

    const target = conv.participants.find((p) => p.userId === targetUserId);
    if (!target) throw new NotFoundException('User not in group');

    await this.convsRepo.updateParticipant(conversationId, targetUserId, { role: 'ADMIN' });
  }

  async demoteMember(conversationId: string, adminId: string, targetUserId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, adminId);
    if (!conv) throw new NotFoundException('Conversation not found');
    const admin = conv.participants.find((p) => p.userId === adminId);
    if (!admin || admin.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can demote admins');
    }
    await this.convsRepo.updateParticipant(conversationId, targetUserId, { role: 'MEMBER' });
  }

  async setNickname(conversationId: string, userId: string, dto: SetNicknameDto): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const target = conv.participants.find((p) => p.userId === dto.targetUserId);
    if (!target) throw new NotFoundException('Target user not in conversation');

    await this.convsRepo.updateParticipant(conversationId, dto.targetUserId, {
      nickname: dto.nickname ?? null,
    });
  }

  async setTheme(conversationId: string, userId: string, dto: SetThemeDto): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, { theme: dto.theme });
  }

  async muteConversation(
    conversationId: string,
    userId: string,
    dto: MuteConversationDto,
  ): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, {
      muteLevel: dto.muteLevel,
      mutedUntil: dto.mutedUntil ? new Date(dto.mutedUntil) : null,
    });
  }

  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, {
      archivedAt: new Date(),
    });
  }

  async unarchiveConversation(conversationId: string, userId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, {
      archivedAt: null,
    });
  }

  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    if (blockerId === blockedId) throw new BadRequestException('Cannot block yourself');
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await this.prisma.userBlock.deleteMany({
      where: { blockerId, blockedId },
    });
  }

  async getBlockedUsers(userId: string): Promise<UserSnapshot[]> {
    return this.convsRepo.findBlockedUsers(userId);
  }

  async getBlockRelationships(
    userId: string,
  ): Promise<{ blockedByMe: Set<string>; blockingMe: Set<string> }> {
    const rows = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });

    const blockedByMe = new Set<string>();
    const blockingMe = new Set<string>();
    for (const row of rows) {
      if (row.blockerId === userId) blockedByMe.add(row.blockedId);
      if (row.blockedId === userId) blockingMe.add(row.blockerId);
    }
    return { blockedByMe, blockingMe };
  }

  async getParticipantIds(conversationId: string): Promise<string[]> {
    return this.convsRepo.findParticipantIds(conversationId);
  }

  async reportUser(reporterId: string, reportedId: string, dto: ReportDto): Promise<void> {
    if (reporterId === reportedId) throw new BadRequestException('Cannot report yourself');
    await this.prisma.report.create({
      data: {
        reporterId,
        reportedId,
        messageId: dto.messageId ?? null,
        category: dto.category as ReportCategory,
        details: dto.details ?? null,
      },
    });
  }

  private async assertGroupAdmin(conversationId: string, userId: string): Promise<void> {
    const participants = await this.convsRepo.findParticipants(conversationId);
    const p = participants.find((p) => p.userId === userId);
    if (!p || (p.role !== 'ADMIN' && p.role !== 'OWNER')) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  private async assertNotBlocked(userId: string, otherUserId: string): Promise<void> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: otherUserId },
          { blockerId: otherUserId, blockedId: userId },
        ],
      },
    });
    if (block) throw new ForbiddenException('User is blocked');
  }

  async assertMember(conversationId: string, userId: string): Promise<void> {
    const p = await this.convsRepo.findParticipant(conversationId, userId);
    if (!p) throw new ForbiddenException('Not a member of this conversation');
  }

  async touchUpdatedAt(conversationId: string): Promise<void> {
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async deleteConversation(conversationId: string, userId: string, forAll = false): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const participant = conv.participants.find((p) => p.userId === userId);
    if (!participant || participant.leftAt) {
      throw new ForbiddenException('You are not an active participant in this conversation');
    }

    const participantIds = await this.convsRepo.findParticipantIds(conversationId);

    if (forAll) {
      if (conv.type === 'GROUP') {
        if (participant.role !== 'ADMIN' && participant.role !== 'OWNER') {
          throw new ForbiddenException('Only admins or owners can delete group for everyone');
        }
      }
      await this.prisma.conversation.delete({
        where: { id: conversationId },
      });
      this.gateway?.emitConversationDeleted(conversationId, participantIds);
    } else {
      await this.convsRepo.updateParticipant(conversationId, userId, {
        leftAt: new Date(),
      });
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        select: { id: true },
      });
      if (messages.length > 0) {
        await this.prisma.messageDeletion.createMany({
          data: messages.map((m) => ({ messageId: m.id, userId })),
          skipDuplicates: true,
        });
      }
    }
  }

  async clearHistory(conversationId: string, userId: string, forAll = false): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const participant = conv.participants.find((p) => p.userId === userId);
    if (!participant || participant.leftAt) {
      throw new ForbiddenException('You are not an active participant in this conversation');
    }

    const participantIds = await this.convsRepo.findParticipantIds(conversationId);

    if (forAll) {
      if (conv.type === 'GROUP') {
        if (participant.role !== 'ADMIN' && participant.role !== 'OWNER') {
          throw new ForbiddenException('Only admins or owners can clear history for everyone');
        }
      }
      await this.prisma.message.updateMany({
        where: { conversationId },
        data: {
          body: null,
          messageType: 'DELETED',
          deletedAt: new Date(),
          deletedForAll: true,
        },
      });
      this.gateway?.emitMessagesCleared(conversationId, participantIds);
    } else {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        select: { id: true },
      });
      if (messages.length > 0) {
        await this.prisma.messageDeletion.createMany({
          data: messages.map((m) => ({ messageId: m.id, userId })),
          skipDuplicates: true,
        });
      }
      this.gateway?.emitMessagesCleared(conversationId, [userId]);
    }
  }

  async pinConversation(conversationId: string, userId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, {
      pinnedAt: new Date(),
    });
  }

  async unpinConversation(conversationId: string, userId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, {
      pinnedAt: null,
    });
  }

  async markUnread(conversationId: string, userId: string): Promise<void> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convsRepo.updateParticipant(conversationId, userId, {
      lastReadAt: new Date(0),
    });
  }

  async uploadGroupAvatar(
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    if (conv.type !== 'GROUP') throw new BadRequestException('Not a group conversation');

    await this.assertGroupAdmin(conversationId, userId);

    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Invalid avatar file');
    }

    const { buffer: processedBuffer, contentType, ext } = await optimizeGroupAvatar(file.buffer);

    const bucket = this.configService.get<string>('MINIO_BUCKET_AVATARS', 'avatars');
    const publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';

    const key = `group-avatars/${conversationId}.${ext}`;

    const avatarUrl = await uploadToStorageWithFallback(this.s3, {
      bucket,
      key,
      buffer: processedBuffer,
      contentType,
      publicUrl,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { avatar: avatarUrl },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const userName = user?.displayName || user?.username || 'User';

    await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        messageType: 'SYSTEM',
        body: `Пользователь ${userName} сменил значок группы`,
      },
    });

    return { avatarUrl };
  }
}
