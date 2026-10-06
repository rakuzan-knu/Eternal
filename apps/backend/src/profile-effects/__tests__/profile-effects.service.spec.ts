import { ForbiddenException } from '@nestjs/common';
import { ProfileEffectsService } from '../profile-effects.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { RedisService } from '../../redis/redis.service';

describe('ProfileEffect ownership', () => {
  const tx = { userProfileEffect: { findUnique: vi.fn() }, user: { update: vi.fn() } };
  const redis = { del: vi.fn() };
  const prisma = {
    $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  const service = new ProfileEffectsService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service, 'inventory').mockResolvedValue({ activeProfileEffectId: null, items: [] });
  });
  it('rejects an item owned only by somebody else', async () => {
    tx.userProfileEffect.findUnique.mockResolvedValue(null);
    await expect(service.equip('bob', 'alice-plate')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.userProfileEffect.findUnique).toHaveBeenCalledWith({
      where: { userId_profileEffectId: { userId: 'bob', profileEffectId: 'alice-plate' } },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });
  it('equips an owned plate without replacing the avatar frame', async () => {
    tx.userProfileEffect.findUnique.mockResolvedValue({
      userId: 'alice',
      profileEffectId: 'plate',
    });
    await service.equip('alice', 'plate');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeProfileEffectId: 'plate' },
    });
    expect(redis.del).toHaveBeenCalledWith('user:alice');
  });
  it('removes the plate without granting or revoking inventory', async () => {
    await service.equip('alice', null);
    expect(tx.userProfileEffect.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeProfileEffectId: null },
    });
  });
});
