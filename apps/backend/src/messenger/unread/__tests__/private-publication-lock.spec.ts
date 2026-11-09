import { Test } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { withUnreadWriteLock } from '../unread-write-lock';

describe('private attachment publication fence', () => {
  const first = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  const query = vi.fn();
  let prisma: PrismaService;

  beforeEach(async () => {
    vi.resetAllMocks();
    const tx = { $queryRaw: query };
    const module = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: {
            $transaction: (run: (db: typeof tx) => Promise<unknown>) => run(tx),
          },
        },
      ],
    }).compile();
    prisma = module.get(PrismaService);
  });

  it('locks thumbnail and forwarded references in key order before checking readiness and writing', async () => {
    const events: string[] = [];
    query.mockImplementation(async (sql: Prisma.Sql) => {
      if (sql.text.includes('FOR UPDATE OF p')) {
        events.push('lock');
        expect(sql.text).toContain('ORDER BY p.key');
        expect(sql.values).toEqual([second, first]);
        return [];
      }
      events.push('ready');
      return [{ id: first }, { id: second }];
    });
    const result = await withUnreadWriteLock(
      prisma,
      {
        conversationIds: [],
        attachmentUrls: [
          `private-media://${second}`,
          `private-media://${first}`,
          `private-media://${second}`,
        ],
      },
      async () => {
        events.push('write');
        return 'published';
      },
    );
    expect(result).toBe('published');
    expect(events).toEqual(['lock', 'ready', 'write']);
  });

  it('fails closed after cleanup wins, without executing a domain write', async () => {
    query.mockResolvedValue([]);
    const write = vi.fn();
    await expect(
      withUnreadWriteLock(
        prisma,
        {
          conversationIds: [],
          attachmentUrls: [`private-media://${first}`],
        },
        write,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(write).not.toHaveBeenCalled();
  });
});
