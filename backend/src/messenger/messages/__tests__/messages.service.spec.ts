import { ForbiddenException } from '@nestjs/common';
import { MessagesService } from '../messages.service';
import type { IConversationsRepository } from '../../interfaces/conversations-repository.interface';
import type { IMessagesRepository } from '../../interfaces/messages-repository.interface';
import type { MessengerMapper } from '../../messenger.mapper';
import type { PrismaService } from '@common/prisma';
import type { ConfigService } from '@nestjs/config';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockConvsRepo: {
    findParticipant: jest.Mock;
    findOneForUser: jest.Mock;
    findDirectBetween: jest.Mock;
    findPinnedMessages: jest.Mock;
  };
  let mockMessagesRepo: {
    findMany: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    edit: jest.Mock;
    deleteForAll: jest.Mock;
    deleteForMe: jest.Mock;
    addReaction: jest.Mock;
    removeReaction: jest.Mock;
    markRead: jest.Mock;
  };
  let mockMapper: {
    mapMessage: jest.Mock;
  };
  let mockPrisma: {
    userBlock: {
      findMany: jest.Mock;
    };
    pinnedMessage: {
      findMany: jest.Mock;
    };
    message: {
      create: jest.Mock;
      update: jest.Mock;
    };
    conversation: {
      update: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const sampleMsg = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'usr-1',
    body: 'Hello',
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockConvsRepo = {
      findParticipant: jest.fn().mockResolvedValue({ userId: 'usr-1', leftAt: null }),
      findOneForUser: jest
        .fn()
        .mockResolvedValue({ id: 'conv-1', type: 'GROUP', participants: [] }),
      findDirectBetween: jest.fn(),
      findPinnedMessages: jest.fn().mockResolvedValue([]),
    };

    mockMessagesRepo = {
      findMany: jest.fn().mockResolvedValue([sampleMsg]),
      findOne: jest.fn().mockResolvedValue(sampleMsg),
      create: jest.fn().mockResolvedValue(sampleMsg),
      edit: jest.fn().mockResolvedValue({ ...sampleMsg, body: 'Edited' }),
      deleteForAll: jest.fn().mockResolvedValue(undefined),
      deleteForMe: jest.fn().mockResolvedValue(undefined),
      addReaction: jest.fn().mockResolvedValue(undefined),
      removeReaction: jest.fn().mockResolvedValue(undefined),
      markRead: jest.fn().mockResolvedValue(undefined),
    };

    mockMapper = {
      mapMessage: jest.fn().mockReturnValue({ id: 'msg-1', body: 'Hello' }),
    };

    mockPrisma = {
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      pinnedMessage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      message: {
        create: jest.fn().mockResolvedValue(sampleMsg),
        update: jest.fn().mockResolvedValue(sampleMsg),
      },
      conversation: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({ type: 'DIRECT', participants: [] }),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string, def?: string) => def ?? 'test'),
    };

    service = new MessagesService(
      mockConvsRepo as unknown as IConversationsRepository,
      mockMessagesRepo as unknown as IMessagesRepository,
      mockMapper as unknown as MessengerMapper,
      mockPrisma as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('getMessages & send', () => {
    it('getMessages validates membership and returns paginated messages', async () => {
      const result = await service.getMessages('conv-1', 'usr-1', { limit: 20 });

      expect(mockConvsRepo.findParticipant).toHaveBeenCalledWith('conv-1', 'usr-1');
      expect(mockMessagesRepo.findMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
    });

    it('send creates message and returns mapped view', async () => {
      const result = await service.send('conv-1', 'usr-1', {
        conversationId: 'conv-1',
        text: 'Hello',
        messageType: 'TEXT' as const,
      });

      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(result.id).toBe('msg-1');
    });
  });

  describe('edit & delete', () => {
    it('edit throws ForbiddenException if user is not author', async () => {
      mockMessagesRepo.findOne.mockResolvedValueOnce({ ...sampleMsg, senderId: 'other-user' });

      await expect(
        service.edit('msg-1', 'usr-1', { messageId: 'msg-1', body: 'New text' }),
      ).rejects.toThrow(new ForbiddenException('Cannot edit others messages'));
    });

    it('delete handles forMe and forAll deletions', async () => {
      mockMessagesRepo.findOne.mockResolvedValue({ ...sampleMsg, senderId: 'usr-1' });

      await service.delete('msg-1', 'usr-1', { messageId: 'msg-1', forAll: false });
      expect(mockMessagesRepo.deleteForMe).toHaveBeenCalledWith('msg-1', 'usr-1');

      await service.delete('msg-1', 'usr-1', { messageId: 'msg-1', forAll: true });
      expect(mockMessagesRepo.deleteForAll).toHaveBeenCalledWith('msg-1');
    });
  });
});
