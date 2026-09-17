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
      findFirst: jest.Mock;
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
      findMany: jest.Mock;
    };
    conversationParticipant: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const sampleMsg = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'usr-1',
    body: 'Hello',
    messageType: MessageType.TEXT,
    createdAt: new Date('2026-08-28T12:00:00.000Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (cb: ((tx: unknown) => unknown) | Promise<unknown>[]) =>
        typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb),
      ),
      message: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(sampleMsg),
        findFirst: jest.fn().mockResolvedValue(sampleMsg),
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
        findMany: jest.fn().mockResolvedValue([{ messageId: 'msg-1', emoji: '👍' }]),
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

    expect(result).toEqual(sampleMsg);
  });

  it('findMany applies cursor and hides deleted messages', async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([sampleMsg]);

    const messages = await repository.findMany({
      conversationId: 'conv-1',
      requestingUserId: 'usr-viewer',
      before: 'msg-0',
      limit: 20,
      hiddenUserIds: ['blocked-1'],
    });

    expect(mockPrisma.message.findMany).toHaveBeenCalled();
    expect(messages).toEqual([sampleMsg]);
  });

  it('findAround finds messages surrounding a target message', async () => {
    mockPrisma.message.findUnique.mockResolvedValueOnce({ createdAt: new Date() });
    mockPrisma.message.findMany
      .mockResolvedValueOnce([sampleMsg]) // before
      .mockResolvedValueOnce([{ ...sampleMsg, id: 'msg-2' }]); // after

    const results = await repository.findAround({
      conversationId: 'conv-1',
      targetMessageId: 'msg-1',
      requestingUserId: 'usr-1',
      limit: 10,
      hiddenUserIds: ['hidden-1'],
    });

    expect(results).toHaveLength(2);

    // When target not found
    mockPrisma.message.findUnique.mockResolvedValueOnce(null);
    expect(
      await repository.findAround({
        conversationId: 'conv-1',
        targetMessageId: 'msg-unknown',
        requestingUserId: 'usr-1',
        limit: 10,
      }),
    ).toEqual([]);
  });

  it('findAroundDate finds messages surrounding a specific date', async () => {
    mockPrisma.message.findFirst.mockResolvedValueOnce({ id: 'msg-anchor' });
    mockPrisma.message.findUnique.mockResolvedValueOnce({ createdAt: new Date() });
    mockPrisma.message.findMany.mockResolvedValueOnce([sampleMsg]).mockResolvedValueOnce([]);

    const res = await repository.findAroundDate({
      conversationId: 'conv-1',
      targetDate: new Date(),
      requestingUserId: 'usr-1',
      limit: 10,
    });
    expect(res).toHaveLength(1);

    // If anchor not found anywhere
    mockPrisma.message.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const empty = await repository.findAroundDate({
      conversationId: 'conv-1',
      targetDate: new Date(),
      requestingUserId: 'usr-1',
      limit: 10,
    });
    expect(empty).toEqual([]);
  });

  it('getActivityMap builds activity stats with various attachment types and stickers', async () => {
    mockPrisma.message.findMany.mockResolvedValueOnce([
      {
        id: 'm-1',
        body: 'Hello month',
        messageType: 'TEXT',
        createdAt: new Date('2026-08-15T10:00:00.000Z'),
        attachments: [{ type: 'IMAGE', url: 'img.jpg', thumbnailUrl: 'thumb.jpg' }],
      },
      {
        id: 'm-2',
        body: null,
        messageType: 'TEXT',
        createdAt: new Date('2026-08-15T11:00:00.000Z'),
        attachments: [{ type: 'VIDEO', url: 'video.mp4' }],
      },
      {
        id: 'm-3',
        body: null,
        messageType: 'TEXT',
        createdAt: new Date('2026-08-16T12:00:00.000Z'),
        attachments: [{ type: 'AUDIO', url: 'audio.mp3' }],
      },
      {
        id: 'm-4',
        body: null,
        messageType: 'STICKER',
        createdAt: new Date('2026-08-17T12:00:00.000Z'),
        attachments: [],
      },
      {
        id: 'm-5',
        body: null,
        messageType: 'FILE',
        createdAt: new Date('2026-08-18T12:00:00.000Z'),
        attachments: [{ type: 'FILE', url: 'doc.pdf' }],
      },
      {
        id: 'm-outside',
        body: 'Outside message',
        messageType: 'TEXT',
        createdAt: new Date('2026-07-25T12:00:00.000Z'),
        attachments: [],
      },
    ]);

    const activity = await repository.getActivityMap({
      conversationId: 'conv-1',
      year: 2026,
      month: 8,
      timezone: 'Europe/Moscow',
      requestingUserId: 'usr-1',
    });

    expect(activity['2026-08-15']).toBeDefined();
    expect(activity['2026-08-15'].messageCount).toBe(2);
    expect(activity['2026-08-15'].previewMediaUrl).toBe('thumb.jpg');
    expect(activity['2026-08-16'].firstMessageSnippet).toBe('🎤 Voice message');
    expect(activity['2026-08-17'].firstMessageSnippet).toBe('🎭 Sticker');
    expect(activity['2026-08-18'].firstMessageSnippet).toBe('📎 Attachment');
  });

  it('edit, deleteForAll and deleteForMe', async () => {
    mockPrisma.message.update.mockResolvedValueOnce({ ...sampleMsg, body: 'Edited' });
    const edited = await repository.edit('msg-1', 'Edited');
    expect(edited.body).toBe('Edited');

    await repository.deleteForAll('msg-1');
    expect(mockPrisma.message.update).toHaveBeenCalled();

    await repository.deleteForMe('msg-1', 'usr-1');
    expect(mockPrisma.messageDeletion.upsert).toHaveBeenCalled();
  });

  it('markRead and markAllRead', async () => {
    mockPrisma.message.findUnique.mockResolvedValueOnce({
      conversationId: 'conv-1',
      createdAt: new Date(),
    });
    await repository.markRead('msg-1', 'usr-1');
    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalled();

    mockPrisma.message.findUnique.mockResolvedValueOnce(null);
    expect(await repository.markRead('msg-unknown', 'usr-1')).toBeNull();

    await repository.markAllRead('conv-1', 'usr-1');
    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalled();
  });

  it('reactions, search, findLastMessage, belongsToConversation', async () => {
    await repository.addReaction('msg-1', 'usr-1', '❤️');
    expect(mockPrisma.messageReaction.upsert).toHaveBeenCalled();

    await repository.removeReaction('msg-1', 'usr-1', '❤️');
    expect(mockPrisma.messageReaction.deleteMany).toHaveBeenCalled();

    const reactions = await repository.getReactions('msg-1');
    expect(reactions).toHaveLength(1);

    await repository.search('conv-1', 'test query', 20, ['blocked-1']);
    expect(mockPrisma.message.findMany).toHaveBeenCalled();

    await repository.findLastMessage('conv-1');
    expect(mockPrisma.message.findFirst).toHaveBeenCalled();

    mockPrisma.message.findFirst.mockResolvedValueOnce({ id: 'msg-1' });
    expect(await repository.belongsToConversation('msg-1', 'conv-1')).toBe(true);

    mockPrisma.message.findFirst.mockResolvedValueOnce(null);
    expect(await repository.belongsToConversation('msg-unknown', 'conv-1')).toBe(false);
  });
});
