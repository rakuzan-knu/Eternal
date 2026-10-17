import type { PrismaService } from '@common/prisma';
import { SearchRepository } from '../search.repository';

describe('SearchRepository message body hydration', () => {
  it('searches the private projection and hydrates before building snippets', async () => {
    const message = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      body: null as string | null,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      conversation: { name: 'Group', type: 'GROUP', participants: [] },
      sender: { username: 'alice', displayName: null, avatar: null },
    };
    const prisma = {
      conversationParticipant: {
        findMany: jest.fn().mockResolvedValue([{ conversationId: 'c1' }]),
      },
      message: { findMany: jest.fn().mockResolvedValue([message]) },
    };
    const repository = new SearchRepository(prisma as unknown as PrismaService);
    Object.assign(repository, {
      messageBodies: {
        hydrate: async <T>(value: T): Promise<T> => {
          await Promise.resolve();
          message.body = 'A restored match in the message';
          return value;
        },
      },
    });

    const result = await repository.searchGlobal('u1', {
      q: 'match',
      type: 'messages',
      limit: 20,
      offset: 0,
    });

    expect(result.messages[0].body).toBe(message.body);
    expect(result.messages[0].highlightSnippet).toContain('restored match');
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: { in: ['c1'] },
          deletedFor: { none: { userId: 'u1' } },
          bodySearch: { contains: 'match', mode: 'insensitive' },
        }),
      }),
    );
  });
});
