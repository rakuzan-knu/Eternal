import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
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
} from '../dto/conversation.dto';
import { MessengerMapper } from '../messenger.mapper';
import type { ConversationView } from '../dto/responses.dto';
import type { ReportCategory } from '@prisma/client';
import type { ReportDto } from '../dto/message.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @Inject(CONVERSATIONS_REPOSITORY)
    private readonly convsRepo: IConversationsRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepo: IMessagesRepository,
    private readonly usersService: UsersService,
    private readonly mapper: MessengerMapper,
    private readonly prisma: PrismaService,
  ) {}

  async getConversations(userId: string): Promise<ConversationView[]> {
    const convs = await this.convsRepo.findAllForUser(userId);

    return Promise.all(
      convs.map(async (conv) => {
        const unread = await this.convsRepo.countUnread(conv.id, userId);
        return this.mapper.mapConversation(conv, userId, unread);
      }),
    );
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationView> {
    const conv = await this.convsRepo.findOneForUser(conversationId, userId);
    if (!conv) throw new NotFoundException('Conversation not found');
    const unread = await this.convsRepo.countUnread(conv.id, userId);
    return this.mapper.mapConversation(conv, userId, unread);
  }

  async createDirect(userId: string, dto: CreateDirectConversationDto): Promise<ConversationView> {
    if (userId === dto.participantId) {
      throw new BadRequestException('Cannot create a conversation with yourself');
    }

    return this.prisma.$transaction(async (tx) => {
      const other = await this.usersService.findById(dto.participantId);
      if (!other) throw new NotFoundException('User not found');

      const block = await tx.userBlock.findFirst({
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
        const conv = await this.convsRepo.findOneForUser(existing.id, userId);
        if (!conv) throw new NotFoundException('Conversation not found');
        return this.mapper.mapConversation(conv, userId, 0);
      }

      const conv = await this.convsRepo.createDirect(userId, dto.participantId);
      return this.mapper.mapConversation(conv, userId, 0);
    });
  }

  async createGroup(userId: string, dto: CreateGroupConversationDto): Promise<ConversationView> {
    if (dto.memberIds.includes(userId)) {
      dto.memberIds = dto.memberIds.filter((id) => id !== userId);
    }

    if (dto.memberIds.length > 0) {
      const existingUsersCount = await this.prisma.user.count({
        where: { id: { in: dto.memberIds } },
      });
      if (existingUsersCount !== dto.memberIds.length) {
        throw new NotFoundException('One or more users not found');
      }

      const block = await this.prisma.userBlock.findFirst({
        where: {
          blockerId: { in: dto.memberIds },
          blockedId: userId,
        },
      });
      if (block) throw new ForbiddenException('One or more users have blocked you');
    }

    const conv = await this.convsRepo.createGroup({
      name: dto.name,
      description: dto.description,
      createdById: userId,
      memberIds: dto.memberIds,
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

    await this.convsRepo.removeParticipant(conversationId, targetUserId);
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
    await this.prisma.userBlock.delete({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
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
}
