import { Test } from '@nestjs/testing';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PendingMediaRepository } from './pending-media.repository';

describe('durable pending media state transitions', () => {
  const rows = {
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const queryRaw = vi.fn<(sql: Prisma.Sql) => Promise<unknown[]>>();
  const privateObjects = { deleteMany: vi.fn() };
  const tx = { pendingMediaObject: rows, privateMediaObject: privateObjects, $queryRaw: queryRaw };
  let pending: PendingMediaRepository;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PendingMediaRepository,
        {
          provide: PrismaService,
          useValue: { ...tx, $transaction: (run: (db: typeof tx) => Promise<unknown>) => run(tx) },
        },
      ],
    }).compile();
    pending = module.get(PendingMediaRepository);
  });

  it('registers before promotion without resetting a prior deletion or retained state', async () => {
    rows.upsert.mockResolvedValue({ ownerId: 'alice', uploadId: 'upload', state: 'PENDING' });
    await pending.register('media/post/key.webp', 'upload', 'alice');
    expect(rows.upsert).toHaveBeenCalledWith({
      where: { key: 'media/post/key.webp' },
      create: { key: 'media/post/key.webp', uploadId: 'upload', ownerId: 'alice' },
      update: {},
    });
    rows.upsert.mockResolvedValue({ ownerId: 'alice', uploadId: 'upload', state: 'DELETING' });
    await expect(pending.register('media/post/key.webp', 'upload', 'alice')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('claims retention atomically and excludes deletion states', async () => {
    rows.updateMany.mockResolvedValue({ count: 1 });
    await pending.retain('key', 'alice', true);
    expect(rows.updateMany).toHaveBeenCalledWith({
      where: { key: 'key', ownerId: 'alice', state: { in: ['PENDING', 'RETAINED'] } },
      data: { state: 'RETAINED' },
    });
    expect(rows.findUnique).not.toHaveBeenCalled();
    rows.updateMany.mockResolvedValue({ count: 0 });
    rows.findUnique.mockResolvedValue({ state: 'DELETING' });
    await expect(pending.retain('key', 'alice', true)).rejects.toMatchObject({ status: 403 });
    rows.findUnique.mockResolvedValue({ state: 'DELETED' });
    await expect(pending.retain('key', 'alice', false)).rejects.toMatchObject({ status: 403 });
  });

  it('allows legacy unregistered objects but fails closed for missing registered objects', async () => {
    rows.updateMany.mockResolvedValue({ count: 0 });
    rows.findUnique.mockResolvedValue(null);
    await expect(pending.retain('legacy', 'alice', false)).resolves.toBeUndefined();
    await expect(pending.retain('registered', 'alice', true)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('rechecks age and state during cleanup claim instead of trusting a stale candidate list', async () => {
    const before = new Date(0);
    rows.updateMany.mockResolvedValue({ count: 0 });
    expect(await pending.claimDeletion('key', before)).toBe(false);
    expect(rows.updateMany).toHaveBeenCalledWith({
      where: {
        key: 'key',
        OR: [{ state: 'PENDING', createdAt: { lt: before } }, { state: 'DELETING' }],
      },
      data: { state: 'DELETING' },
    });
    await pending.deleted('key');
    const deletedAt: unknown = expect.any(Date);
    expect(rows.updateMany).toHaveBeenLastCalledWith({
      where: { key: 'key', state: 'DELETING' },
      data: { state: 'DELETED', deletedAt },
    });
  });

  it('prunes at most 100 old tombstones and rechecks state and age atomically', async () => {
    const before = new Date(0);
    rows.findMany.mockResolvedValue([{ key: 'deleted-key' }]);
    await pending.pruneDeleted(before);
    expect(rows.findMany).toHaveBeenCalledWith({
      where: { state: 'DELETED', deletedAt: { lt: before } },
      orderBy: { deletedAt: 'asc' },
      take: 100,
      select: { key: true },
    });
    expect(rows.deleteMany).toHaveBeenCalledWith({
      where: { key: { in: ['deleted-key'] }, state: 'DELETED', deletedAt: { lt: before } },
    });
    rows.deleteMany.mockClear();
    rows.findMany.mockResolvedValue([]);
    await pending.pruneDeleted(before);
    expect(rows.deleteMany).not.toHaveBeenCalled();
  });

  it('requires the private rollout flag before considering retained orphans', async () => {
    rows.updateMany.mockResolvedValue({ count: 0 });
    expect(await pending.claimDeletion('private-key', new Date(0))).toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();
    queryRaw
      .mockResolvedValueOnce([{ key: 'private-key' }])
      .mockResolvedValueOnce([{ key: 'private-key' }]);
    expect(await pending.claimDeletion('private-key', new Date(0), true)).toBe(true);
    expect(queryRaw).toHaveBeenCalledTimes(2);
    expect(queryRaw.mock.calls[0]?.[0].text).toContain('FOR UPDATE');
    expect(queryRaw.mock.calls[1]?.[0].text).toContain('"thumbnailUrl"');
    expect(queryRaw.mock.calls[1]?.[0].text).toContain('"readyAt" IS NOT NULL');
  });

  it('keeps the locator until successful storage deletion and an atomic tombstone transition', async () => {
    rows.updateMany.mockResolvedValueOnce({ count: 0 });
    await pending.deleted('private-key');
    expect(privateObjects.deleteMany).not.toHaveBeenCalled();
    rows.updateMany.mockResolvedValueOnce({ count: 1 });
    await pending.deleted('private-key');
    expect(privateObjects.deleteMany).toHaveBeenCalledWith({ where: { key: 'private-key' } });
  });
});
