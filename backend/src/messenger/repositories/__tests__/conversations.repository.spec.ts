import { MuteLevel } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import { ConversationsRepository } from '../conversations.repository';

describe('ConversationsRepository', () => {
  let repository: ConversationsRepository;
  let mockPrisma: {
    conversation: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    conversationParticipant: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    pinnedMessage: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    message: {
      count: jest.Mock;
    };
  };

  const sampleConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    participants: [],
  };

  beforeEach(() => {
    mockPrisma = {
      conversation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      conversationParticipant: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      pinnedMessage: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      message: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    repository = new ConversationsRepository(mockPrisma as unknown as PrismaService);
  });

  it('findDirectBetween queries existing direct conversation', async () => {
    mockPrisma.conversation.findFirst.mockResolvedValueOnce(sampleConv);

    const conv = await repository.findDirectBetween('usr-1', 'usr-2');

    expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: 'usr-1' } } },
          { participants: { some: { userId: 'usr-2' } } },
        ],
      },
    });
    expect(conv).toEqual(sampleConv);
  });

  it('createDirect and createGroup create conversation with participants', async () => {
    mockPrisma.conversation.create.mockResolvedValueOnce(sampleConv);

    await repository.createDirect('usr-1', 'usr-2');

    mockPrisma.conversation.create.mockResolvedValueOnce(sampleConv);
    await repository.createGroup({
      name: 'Test Group',
      createdById: 'usr-owner',
      memberIds: ['usr-member'],
    });

    expect(mockPrisma.conversation.create).toHaveBeenCalledTimes(2);
    const [directCall, groupCall] = mockPrisma.conversation.create.mock.calls as [
      [{ data: { type: string; participants: { create: Array<{ userId: string }> } } }],
      [{ data: { type: string; name: string; createdById: string } }],
    ];
    expect(directCall[0].data.type).toBe('DIRECT');
    expect(groupCall[0].data.type).toBe('GROUP');
    expect(groupCall[0].data.name).toBe('Test Group');
    expect(groupCall[0].data.createdById).toBe('usr-owner');
  });

  it('updateParticipant updates theme, nickname, mute settings', async () => {
    mockPrisma.conversationParticipant.update.mockResolvedValueOnce({});

    await repository.updateParticipant('conv-1', 'usr-1', {
      theme: 'neon',
      nickname: 'Neo',
      muteLevel: MuteLevel.MESSAGES,
    });

    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: 'conv-1', userId: 'usr-1' } },
      data: {
        theme: 'neon',
        nickname: 'Neo',
        muteLevel: MuteLevel.MESSAGES,
      },
    });
  });

  it('pinMessage and unpinMessage toggle pinned message', async () => {
    mockPrisma.pinnedMessage.create.mockResolvedValueOnce({});
    mockPrisma.pinnedMessage.delete.mockResolvedValueOnce({});

    await repository.pinMessage('conv-1', 'msg-1', 'usr-1');
    expect(mockPrisma.pinnedMessage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId_messageId: { conversationId: 'conv-1', messageId: 'msg-1' } },
        create: { conversationId: 'conv-1', messageId: 'msg-1', pinnedByUserId: 'usr-1' },
      }),
    );

    await repository.unpinMessage('conv-1', 'msg-1');
    expect(mockPrisma.pinnedMessage.delete).toHaveBeenCalledWith({
      where: { conversationId_messageId: { conversationId: 'conv-1', messageId: 'msg-1' } },
    });
  });
});
