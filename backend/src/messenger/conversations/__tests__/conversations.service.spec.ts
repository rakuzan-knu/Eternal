import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConversationsService } from '../conversations.service';
import type { IConversationsRepository } from '../../interfaces/conversations-repository.interface';
import type { IMessagesRepository } from '../../interfaces/messages-repository.interface';
import type { UsersService } from '../../../users/users.service';
import type { MessengerMapper } from '../../messenger.mapper';
import type { PrismaService } from '@common/prisma';
import type { ConfigService } from '@nestjs/config';

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
    updateParticipantPreferences: jest.Mock;
  };
  let mockMessagesRepo: {
    create: jest.Mock;
  };
  let mockUsersService: {
    findById: jest.Mock;
  };
  let mockMapper: {
    mapConversation: jest.Mock;
  };
  let mockPrisma: {
    userBlock: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const sampleConv = {
    id: 'conv-1',
    type: 'DIRECT',
    participants: [{ userId: 'usr-1' }, { userId: 'usr-2' }],
  };

  beforeEach(() => {
    mockConvsRepo = {
      findAllForUser: jest.fn().mockResolvedValue([sampleConv]),
      findOneForUser: jest.fn(),
      findDirectBetween: jest.fn(),
      createDirect: jest.fn().mockResolvedValue(sampleConv),
      createGroup: jest.fn().mockResolvedValue({ ...sampleConv, type: 'GROUP' }),
      countUnread: jest.fn().mockResolvedValue(0),
      findParticipant: jest.fn(),
      findParticipants: jest.fn().mockResolvedValue([]),
      updateParticipantPreferences: jest.fn().mockResolvedValue({}),
    };

    mockMessagesRepo = {
      create: jest.fn(),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    mockMapper = {
      mapConversation: jest.fn().mockReturnValue({ id: 'conv-1' }),
    };

    mockPrisma = {
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string, def?: string) => def ?? 'test'),
    };

    service = new ConversationsService(
      mockConvsRepo as unknown as IConversationsRepository,
      mockMessagesRepo as unknown as IMessagesRepository,
      mockUsersService as unknown as UsersService,
      mockMapper as unknown as MessengerMapper,
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('getConversations & getConversation', () => {
    it('getConversations fetches and maps conversations', async () => {
      const result = await service.getConversations('usr-1');

      expect(mockConvsRepo.findAllForUser).toHaveBeenCalledWith('usr-1');
      expect(result).toHaveLength(1);
    });

    it('getConversation throws NotFoundException when conversation not found', async () => {
      mockConvsRepo.findOneForUser.mockResolvedValueOnce(null);

      await expect(service.getConversation('missing-conv', 'usr-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createDirect', () => {
    it('throws BadRequestException when trying to DM oneself', async () => {
      await expect(service.createDirect('usr-1', { participantId: 'usr-1' })).rejects.toThrow(
        new BadRequestException('Cannot create a conversation with yourself'),
      );
    });

    it('throws NotFoundException if target user does not exist', async () => {
      mockUsersService.findById.mockResolvedValueOnce(null);

      await expect(service.createDirect('usr-1', { participantId: 'usr-2' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates and returns direct conversation when target exists', async () => {
      mockUsersService.findById.mockResolvedValueOnce({ id: 'usr-2' });
      mockConvsRepo.findDirectBetween.mockResolvedValueOnce(null);

      const result = await service.createDirect('usr-1', { participantId: 'usr-2' });

      expect(mockConvsRepo.createDirect).toHaveBeenCalledWith('usr-1', 'usr-2');
      expect(result.id).toBe('conv-1');
    });
  });
});
