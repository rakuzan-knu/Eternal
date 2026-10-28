import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { ReelsRepository } from '../repositories/reels.repository';

function setup() {
  const tx = {
    reel: { findFirst: vi.fn().mockResolvedValue({ id: 'reel' }) },
    savedReel: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(1),
    },
  };
  const prisma = {
    reel: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
    savedReel: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(async (run: (transaction: typeof tx) => unknown) => run(tx)),
  };
  return { tx, prisma, repo: new ReelsRepository(prisma as unknown as PrismaService) };
}

const authorVisibility = {
  blockedUsers: { none: { blockedId: 'viewer' } },
  blockedByUsers: { none: { blockerId: 'viewer' } },
  OR: [
    { id: 'viewer' },
    { isPrivate: false },
    { followers: { some: { followerId: 'viewer', status: 'ACCEPTED' } } },
  ],
};

describe('ReelsRepository authorization and saved persistence', () => {
  it('applies both block directions and private/accepted follower access consistently', async () => {
    const { repo, prisma, tx } = setup();
    await repo.findAllPaginated(11, undefined, 'viewer');
    await repo.findByUserId('author', 11, undefined, 'viewer');
    await repo.findById('reel', 'viewer');
    await repo.findSaved('viewer', 11);
    await repo.setSaved('reel', 'viewer', true);
    for (const call of prisma.reel.findMany.mock.calls) {
      expect(call[0]).toMatchObject({ where: { author: authorVisibility } });
    }
    expect(prisma.reel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reel', author: authorVisibility } }),
    );
    expect(prisma.savedReel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'viewer', reel: { author: authorVisibility } } }),
    );
    expect(tx.reel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reel', author: authorVisibility } }),
    );
  });

  it('excludes many hidden reels and an entire hidden author in SQL before the page limit', async () => {
    const { repo, prisma } = setup();
    const reelIds = Array.from({ length: 40 }, (_, index) => `hidden-${index}`);
    await repo.findAllPaginated(11, 'cursor', 'viewer', { reelIds, authorIds: ['hidden-author'] });
    expect(prisma.reel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        skip: 1,
        cursor: { id: 'cursor' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        where: {
          author: authorVisibility,
          id: { notIn: reelIds },
          authorId: { notIn: ['hidden-author'] },
        },
      }),
    );
  });

  it('anonymous viewers can only read public authors', async () => {
    const { repo, prisma } = setup();
    await repo.findById('reel');
    expect(prisma.reel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'reel', author: { isPrivate: false } } }),
    );
  });

  it('saving twice remains saved and safely ignores concurrent duplicate inserts', async () => {
    const { repo, tx } = setup();
    await expect(repo.setSaved('reel', 'viewer', true)).resolves.toEqual({
      saved: true,
      savedCount: 1,
    });
    await expect(repo.setSaved('reel', 'viewer', true)).resolves.toEqual({
      saved: true,
      savedCount: 1,
    });
    expect(tx.savedReel.createMany).toHaveBeenCalledWith({
      data: [{ reelId: 'reel', userId: 'viewer' }],
      skipDuplicates: true,
    });
    expect(tx.savedReel.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects inaccessible or missing reels before inserting a save', async () => {
    const { repo, tx } = setup();
    tx.reel.findFirst.mockResolvedValue(null);
    await expect(repo.setSaved('reel', 'viewer', true)).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.savedReel.createMany).not.toHaveBeenCalled();
  });

  it('unsaving remains idempotent after access is revoked and redacts inaccessible counts', async () => {
    const { repo, tx } = setup();
    tx.reel.findFirst.mockResolvedValue(null);
    tx.savedReel.count.mockResolvedValue(123);
    for (let i = 0; i < 2; i++)
      await expect(repo.setSaved('reel', 'viewer', false)).resolves.toEqual({
        saved: false,
        savedCount: 0,
      });
    expect(tx.savedReel.count).not.toHaveBeenCalled();
    expect(tx.savedReel.deleteMany).toHaveBeenCalledWith({
      where: { reelId: 'reel', userId: 'viewer' },
    });
  });

  it('rejects missing or another owner�s cursor without reading saved content', async () => {
    const { repo, prisma } = setup();
    await expect(repo.findSaved('viewer', 11, 'foreign')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.savedReel.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', userId: 'viewer' },
      select: { id: true, createdAt: true },
    });
    expect(prisma.savedReel.findMany).not.toHaveBeenCalled();
  });

  it('pages by saved time with an id tie-breaker, retaining the visibility predicate', async () => {
    const { repo, prisma } = setup();
    const createdAt = new Date('2026-10-21T12:00:00Z');
    prisma.savedReel.findFirst.mockResolvedValue({ id: 'saved-row', createdAt });
    await repo.findSaved('viewer', 11, 'saved-row');
    expect(prisma.savedReel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        where: {
          userId: 'viewer',
          reel: { author: authorVisibility },
          OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: 'saved-row' } }],
        },
      }),
    );
  });
});
