import type { PrismaService } from '@common/prisma';
import type { Prisma } from '@prisma/client';
import { conversationPageQuerySchema } from '@common/contracts';
import { ConversationsRepository } from '../../repositories/conversations.repository';

describe('conversation preview hydration', () => {
  it('does not load group-wide reaction, deletion or pin relations for list previews', async () => {
    let emitted: Prisma.ConversationFindManyArgs | undefined;
    const prisma = {
      $queryRaw: vi
        .fn()
        .mockResolvedValue([{ id: 'large-group', createdAt: new Date(), unreadCount: 0n }]),
      conversation: {
        findMany: async (query: Prisma.ConversationFindManyArgs) => {
          emitted = query;
          return [];
        },
      },
      conversationParticipant: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new ConversationsRepository(prisma as unknown as PrismaService);
    await repository.findPageForUser('viewer', {
      ...conversationPageQuerySchema.parse({}),
      cutoff: '2026-10-11T00:00:00.000000Z',
    });
    const latest = emitted!.include!.messages as Prisma.MessageFindManyArgs;
    const pinned = emitted!.include!.pinnedMessages as Prisma.PinnedMessageFindManyArgs;
    const pinnedMessage = pinned.include!.message as Prisma.MessageDefaultArgs;
    for (const include of [latest.include!, pinnedMessage.include!]) {
      expect(include.reactions).toBeFalsy();
      expect(include.pinnedIn).toBeFalsy();
      expect(include.deletedFor).toMatchObject({ where: { userId: 'viewer' }, take: 1 });
      const reply = include.replyTo as Prisma.MessageDefaultArgs;
      expect(reply.include!.deletedFor).toMatchObject({
        where: { userId: 'viewer' },
        take: 1,
      });
      const receipts = include.conversation as Prisma.ConversationDefaultArgs;
      expect(receipts.select!.participants).toMatchObject({ take: 64 });
    }
  });

  it('retains complete reaction and membership data on authorized conversation detail', async () => {
    let emitted: Prisma.ConversationFindFirstArgs | undefined;
    const repository = new ConversationsRepository({
      conversation: {
        findFirst: async (query: Prisma.ConversationFindFirstArgs) => {
          emitted = query;
          return null;
        },
      },
    } as unknown as PrismaService);
    await repository.findOneForUser('large-group', 'viewer');
    const latest = emitted!.include!.messages as Prisma.MessageFindManyArgs;
    expect(latest.include!.reactions).toMatchObject({ select: { userId: true } });
    expect(latest.include!.deletedFor).toEqual({ select: { userId: true } });
    expect(emitted!.include!.participants).not.toHaveProperty('take');
  });
});
