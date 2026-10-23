import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MediaAccessRepository } from './media-access.repository';

describe('media publication access transaction', () => {
  const query = vi.fn<(sql: Prisma.Sql) => Promise<{ id: string }[]>>();
  const findConversation = vi.fn();
  const tx = { $queryRaw: query, conversation: { findFirst: findConversation } };
  const transaction =
    vi.fn<(operation: (client: typeof tx) => Promise<unknown>) => Promise<unknown>>();
  let repository: MediaAccessRepository;

  beforeEach(async () => {
    vi.resetAllMocks();
    query.mockResolvedValue([{ id: 'community' }]);
    findConversation.mockResolvedValue({
      type: 'GROUP',
      communityChannel: { isPrivate: false, archivedAt: null },
      participants: [{ userId: 'alice', role: 'MEMBER', permissions: 0 }],
    });
    transaction.mockImplementation(async (operation) => operation(tx));
    const module = await Test.createTestingModule({
      providers: [
        MediaAccessRepository,
        { provide: PrismaService, useValue: { $transaction: transaction } },
      ],
    }).compile();
    repository = module.get(MediaAccessRepository);
  });

  it('locks the community before rechecking access and waits for promotion before committing', async () => {
    let release!: () => void;
    const promotion = new Promise<void>((resolve) => {
      release = resolve;
    });
    let published = false;
    const publish = vi.fn(async (signal: AbortSignal) => {
      expect(signal.aborted).toBe(false);
      expect(query).toHaveBeenCalledTimes(1);
      expect(findConversation).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0].text).toContain('FOR SHARE OF c');
      expect(query.mock.calls[0][0].values).toEqual(['conversation']);
      await promotion;
      published = true;
      return 'receipt';
    });
    const result = repository.withUploadPublication('conversation', 'alice', false, publish);
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    expect(published).toBe(false);
    release();
    await expect(result).resolves.toBe('receipt');
    expect(published).toBe(true);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 20_000 });
  });

  it.each(['private', 'revoked', 'archived'])(
    'rejects publication when the channel became %s while staging was validated',
    async (change) => {
      findConversation.mockResolvedValue(
        change === 'revoked'
          ? null
          : {
              type: 'GROUP',
              communityChannel: {
                isPrivate: change === 'private',
                archivedAt: change === 'archived' ? new Date() : null,
              },
              participants: [{ userId: 'alice', role: 'MEMBER', permissions: 0 }],
            },
      );
      const publish = vi.fn();
      await expect(
        repository.withUploadPublication('conversation', 'alice', false, publish),
      ).rejects.toThrow();
      expect(publish).not.toHaveBeenCalled();
    },
  );

  it('does not retry an external storage effect when promotion fails', async () => {
    const publish = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    await expect(
      repository.withUploadPublication('conversation', 'alice', false, publish),
    ).rejects.toThrow('storage unavailable');
    expect(publish).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
