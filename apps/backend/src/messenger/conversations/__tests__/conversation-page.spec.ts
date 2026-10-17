import { conversationPageQuerySchema } from '@common/contracts';
import { decodeConversationCursor, encodeConversationCursor } from '../conversation-cursor';
import { ConversationsRepository } from '../../repositories/conversations.repository';
import type { PrismaService } from '@common/prisma';

describe('conversation page contract', () => {
  it('bounds requests and decodes CSV folder overrides', () => {
    expect(conversationPageQuerySchema.parse({ includeIds: 'a,b' })).toMatchObject({
      limit: 25,
      includeIds: ['a', 'b'],
      archive: 'active',
    });
    expect(conversationPageQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(conversationPageQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
  });
  it('binds a tamper-proof activity boundary to the viewer and filters', () => {
    const scope = 'viewer:groups';
    const cutoff = new Date().toISOString();
    const value = { before: cutoff, id: 'b', cutoff };
    const cursor = encodeConversationCursor(value, scope, 'test-secret');
    expect(decodeConversationCursor(cursor, scope, 'test-secret')).toEqual(value);
    expect(() => decodeConversationCursor(cursor, 'another-viewer', 'test-secret')).toThrow();
    expect(() => decodeConversationCursor(`${cursor}x`, scope, 'test-secret')).toThrow();
  });
  it('rejects an expired snapshot so traversal can restart without silently skipping rows', () => {
    const cutoff = new Date(Date.now() - 16 * 60_000).toISOString();
    const cursor = encodeConversationCursor(
      { before: cutoff, id: 'older', cutoff },
      'viewer',
      'secret',
    );
    expect(() => decodeConversationCursor(cursor, 'viewer', 'secret')).toThrow('expired');
  });
  it('limits metadata hydration to selected rows and preserves SQL order', async () => {
    const selected = [
      { id: 'b', createdAt: new Date(), unreadCount: 3n },
      { id: 'a', createdAt: new Date(), unreadCount: 0n },
    ];
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue(selected),
      conversation: { findMany: vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]) },
      conversationParticipant: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new ConversationsRepository(prisma as unknown as PrismaService);
    const result = await repository.findPageForUser('viewer', {
      ...conversationPageQuerySchema.parse({ limit: 1 }),
      cutoff: '2026-10-11T00:00:00.000000Z',
    });
    expect(result.hasMore).toBe(true);
    expect(result.rows.map((row) => row.conversation.id)).toEqual(['b']);
    expect(result.rows[0].unreadCount).toBe(3);
    expect(prisma.conversation.findMany.mock.calls[0][0].where.id.in).toEqual(['b']);
    expect(prisma.conversation.findMany.mock.calls[0][0].include.participants.take).toBe(63);
    const sql = prisma.$queryRaw.mock.calls[0][0];
    expect(sql.sql).toContain('v."activityAt" DESC, v."conversationId" DESC');
    expect(sql.sql).not.toContain('"updatedAt" DESC');
  });
  it('hydrates previews, replies and pins before page mapping copies their bodies', async () => {
    const reply = { id: 'reply', body: null as string | null };
    const message = { id: 'm1', body: null as string | null, replyTo: reply };
    const pinned = { id: 'pin', body: null as string | null };
    const conversation = { id: 'c1', messages: [message], pinnedMessages: [{ message: pinned }] };
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'c1', createdAt: new Date(), unreadCount: 0n }]),
      conversation: { findMany: vi.fn().mockResolvedValue([conversation]) },
      conversationParticipant: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new ConversationsRepository(prisma as unknown as PrismaService);
    Object.assign(repository, {
      messageBodies: {
        hydrate: async <T>(value: T): Promise<T> => {
          await Promise.resolve();
          message.body = 'Preview';
          reply.body = 'Reply';
          pinned.body = 'Pinned';
          return value;
        },
      },
    });

    const result = await repository.findPageForUser('viewer', {
      ...conversationPageQuerySchema.parse({ limit: 1 }),
      cutoff: '2026-10-11T00:00:00.000000Z',
    });

    const row = result.rows[0].conversation;
    expect(row.messages[0].body).toBe('Preview');
    expect(row.messages[0].replyTo?.body).toBe('Reply');
    expect(row.pinnedMessages[0].message.body).toBe('Pinned');
    const omit = { bodySearch: true, bodyDigest: true };
    expect(prisma.conversation.findMany.mock.calls[0]).toMatchObject([
      {
        include: {
          messages: {
            omit,
            include: { replyTo: { omit }, forwardedFrom: { omit } },
          },
          pinnedMessages: { include: { message: { omit } } },
        },
      },
    ]);
  });
});
