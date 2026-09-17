import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from '../messages.service';
import type { IConversationsRepository } from '../../interfaces/conversations-repository.interface';
import type { IMessagesRepository } from '../../interfaces/messages-repository.interface';
import type { MessengerMapper } from '../../messenger.mapper';
import type { PrismaService } from '@common/prisma';
import type { ConfigService } from '@nestjs/config';
import { AttachmentType, MessageType } from '@common/contracts';

jest.mock('../../../common/media/image-processor', () => ({
  uploadToStorageWithFallback: jest
    .fn()
    .mockResolvedValue('https://storage.local/attachments/file.jpg'),
}));

describe('MessagesService', () => {
  let service: MessagesService;
  let mockConvsRepo: {
    findParticipant: jest.Mock;
    findOneForUser: jest.Mock;
    findDirectBetween: jest.Mock;
    findPinnedMessages: jest.Mock;
    findParticipantIds?: jest.Mock;
    touchUpdatedAt: jest.Mock;
    pinMessage: jest.Mock;
    unpinMessage: jest.Mock;
  };
  let mockMessagesRepo: {
    findMany: jest.Mock;
    findAround: jest.Mock;
    findAroundDate: jest.Mock;
    getActivityMap: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    edit: jest.Mock;
    deleteForAll: jest.Mock;
    deleteForMe: jest.Mock;
    addReaction: jest.Mock;
    removeReaction: jest.Mock;
    markAllRead: jest.Mock;
    belongsToConversation: jest.Mock;
    search: jest.Mock;
  };
  let mockMapper: {
    mapMessage: jest.Mock;
  };
  let mockPrisma: {
    userBlock: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
    pinnedMessage: {
      findMany: jest.Mock;
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
    conversation: {
      update: jest.Mock;
      findUnique: jest.Mock;
    };
    outboxEvent?: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const sampleMsg = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'usr-1',
    body: 'Hello',
    messageType: 'TEXT',
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockConvsRepo = {
      findParticipant: jest
        .fn()
        .mockResolvedValue({ userId: 'usr-1', role: 'MEMBER', leftAt: null }),
      findOneForUser: jest.fn().mockResolvedValue({
        id: 'conv-1',
        type: 'GROUP',
        participants: [
          { userId: 'usr-1', role: 'ADMIN', leftAt: null },
          { userId: 'usr-2', role: 'MEMBER', leftAt: null },
        ],
      }),
      findDirectBetween: jest.fn(),
      findPinnedMessages: jest.fn().mockResolvedValue(['msg-1']),
      findParticipantIds: jest.fn().mockResolvedValue(['usr-1', 'usr-2']),
      touchUpdatedAt: jest.fn().mockResolvedValue(undefined),
      pinMessage: jest.fn().mockResolvedValue(undefined),
      unpinMessage: jest.fn().mockResolvedValue(undefined),
    };

    mockMessagesRepo = {
      findMany: jest.fn().mockResolvedValue([sampleMsg]),
      findAround: jest.fn().mockResolvedValue([sampleMsg]),
      findAroundDate: jest.fn().mockResolvedValue([sampleMsg]),
      getActivityMap: jest.fn().mockResolvedValue({ '2026-08-28': { messageCount: 1 } }),
      findOne: jest.fn().mockResolvedValue(sampleMsg),
      create: jest.fn().mockResolvedValue(sampleMsg),
      edit: jest.fn().mockResolvedValue({ ...sampleMsg, body: 'Edited' }),
      deleteForAll: jest.fn().mockResolvedValue(undefined),
      deleteForMe: jest.fn().mockResolvedValue(undefined),
      addReaction: jest.fn().mockResolvedValue(undefined),
      removeReaction: jest.fn().mockResolvedValue(undefined),
      markAllRead: jest.fn().mockResolvedValue(undefined),
      belongsToConversation: jest.fn().mockResolvedValue(true),
      search: jest.fn().mockResolvedValue([sampleMsg]),
    };

    mockMapper = {
      mapMessage: jest.fn().mockReturnValue({ id: 'msg-1', body: 'Hello' }),
    };

    mockPrisma = {
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      pinnedMessage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      message: {
        create: jest.fn().mockResolvedValue(sampleMsg),
        findMany: jest.fn().mockResolvedValue([sampleMsg]),
        findFirst: jest.fn().mockResolvedValue(sampleMsg),
        findUnique: jest.fn().mockResolvedValue(sampleMsg),
        update: jest.fn().mockResolvedValue(sampleMsg),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      messageDeletion: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      conversation: {
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue({
          type: 'DIRECT',
          participants: [{ userId: 'usr-1' }, { userId: 'usr-2' }],
        }),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
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

  describe('uploadAttachment', () => {
    it('uploads image/video/audio attachments correctly', async () => {
      const mockFile = {
        buffer: Buffer.from('fake data'),
        mimetype: 'image/jpeg',
        originalname: 'photo.jpg',
      } as Express.Multer.File;

      const res = await service.uploadAttachment('conv-1', 'usr-1', mockFile);
      expect(res.type).toBe(AttachmentType.IMAGE);
      expect(res.url).toBe('https://storage.local/attachments/file.jpg');
    });

    it('rejects oversized files', async () => {
      const hugeFile = {
        buffer: Buffer.alloc(26 * 1024 * 1024),
        mimetype: 'image/jpeg',
        originalname: 'huge.jpg',
      } as Express.Multer.File;

      await expect(service.uploadAttachment('conv-1', 'usr-1', hugeFile)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('send message and validations', () => {
    it('sends text and attachment message', async () => {
      const res = await service.send('conv-1', 'usr-1', {
        conversationId: 'conv-1',
        text: 'Hello world',
        messageType: MessageType.TEXT,
      });
      expect(res.id).toBe('msg-1');
      expect(mockPrisma.message.create).toHaveBeenCalled();
      expect(mockPrisma.conversation.update).toHaveBeenCalled();
    });

    it('validates video note circle duration limits', async () => {
      await expect(
        service.send('conv-1', 'usr-1', {
          conversationId: 'conv-1',
          messageType: MessageType.VIDEO,
          attachments: [
            {
              type: AttachmentType.VIDEO,
              url: 'video.mp4',
              fileName: 'video_note.mp4',
              duration: 70,
            },
          ],
        }),
      ).rejects.toThrow(new BadRequestException('Video notes (circles) cannot exceed 60 seconds'));
    });
  });

  describe('getMessages, getAround, getAroundDate, getActivityMap', () => {
    it('retrieves paginated messages with cursors', async () => {
      const res = await service.getMessages('conv-1', 'usr-1', { limit: 10 });
      expect(res.data).toHaveLength(1);
    });

    it('retrieves surrounding messages by id or date', async () => {
      const around = await service.getAround('conv-1', 'msg-1', 'usr-1', 10);
      expect(around.data).toHaveLength(1);

      const aroundDate = await service.getAroundDate(
        'conv-1',
        '2026-08-28T12:00:00.000Z',
        'usr-1',
        10,
      );
      expect(aroundDate.data).toHaveLength(1);
    });

    it('retrieves chat activity map', async () => {
      const act = await service.getActivityMap('conv-1', 2026, 8, 'UTC', 'usr-1');
      expect(act['2026-08-28']).toBeDefined();
    });
  });

  describe('edit & delete & batchDelete', () => {
    it('edits message author only and text messages only', async () => {
      const edited = await service.edit('msg-1', 'usr-1', {
        messageId: 'msg-1',
        body: 'Updated body',
      });
      expect(edited.id).toBe('msg-1');

      // Non author
      mockMessagesRepo.findOne.mockResolvedValueOnce({ ...sampleMsg, senderId: 'usr-other' });
      await expect(
        service.edit('msg-1', 'usr-1', { messageId: 'msg-1', body: 'fail' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deletes message forMe vs forAll with role permissions', async () => {
      await service.delete('msg-1', 'usr-1', { messageId: 'msg-1', forAll: false });
      expect(mockMessagesRepo.deleteForMe).toHaveBeenCalledWith('msg-1', 'usr-1');

      await service.delete('msg-1', 'usr-1', { messageId: 'msg-1', forAll: true });
      expect(mockMessagesRepo.deleteForAll).toHaveBeenCalledWith('msg-1');

      // Admin deleting OWNER message -> Forbidden
      mockMessagesRepo.findOne.mockResolvedValueOnce({ ...sampleMsg, senderId: 'usr-owner' });
      mockConvsRepo.findParticipant.mockImplementation((_convId: string, uId: string) => {
        if (uId === 'usr-admin')
          return Promise.resolve({ userId: 'usr-admin', role: 'ADMIN', leftAt: null });
        if (uId === 'usr-owner')
          return Promise.resolve({ userId: 'usr-owner', role: 'OWNER', leftAt: null });
        return Promise.resolve({ userId: uId, role: 'MEMBER', leftAt: null });
      });
      await expect(
        service.delete('msg-1', 'usr-admin', { messageId: 'msg-1', forAll: true }),
      ).rejects.toThrow(new ForbiddenException('Cannot delete messages from the group owner'));

      // Admin deleting other ADMIN message -> Forbidden
      mockMessagesRepo.findOne.mockResolvedValueOnce({ ...sampleMsg, senderId: 'usr-admin-2' });
      mockConvsRepo.findParticipant.mockImplementation((_convId: string, uId: string) => {
        if (uId === 'usr-admin')
          return Promise.resolve({ userId: 'usr-admin', role: 'ADMIN', leftAt: null });
        if (uId === 'usr-admin-2')
          return Promise.resolve({ userId: 'usr-admin-2', role: 'ADMIN', leftAt: null });
        return Promise.resolve({ userId: uId, role: 'MEMBER', leftAt: null });
      });
      await expect(
        service.delete('msg-1', 'usr-admin', { messageId: 'msg-1', forAll: true }),
      ).rejects.toThrow(new ForbiddenException('Admins cannot delete messages from other admins'));
    });

    it('batch deletes messages with validations and edge cases', async () => {
      // Empty array
      const emptyRes = await service.batchDelete('conv-1', 'usr-1', { messageIds: [] });
      expect(emptyRes.deletedIds).toEqual([]);

      // Over 50 items
      const hugeIds = Array.from({ length: 55 }, (_, i) => `msg-${i}`);
      await expect(service.batchDelete('conv-1', 'usr-1', { messageIds: hugeIds })).rejects.toThrow(
        BadRequestException,
      );

      // Inactive participant
      mockConvsRepo.findOneForUser.mockResolvedValueOnce({
        id: 'conv-1',
        type: 'DIRECT',
        participants: [{ userId: 'usr-1', leftAt: new Date() }],
      });
      await expect(
        service.batchDelete('conv-1', 'usr-1', { messageIds: ['msg-1'] }),
      ).rejects.toThrow(ForbiddenException);

      // Normal member trying to delete others message forAll -> Forbidden
      mockConvsRepo.findOneForUser.mockResolvedValueOnce({
        id: 'conv-1',
        type: 'GROUP',
        participants: [{ userId: 'usr-1', role: 'MEMBER', leftAt: null }],
      });
      mockPrisma.message.findMany.mockResolvedValueOnce([{ id: 'msg-1', senderId: 'usr-other' }]);
      await expect(
        service.batchDelete('conv-1', 'usr-1', { messageIds: ['msg-1'], forAll: true }),
      ).rejects.toThrow(ForbiddenException);

      const forMe = await service.batchDelete('conv-1', 'usr-1', {
        messageIds: ['msg-1'],
        forAll: false,
      });
      expect(forMe.deletedIds).toEqual(['msg-1']);

      const forAll = await service.batchDelete('conv-1', 'usr-1', {
        messageIds: ['msg-1'],
        forAll: true,
      });
      expect(forAll.deletedIds).toEqual(['msg-1']);
    });
  });

  describe('forward & batchForward', () => {
    it('forwards single message to target conversation', async () => {
      const res = await service.forward('msg-1', 'usr-1', {
        messageId: 'msg-1',
        conversationIds: ['conv-target'],
      });
      expect(res).toHaveLength(1);
      expect(mockMessagesRepo.create).toHaveBeenCalled();
    });

    it('batch forwards multiple messages and checks 50 items limit', async () => {
      const hugeIds = Array.from({ length: 55 }, (_, i) => `msg-${i}`);
      await expect(
        service.batchForward('conv-1', 'usr-1', {
          messageIds: hugeIds,
          conversationIds: ['conv-target'],
        }),
      ).rejects.toThrow(BadRequestException);

      const res = await service.batchForward('conv-1', 'usr-1', {
        messageIds: ['msg-1'],
        conversationIds: ['conv-target'],
      });
      expect(res).toHaveLength(1);
    });

    it('refuses server-side copy of E2EE envelopes (must re-encrypt client-side)', async () => {
      const envelope = JSON.stringify({
        e2ee: true,
        v: 1,
        iv: 'AAAAAAAAAAAAAAAA',
        ct: 'd29ybGQ',
      });
      const createsBefore = mockMessagesRepo.create.mock.calls.length;
      mockMessagesRepo.findOne.mockResolvedValueOnce({ ...sampleMsg, body: envelope });
      await expect(
        service.forward('msg-1', 'usr-1', {
          messageId: 'msg-1',
          conversationIds: ['conv-target'],
        }),
      ).rejects.toThrow(/re-encrypted client-side/);
      expect(mockMessagesRepo.create.mock.calls.length).toBe(createsBefore);
    });

    it('refuses batch forward containing an E2EE envelope', async () => {
      const envelope = JSON.stringify({
        e2ee: true,
        v: 3,
        iv: 'AAAAAAAAAAAAAAAA',
        ct: 'd29ybGQ',
        from: 'dev-1',
        keys: { 'dev-2': { iv: 'AAAAAAAAAAAAAAAA', k: 'a2V5' } },
        aad: { conversationId: 'conv-1', senderId: 'usr-1', senderDevice: 'dev-1', seq: 4 },
      });
      mockPrisma.message.findMany.mockResolvedValueOnce([{ ...sampleMsg, body: envelope }]);
      await expect(
        service.batchForward('conv-1', 'usr-1', {
          messageIds: ['msg-1'],
          conversationIds: ['conv-target'],
        }),
      ).rejects.toThrow(/re-encrypted client-side/);
    });
  });

  describe('reactions, pins, read status and search', () => {
    it('adds and removes reactions', async () => {
      await service.addReaction('msg-1', 'usr-1', { messageId: 'msg-1', emoji: '❤️' });
      expect(mockMessagesRepo.addReaction).toHaveBeenCalled();

      await service.removeReaction('msg-1', 'usr-1', '❤️');
      expect(mockMessagesRepo.removeReaction).toHaveBeenCalled();
    });

    it('pins and unpins messages', async () => {
      await service.pinMessage('conv-1', 'msg-1', 'usr-1');
      expect(mockConvsRepo.pinMessage).toHaveBeenCalledWith('conv-1', 'msg-1', 'usr-1');

      await service.unpinMessage('conv-1', 'msg-1', 'usr-1');
      expect(mockConvsRepo.unpinMessage).toHaveBeenCalledWith('conv-1', 'msg-1');
    });

    it('marks messages as read with and without messageId', async () => {
      mockPrisma.message.findUnique.mockResolvedValueOnce({ senderId: 'usr-2' });
      const marked = await service.markRead('conv-1', 'usr-1', 'msg-1');
      expect(marked).toBe(true);
      expect(mockMessagesRepo.markAllRead).toHaveBeenCalledWith('conv-1', 'usr-1');

      // Without messageId, checks lastMessage
      mockPrisma.message.findFirst.mockResolvedValueOnce({ senderId: 'usr-2' });
      const markedAll = await service.markRead('conv-1', 'usr-1');
      expect(markedAll).toBe(true);

      // Marking own message returns false
      mockPrisma.message.findUnique.mockResolvedValueOnce({ senderId: 'usr-1' });
      const own = await service.markRead('conv-1', 'usr-1', 'msg-1');
      expect(own).toBe(false);
    });

    it('searches messages within conversation and filters blocked users', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValueOnce([
        { blockerId: 'usr-1', blockedId: 'usr-blocked-1' },
      ]);
      const results = await service.search('conv-1', 'usr-1', { q: 'hello', limit: 20 });
      expect(results).toHaveLength(1);
      expect(mockMessagesRepo.search).toHaveBeenCalledWith('conv-1', 'hello', 20, [
        'usr-blocked-1',
      ]);
    });
  });
});
