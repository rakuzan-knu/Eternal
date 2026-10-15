import { ForbiddenException } from '@nestjs/common';
import { ProfileFramesService } from '../profile-frames.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { RedisService } from '../../redis/redis.service';

describe('ProfileFrame ownership', () => {
  const tx = { userProfileFrame: { findUnique: vi.fn() }, user: { update: vi.fn() } };
  const redis = { del: vi.fn() };
  const prisma = {
    $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)),
  };
  const service = new ProfileFramesService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
  );
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service, 'inventory').mockResolvedValue({ activeProfileFrameId: null, items: [] });
  });
  it('rejects an item owned only by somebody else', async () => {
    tx.userProfileFrame.findUnique.mockResolvedValue(null);
    await expect(service.equip('bob', 'alice-frame')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.userProfileFrame.findUnique).toHaveBeenCalledWith({
      where: { userId_profileFrameId: { userId: 'bob', profileFrameId: 'alice-frame' } },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });
  it('equips an owned frame without replacing the avatar frame', async () => {
    tx.userProfileFrame.findUnique.mockResolvedValue({
      userId: 'alice',
      profileFrameId: 'frame',
    });
    await service.equip('alice', 'frame');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeProfileFrameId: 'frame' },
    });
    expect(redis.del).toHaveBeenCalledWith('user:alice');
  });
  it('removes the frame without granting or revoking inventory', async () => {
    await service.equip('alice', null);
    expect(tx.userProfileFrame.findUnique).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'alice' },
      data: { activeProfileFrameId: null },
    });
  });
});
