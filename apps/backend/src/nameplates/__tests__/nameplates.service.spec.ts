import { ForbiddenException } from '@nestjs/common';
import { NameplatesService } from '../nameplates.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { RedisService } from '../../redis/redis.service';

describe('Nameplate ownership', () => {
  const tx = { userNameplate: { findUnique: vi.fn() }, user: { update: vi.fn() } };
  const redis = { del: vi.fn() };
  const prisma = {
    $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  const service = new NameplatesService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service, 'inventory').mockResolvedValue({ activeNameplateId: null, items: [] });
  });
  it('rejects an item owned only by somebody else', async () => {
    tx.userNameplate.findUnique.mockResolvedValue(null);
    await expect(service.equip('bob', 'alice-plate')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.userNameplate.findUnique).toHaveBeenCalledWith({
      where: { userId_nameplateId: { userId: 'bob', nameplateId: 'alice-plate' } },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });
  it('equips an owned plate without replacing the avatar frame', async () => {
    tx.userNameplate.findUnique.mockResolvedValue({ userId: 'alice', nameplateId: 'plate' });
    await service.equip('alice', 'plate');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeNameplateId: 'plate' },
    });
    expect(redis.del).toHaveBeenCalledWith('user:alice');
  });
  it('removes the plate without granting or revoking inventory', async () => {
    await service.equip('alice', null);
    expect(tx.userNameplate.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeNameplateId: null },
    });
  });
});
