import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationsService } from '../conversations.service';
import type { IConversationsRepository } from '../../interfaces/conversations-repository.interface';
import type { IMessagesRepository } from '../../interfaces/messages-repository.interface';
import type { UsersService } from '../../../users/users.service';
import type { MessengerMapper } from '../../messenger.mapper';
import type { PrismaService } from '@common/prisma';
import type { ConfigService } from '@nestjs/config';
import type { MessengerGateway } from '../../gateway/messenger.gateway';
import type { RedisService } from '../../../redis/redis.service';
import { MuteLevel, ReportCategory } from '@prisma/client';
import { Permission } from '@common/contracts';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let mockConvsRepo: {
    findAllForUser: jest.Mock;
    findOneForUser: jest.Mock;
    findDirectBetween: jest.Mock;
    createDirect: jest.Mock;
    createGroup: jest.Mock;
    countUnread: jest.Mock;
    findParticipant: jest.Mock;
    findParticipants: jest.Mock;
    findParticipantIds: jest.Mock;
    findBlockedUsers: jest.Mock;
    addParticipants: jest.Mock;
    removeParticipant: jest.Mock;
    updateParticipant: jest.Mock;
    setUserDefaultChatTheme: jest.Mock;
    updateAllParticipantsForUser: jest.Mock;
    updateGroup: jest.Mock;
    updateSharedTheme: jest.Mock;
    touchUpdatedAt: jest.Mock;
  };
  let mockMessagesRepo: {
    create: jest.Mock;
  };
  let mockUsersService: {
    findById: jest.Mock;
  };
  let mockMapper: {
    mapConversation: jest.Mock;
    mapMessage: jest.Mock;
  };
  let mockPrisma: {
    user: {
      count: jest.Mock;
      findUnique: jest.Mock;
    };
    userBlock: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    userPrivacy: {
      findUnique: jest.Mock;
    };
    follow: {
      findFirst: jest.Mock;
    };
    conversation: {
      update: jest.Mock;
      delete: jest.Mock;
    };
    conversationParticipant: {
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    message: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    messageDeletion: {
      createMany: jest.Mock;
    };
    report: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockGateway: {
    emitToUser: jest.Mock;
    emitConversationDeleted: jest.Mock;
    emitMessagesCleared: jest.Mock;
  };

  const sampleDirectConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    participants: [
      { userId: 'usr-1', role: 'MEMBER', leftAt: null },
      { userId: 'usr-2', role: 'MEMBER', leftAt: null },
    ],
  };

  const sampleGroupConv = {
    id: 'conv-group',
    type: 'GROUP',
    name: 'Tech Group',
    participants: [
      { userId: 'usr-owner', role: 'OWNER', leftAt: null },
      { userId: 'usr-admin', role: 'ADMIN', leftAt: null },
      { userId: 'usr-member', role: 'MEMBER', leftAt: null },
    ],
  };

  beforeEach(() => {
    mockConvsRepo = {
      findAllForUser: jest.fn().mockResolvedValue([sampleDirectConv]),
      findOneForUser: jest.fn().mockResolvedValue(sampleDirectConv),
      findDirectBetween: jest.fn(),
      createDirect: jest.fn().mockResolvedValue(sampleDirectConv),
      createGroup: jest.fn().mockResolvedValue(sampleGroupConv),
      countUnread: jest.fn().mockResolvedValue(0),
      findParticipant: jest.fn().mockResolvedValue({ userId: 'usr-1', leftAt: null }),
      findParticipants: jest.fn().mockResolvedValue(sampleGroupConv.participants),
      findParticipantIds: jest.fn().mockResolvedValue(['usr-1', 'usr-2']),
      findBlockedUsers: jest.fn().mockResolvedValue([]),
      addParticipants: jest.fn().mockResolvedValue(undefined),
      removeParticipant: jest.fn().mockResolvedValue(undefined),
      updateParticipant: jest.fn().mockResolvedValue({}),
      setUserDefaultChatTheme: jest.fn().mockResolvedValue(undefined),
      updateAllParticipantsForUser: jest.fn().mockResolvedValue(undefined),
      updateGroup: jest.fn().mockResolvedValue({}),
      updateSharedTheme: jest.fn().mockResolvedValue({}),
      touchUpdatedAt: jest.fn().mockResolvedValue(undefined),
    };

    mockMessagesRepo = {
      create: jest.fn(),
    };

    mockUsersService = {
      findById: jest.fn().mockResolvedValue({ id: 'usr-2', username: 'user2' }),
    };

    mockMapper = {
      mapConversation: jest.fn().mockReturnValue({ id: 'conv-1' }),
      mapMessage: jest.fn().mockReturnValue({ id: 'msg-1', body: 'mapped message' }),
    };

    mockPrisma = {
      user: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({ id: 'usr-1', displayName: 'User One' }),
      },
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      userPrivacy: {
        findUnique: jest.fn().mockResolvedValue({ themeProposals: 'EVERYBODY' }),
      },
      follow: {
        findFirst: jest.fn().mockResolvedValue({ id: 'f-1' }),
      },
      conversation: {
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      conversationParticipant: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      message: {
        create: jest.fn().mockResolvedValue({ id: 'm-1', conversationId: 'conv-1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'm-1' }]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue({
          id: 'msg-prop-1',
          conversationId: 'conv-1',
          messageType: 'THEME_PROPOSAL',
          body: JSON.stringify({
            proposedTheme: 'neon',
            status: 'PENDING',
            proposedByUserId: 'usr-1',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          }),
        }),
        update: jest.fn().mockResolvedValue({ id: 'msg-prop-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      messageDeletion: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      report: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest
        .fn()
        .mockImplementation((p: unknown) =>
          typeof p === 'function'
            ? (p as (tx: unknown) => unknown)(mockPrisma)
            : Promise.all(p as Iterable<unknown>),
        ),
    };

    mockConfigService = {
      get: jest.fn((key: string, def?: string) => def ?? 'http://localhost:9000'),
    };

    mockGateway = {
      emitToUser: jest.fn(),
      emitConversationDeleted: jest.fn(),
      emitMessagesCleared: jest.fn(),
    };

    const mockRedis = {
      withLock: jest.fn(<T>(_key: string, action: () => Promise<T>) => action()),
    };

    service = new ConversationsService(
      mockConvsRepo as unknown as IConversationsRepository,
      mockMessagesRepo as unknown as IMessagesRepository,
      mockUsersService as unknown as UsersService,
      mockMapper as unknown as MessengerMapper,
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
      mockRedis as unknown as RedisService,
      mockGateway as unknown as MessengerGateway,
    );
  });

  describe('getConversations & getConversation', () => {
    it('fetches conversations with unread counts and block context', async () => {
      const convs = await service.getConversations('usr-1');
      expect(convs).toHaveLength(1);
      expect(mockConvsRepo.findAllForUser).toHaveBeenCalledWith('usr-1');

      const one = await service.getConversation('conv-1', 'usr-1');
      expect(one.id).toBe('conv-1');
    });

    it('throws NotFoundException for nonexistent conversation', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(null);
      await expect(service.getConversation('missing', 'usr-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createDirect & createGroup', () => {
    it('creates direct conversation or returns existing reactivated', async () => {
      // 1. Existing conversation
      mockConvsRepo.findDirectBetween.mockResolvedValueOnce(sampleDirectConv);
      const existing = await service.createDirect('usr-1', { participantId: 'usr-2' });
      expect(existing.id).toBe('conv-1');

      // 2. New conversation
      mockConvsRepo.findDirectBetween.mockResolvedValueOnce(null);
      const created = await service.createDirect('usr-1', { participantId: 'usr-2' });
      expect(created.id).toBe('conv-1');
    });

    it('creates group conversation with validation of member existence and blocks', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(2);
      const group = await service.createGroup('usr-owner', {
        name: 'Tech Group',
        memberIds: ['usr-admin', 'usr-member'],
      });
      expect(group.id).toBe('conv-1');
      expect(mockConvsRepo.createGroup).toHaveBeenCalled();
    });

    it('throws ForbiddenException if a user blocked creator in createGroup', async () => {
      mockPrisma.userBlock.findFirst.mockResolvedValueOnce({ id: 'b-1' });
      await expect(
        service.createGroup('usr-1', { name: 'Group', memberIds: ['usr-2'] }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateGroup & member management', () => {
    it('updates group name and emits system message', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.updateGroup('conv-group', 'usr-owner', { name: 'New Tech Group' });
      expect(mockConvsRepo.updateGroup).toHaveBeenCalled();
      expect(mockPrisma.message.create).toHaveBeenCalled();
    });

    it('adds members to group', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.addMembers('conv-group', 'usr-owner', { memberIds: ['usr-new'] });
      expect(mockConvsRepo.addParticipants).toHaveBeenCalledWith('conv-group', ['usr-new']);
    });

    it('removes member by admin / owner', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.removeMember('conv-group', 'usr-owner', 'usr-member');
      expect(mockConvsRepo.removeParticipant).toHaveBeenCalledWith('conv-group', 'usr-member');

      // Admin removing owner -> Forbidden
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await expect(service.removeMember('conv-group', 'usr-admin', 'usr-owner')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('updates admin permissions', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      const res = await service.updateAdminPermissions('conv-group', 'usr-owner', 'usr-admin', {
        canEditGroup: true,
      });
      expect(res.success).toBe(true);
      expect(res.permissions.canEditGroup).toBe(true);
      expect(typeof res.permissionsMask).toBe('number');
      expect((res.permissionsMask & Permission.CAN_EDIT) !== 0).toBe(true);
    });

    it('promotes and demotes members', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.promoteMember('conv-group', 'usr-owner', 'usr-member');
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledWith('conv-group', 'usr-member', {
        role: 'ADMIN',
      });

      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.demoteMember('conv-group', 'usr-owner', 'usr-admin');
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledWith('conv-group', 'usr-admin', {
        role: 'MEMBER',
      });
    });

    it('transfers ownership', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.transferOwnership('conv-group', 'usr-owner', { newOwnerId: 'usr-admin' });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('leaves conversation with automatic owner migration', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleGroupConv);
      await service.leaveConversation('conv-group', 'usr-owner');
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledWith('conv-group', 'usr-admin', {
        role: 'OWNER',
      });
      expect(mockConvsRepo.removeParticipant).toHaveBeenCalledWith('conv-group', 'usr-owner');
    });
  });

  describe('preferences, themes & actions', () => {
    it('sets nickname', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      await service.setNickname('conv-1', 'usr-1', { targetUserId: 'usr-2', nickname: 'Buddy' });
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledWith('conv-1', 'usr-2', {
        nickname: 'Buddy',
      });
    });

    it('sets theme per chat vs apply to all', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValue(sampleDirectConv);

      await service.setTheme('conv-1', 'usr-1', { theme: 'neon' });
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledWith('conv-1', 'usr-1', {
        theme: 'neon',
      });

      await service.setTheme('conv-1', 'usr-1', { theme: 'neon', applyToAll: true });
      expect(mockConvsRepo.setUserDefaultChatTheme).toHaveBeenCalledWith('usr-1', 'neon');
      expect(mockConvsRepo.updateAllParticipantsForUser).toHaveBeenCalledWith('usr-1', {
        theme: 'neon',
      });
    });

    it('mutes, archives, unarchives, pins, unpins, marks unread', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValue(sampleDirectConv);

      await service.muteConversation('conv-1', 'usr-1', {
        muteLevel: MuteLevel.MESSAGES_AND_CALLS,
        mutedUntil: new Date().toISOString(),
      });
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalled();

      await service.archiveConversation('conv-1', 'usr-1');
      await service.unarchiveConversation('conv-1', 'usr-1');
      await service.pinConversation('conv-1', 'usr-1');
      await service.unpinConversation('conv-1', 'usr-1');
      await service.markUnread('conv-1', 'usr-1');
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledTimes(6);
    });

    it('blocks, unblocks, reports user and checks relationships', async () => {
      await service.blockUser('usr-1', 'usr-2');
      expect(mockPrisma.userBlock.upsert).toHaveBeenCalled();

      await service.unblockUser('usr-1', 'usr-2');
      expect(mockPrisma.userBlock.deleteMany).toHaveBeenCalled();

      await service.getBlockedUsers('usr-1');
      expect(mockConvsRepo.findBlockedUsers).toHaveBeenCalledWith('usr-1');

      const rels = await service.getBlockRelationships('usr-1');
      expect(rels.blockedByMe).toBeDefined();

      await service.reportUser('usr-1', 'usr-2', {
        category: ReportCategory.SPAM,
        details: 'spam',
      });
      expect(mockPrisma.report.create).toHaveBeenCalled();
    });

    it('deletes conversation forAll vs forMe', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      await service.deleteConversation('conv-1', 'usr-1', true);
      expect(mockPrisma.conversation.delete).toHaveBeenCalledWith({ where: { id: 'conv-1' } });
      expect(mockGateway.emitConversationDeleted).toHaveBeenCalled();

      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      await service.deleteConversation('conv-1', 'usr-1', false);
      expect(mockConvsRepo.updateParticipant).toHaveBeenCalledWith('conv-1', 'usr-1', {
        leftAt: expect.any(Date) as unknown,
      });
    });

    it('clears history forAll vs forMe', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      await service.clearHistory('conv-1', 'usr-1', true);
      expect(mockPrisma.message.updateMany).toHaveBeenCalled();

      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      await service.clearHistory('conv-1', 'usr-1', false);
      expect(mockPrisma.messageDeletion.createMany).toHaveBeenCalled();
    });
  });

  describe('theme proposals (propose, respond, unlink)', () => {
    it('proposes theme and validates recipient privacy', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      const res = await service.proposeTheme('conv-1', 'usr-1', 'cyberpunk');
      expect(res.id).toBe('msg-1');
      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(mockGateway.emitToUser).toHaveBeenCalled();
    });

    it('validates proposeTheme privacy settings and existing pending proposals', async () => {
      // Direct without recipient
      mockConvsRepo.findOneForUser.mockResolvedValueOnce({
        ...sampleDirectConv,
        participants: [{ userId: 'usr-1' }],
      });
      await expect(service.proposeTheme('conv-1', 'usr-1', 'cyberpunk')).rejects.toThrow(
        BadRequestException,
      );

      // Recipient privacy: NOBODY
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce({ themeProposals: 'NOBODY' });
      await expect(service.proposeTheme('conv-1', 'usr-1', 'cyberpunk')).rejects.toThrow(
        ForbiddenException,
      );

      // Recipient privacy: CONTACTS without follow relation
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce({ themeProposals: 'CONTACTS' });
      mockPrisma.follow.findFirst.mockResolvedValueOnce(null);
      await expect(service.proposeTheme('conv-1', 'usr-1', 'cyberpunk')).rejects.toThrow(
        ForbiddenException,
      );

      // Existing pending proposal in last 24h
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce({ themeProposals: 'EVERYBODY' });
      mockPrisma.message.findFirst.mockResolvedValueOnce({ id: 'pending-prop' });
      await expect(service.proposeTheme('conv-1', 'usr-1', 'cyberpunk')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('responds to theme proposal (accept, decline, cancel)', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValue(sampleDirectConv);

      // 1. Accept
      await service.respondThemeProposal('conv-1', 'msg-prop-1', 'usr-2', 'ACCEPT');
      expect(mockConvsRepo.updateSharedTheme).toHaveBeenCalledWith('conv-1', 'neon');

      // 2. Decline
      await service.respondThemeProposal('conv-1', 'msg-prop-1', 'usr-2', 'DECLINE');
      expect(mockPrisma.message.update).toHaveBeenCalled();

      // 3. Cancel (by proposer)
      await service.respondThemeProposal('conv-1', 'msg-prop-1', 'usr-1', 'CANCEL');
      expect(mockPrisma.message.update).toHaveBeenCalled();
    });

    it('validates respondThemeProposal edge cases', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValue(sampleDirectConv);

      // Missing or different convId
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-diff',
        conversationId: 'other-conv',
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-diff', 'usr-2', 'ACCEPT'),
      ).rejects.toThrow(NotFoundException);

      // Not a theme proposal messageType
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-text',
        conversationId: 'conv-1',
        messageType: 'TEXT',
        body: 'Hello',
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-text', 'usr-2', 'ACCEPT'),
      ).rejects.toThrow(BadRequestException);

      // Corrupted JSON body
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-corrupt',
        conversationId: 'conv-1',
        messageType: 'THEME_PROPOSAL',
        body: '{not-json',
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-corrupt', 'usr-2', 'ACCEPT'),
      ).rejects.toThrow(BadRequestException);

      // Status not PENDING
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-done',
        conversationId: 'conv-1',
        messageType: 'THEME_PROPOSAL',
        body: JSON.stringify({
          status: 'ACCEPTED',
          expiresAt: new Date(Date.now() + 100000).toISOString(),
        }),
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-done', 'usr-2', 'ACCEPT'),
      ).rejects.toThrow(BadRequestException);

      // Expired proposal
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-expired',
        conversationId: 'conv-1',
        messageType: 'THEME_PROPOSAL',
        body: JSON.stringify({
          status: 'PENDING',
          expiresAt: new Date(Date.now() - 100000).toISOString(),
        }),
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-expired', 'usr-2', 'ACCEPT'),
      ).rejects.toThrow(BadRequestException);

      // Cancel by non-proposer
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-cancel-fail',
        conversationId: 'conv-1',
        messageType: 'THEME_PROPOSAL',
        body: JSON.stringify({
          status: 'PENDING',
          proposedByUserId: 'usr-1',
          expiresAt: new Date(Date.now() + 100000).toISOString(),
        }),
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-cancel-fail', 'usr-2', 'CANCEL'),
      ).rejects.toThrow(ForbiddenException);

      // Accept by proposer self
      mockPrisma.message.findUnique.mockResolvedValueOnce({
        id: 'msg-self-accept',
        conversationId: 'conv-1',
        messageType: 'THEME_PROPOSAL',
        body: JSON.stringify({
          status: 'PENDING',
          proposedByUserId: 'usr-1',
          expiresAt: new Date(Date.now() + 100000).toISOString(),
        }),
      });
      await expect(
        service.respondThemeProposal('conv-1', 'msg-self-accept', 'usr-1', 'ACCEPT'),
      ).rejects.toThrow(BadRequestException);
    });

    it('unlinks shared theme', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(sampleDirectConv);
      const res = await service.unlinkSharedTheme('conv-1', 'usr-1');
      expect(res.success).toBe(true);
      expect(mockConvsRepo.updateSharedTheme).toHaveBeenCalledWith('conv-1', null);
    });
  });
});
