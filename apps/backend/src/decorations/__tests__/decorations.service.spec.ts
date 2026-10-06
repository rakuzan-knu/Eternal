import { ForbiddenException } from '@nestjs/common';
import { DecorationsService } from '../decorations.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { RedisService } from '../../redis/redis.service';

describe('Decoration ownership boundary', () => {
  const tx = {
    avatarDecoration: { findUnique: vi.fn() },
    userDecoration: { findUnique: vi.fn(), upsert: vi.fn() },
    user: { update: vi.fn() },
  };
  const redis = { del: vi.fn() };
  const prisma = {
    $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  const service = new DecorationsService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service, 'inventory').mockResolvedValue({ activeDecorationId: null, items: [] });
  });
  it('rejects claiming a paid item even if the caller supplies its valid id', async () => {
    tx.avatarDecoration.findUnique.mockResolvedValue({ isAvailable: true, priceCents: 599 });
    await expect(service.claimFree('alice', 'paid-frame')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.userDecoration.upsert).not.toHaveBeenCalled();
  });
  it('rejects unavailable items', async () => {
    tx.avatarDecoration.findUnique.mockResolvedValue({ isAvailable: false, priceCents: 0 });
    await expect(service.claimFree('alice', 'retired-frame')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('rejects free claims even if a catalog item is accidentally priced at zero', async () => {
    tx.avatarDecoration.findUnique.mockResolvedValue({ isAvailable: true, priceCents: 0 });
    await expect(service.claimFree('alice', 'free-frame')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(tx.userDecoration.upsert).not.toHaveBeenCalled();
  });
  it('never equips an item owned only by another account', async () => {
    tx.userDecoration.findUnique.mockResolvedValue(null);
    await expect(service.equip('bob', 'alice-frame')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('equips an owned item and invalidates cached profile data', async () => {
    tx.userDecoration.findUnique.mockResolvedValue({ userId: 'alice' });
    await service.equip('alice', 'frame');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeDecorationId: 'frame' },
    });
    expect(redis.del).toHaveBeenCalledWith('user:alice');
  });
  it('can remove a frame without granting inventory', async () => {
    await service.equip('alice', null);
    expect(tx.userDecoration.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeDecorationId: null },
    });
  });
});
