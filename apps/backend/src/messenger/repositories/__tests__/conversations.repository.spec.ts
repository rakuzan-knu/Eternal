import { MuteLevel, ParticipantRole } from '@prisma/client';
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
      updateMany: jest.Mock;
      createMany: jest.Mock;
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
    pinnedMessage: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    userBlock: {
      findMany: jest.Mock;
    };
    user: {
      update: jest.Mock;
    };
    message: {
      count: jest.Mock;
    };
    $transaction: jest.Mock;
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
        update: jest.fn().mockResolvedValue(sampleConv),
      },
      conversationParticipant: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        upsert: jest.fn().mockResolvedValue({}),
      },
      pinnedMessage: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ messageId: 'msg-1' }]),
        create: jest.fn(),
        upsert: jest.fn().mockResolvedValue({}),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      userBlock: {
        findMany: jest.fn().mockResolvedValue([
          {
            blocked: {
              id: 'u-2',
              username: 'blocked',
              displayName: 'Blocked',
              avatar: null,
              isVerified: false,
              isBot: false,
            },
          },
        ]),
      },
      user: {
        update: jest.fn().mockResolvedValue({}),
      },
      message: {
        count: jest.fn().mockResolvedValue(4),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
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

  it('findAllForUser and findOneForUser', async () => {
    mockPrisma.conversation.findMany.mockResolvedValueOnce([sampleConv]);
    const all = await repository.findAllForUser('usr-1');
    expect(all).toEqual([sampleConv]);

    mockPrisma.conversation.findFirst.mockResolvedValueOnce(sampleConv);
    const one = await repository.findOneForUser('conv-1', 'usr-1');
    expect(one).toEqual(sampleConv);
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
  });

  it('updateGroup and updateSharedTheme', async () => {
    await repository.updateGroup('conv-1', { name: 'New Name' });
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { name: 'New Name' },
    });

    await repository.updateSharedTheme('conv-1', 'neon-purple');
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conv-1' },
        data: expect.objectContaining({ sharedTheme: 'neon-purple' }) as unknown,
      }),
    );
  });

  it('participants operations (find, findMany, blocked, ids, add, remove)', async () => {
    await repository.findParticipant('conv-1', 'usr-1');
    expect(mockPrisma.conversationParticipant.findUnique).toHaveBeenCalled();

    await repository.findParticipants('conv-1');
    expect(mockPrisma.conversationParticipant.findMany).toHaveBeenCalled();

    const blocked = await repository.findBlockedUsers('usr-1');
    expect(blocked).toHaveLength(1);
    expect(blocked[0].id).toBe('u-2');

    mockPrisma.conversationParticipant.findMany.mockResolvedValueOnce([{ userId: 'usr-1' }]);
    const ids = await repository.findParticipantIds('conv-1');
    expect(ids).toEqual(['usr-1']);

    await repository.addParticipants('conv-1', ['usr-1', 'usr-2']);
    expect(mockPrisma.$transaction).toHaveBeenCalled();

    await repository.removeParticipant('conv-1', 'usr-1');
    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: 'conv-1', userId: 'usr-1' } },
      data: expect.objectContaining({ leftAt: expect.any(Date) as unknown }) as unknown,
    });
  });

  it('updateParticipant updates theme, nickname, mute settings', async () => {
    mockPrisma.conversationParticipant.update.mockResolvedValueOnce({});

    await repository.updateParticipant('conv-1', 'usr-1', {
      theme: 'neon',
      nickname: 'Neo',
      muteLevel: MuteLevel.MESSAGES,
      role: ParticipantRole.ADMIN,
    });

    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: 'conv-1', userId: 'usr-1' } },
      data: {
        theme: 'neon',
        nickname: 'Neo',
        muteLevel: MuteLevel.MESSAGES,
        role: ParticipantRole.ADMIN,
      },
    });
  });

  it('user defaults, touch and countUnread', async () => {
    await repository.setUserDefaultChatTheme('usr-1', 'custom-theme');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      data: { defaultChatTheme: 'custom-theme' },
    });

    await repository.updateAllParticipantsForUser('usr-1', { theme: 'custom-theme' });
    expect(mockPrisma.conversationParticipant.updateMany).toHaveBeenCalled();

    await repository.touchUpdatedAt('conv-1');
    expect(mockPrisma.conversation.update).toHaveBeenCalled();

    // countUnread with active participant
    mockPrisma.conversationParticipant.findUnique.mockResolvedValueOnce({
      joinedAt: new Date(),
      lastReadAt: new Date(),
    });
    const count = await repository.countUnread('conv-1', 'usr-1', ['hidden-1']);
    expect(count).toBe(4);

    // countUnread when not a participant
    mockPrisma.conversationParticipant.findUnique.mockResolvedValueOnce(null);
    const zero = await repository.countUnread('conv-1', 'usr-1');
    expect(zero).toBe(0);
  });

  it('pinned messages operations (find, pin, unpin)', async () => {
    const pinned = await repository.findPinnedMessages('conv-1');
    expect(pinned).toEqual(['msg-1']);

    await repository.pinMessage('conv-1', 'msg-1', 'usr-1');
    expect(mockPrisma.pinnedMessage.upsert).toHaveBeenCalled();

    await repository.unpinMessage('conv-1', 'msg-1');
    expect(mockPrisma.pinnedMessage.delete).toHaveBeenCalled();
  });
});
