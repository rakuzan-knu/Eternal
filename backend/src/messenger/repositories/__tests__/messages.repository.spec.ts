import { MessageType } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import { MessagesRepository } from '../messages.repository';

describe('MessagesRepository', () => {
  let repository: MessagesRepository;
  let mockPrisma: {
    message: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    messageDeletion: {
      upsert: jest.Mock;
    };
    messageReaction: {
      upsert: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findUnique: jest.Mock;
    };
    conversationParticipant: {
      update: jest.Mock;
    };
  };

  const sampleMsg = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'usr-1',
    body: 'Hello',
    messageType: MessageType.TEXT,
  };

  beforeEach(() => {
    mockPrisma = {
      message: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      messageDeletion: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      messageReaction: {
        upsert: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      conversationParticipant: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    repository = new MessagesRepository(mockPrisma as unknown as PrismaService);
  });

  it('create inserts a new message', async () => {
    mockPrisma.message.create.mockResolvedValueOnce(sampleMsg);

    const result = await repository.create({
      conversationId: 'conv-1',
      senderId: 'usr-1',
      body: 'Hello',
      messageType: 'TEXT',
    });

    expect(mockPrisma.message.create).toHaveBeenCalledTimes(1);
    const [createCall] = mockPrisma.message.create.mock.calls as [
      [{ data: { conversationId: string; senderId: string; body: string; messageType: string } }],
    ];
    expect(createCall[0].data.conversationId).toBe('conv-1');
    expect(createCall[0].data.senderId).toBe('usr-1');
    expect(createCall[0].data.body).toBe('Hello');
    expect(createCall[0].data.messageType).toBe('TEXT');
    expect(result).toEqual(sampleMsg);
  });

  it('findMany applies cursor and hides deleted messages', async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([sampleMsg]);

    const messages = await repository.findMany({
      conversationId: 'conv-1',
      requestingUserId: 'usr-viewer',
      limit: 20,
    });

    expect(mockPrisma.message.findMany).toHaveBeenCalledTimes(1);
    const [findManyCall] = mockPrisma.message.findMany.mock.calls as [
      [{ where: { conversationId: string; deletedForAll: boolean } }],
    ];
    expect(findManyCall[0].where.conversationId).toBe('conv-1');
    expect(findManyCall[0].where.deletedForAll).toBe(false);
    expect(messages).toEqual([sampleMsg]);
  });

  it('edit updates body and timestamp', async () => {
    mockPrisma.message.update.mockResolvedValueOnce({ ...sampleMsg, body: 'Edited' });

    const edited = await repository.edit('msg-1', 'Edited');

    expect(mockPrisma.message.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'msg-1' },
      }),
    );
    expect(edited.body).toBe('Edited');
  });

  it('deleteForAll and deleteForMe soft-delete message', async () => {
    mockPrisma.message.update.mockResolvedValueOnce({});

    await repository.deleteForAll('msg-1');
    expect(mockPrisma.message.update).toHaveBeenCalledTimes(1);
    const [updateCall] = mockPrisma.message.update.mock.calls as [
      [{ where: { id: string }; data: { deletedForAll: boolean; messageType: string } }],
    ];
    expect(updateCall[0].where.id).toBe('msg-1');
    expect(updateCall[0].data.deletedForAll).toBe(true);
    expect(updateCall[0].data.messageType).toBe('DELETED');

    await repository.deleteForMe('msg-1', 'usr-1');
    expect(mockPrisma.messageDeletion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { messageId_userId: { messageId: 'msg-1', userId: 'usr-1' } },
      }),
    );
  });

  it('addReaction and removeReaction modify reactions', async () => {
    await repository.addReaction('msg-1', 'usr-1', '❤️');
    expect(mockPrisma.messageReaction.upsert).toHaveBeenCalled();

    await repository.removeReaction('msg-1', 'usr-1', '❤️');
    expect(mockPrisma.messageReaction.deleteMany).toHaveBeenCalled();
  });
});
