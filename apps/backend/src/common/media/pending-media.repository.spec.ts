import { Test } from '@nestjs/testing';
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
  let pending: PendingMediaRepository;
  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PendingMediaRepository,
        { provide: PrismaService, useValue: { pendingMediaObject: rows } },
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
});
