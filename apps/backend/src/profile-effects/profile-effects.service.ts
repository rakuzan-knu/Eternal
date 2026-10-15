import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ProfileEffectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}
  catalog() {
    return this.prisma.profileEffect.findMany({
      orderBy: [{ priceCents: 'asc' }, { slug: 'asc' }],
    });
  }
  async inventory(userId: string) {
    const [user, items] = await this.prisma.$transaction([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { activeProfileEffectId: true },
      }),
      this.prisma.userProfileEffect.findMany({
        where: { userId },
        include: { profileEffect: true },
        orderBy: { purchasedAt: 'desc' },
      }),
    ]);
    return {
      activeProfileEffectId: user.activeProfileEffectId,
      items: items.map(({ profileEffect, purchasedAt }) => ({
        profileEffect,
        purchasedAt: purchasedAt.toISOString(),
      })),
    };
  }
  async equip(userId: string, profileEffectId: string | null) {
    await this.prisma.$transaction(async (tx) => {
      if (profileEffectId !== null) {
        const owned = await tx.userProfileEffect.findUnique({
          where: { userId_profileEffectId: { userId, profileEffectId } },
        });
        if (!owned) throw new ForbiddenException('ProfileEffect not owned');
      }
      await tx.user.update({
        where: { id: userId },
        data: { activeProfileEffectId: profileEffectId },
      });
    });
    await this.redis.del(`user:${userId}`);
    const inv = await this.inventory(userId);
    const activeItem =
      inv.items.find((i) => i.profileEffect.id === profileEffectId)?.profileEffect ?? null;
    this.eventEmitter?.emit('user.customization.updated', {
      userId,
      activeProfileEffectId: profileEffectId,
      activeProfileEffect: activeItem,
    });
    return inv;
  }
}
