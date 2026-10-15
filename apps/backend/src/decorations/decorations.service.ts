import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DecorationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  catalog() {
    return this.prisma.avatarDecoration.findMany({
      orderBy: [{ priceCents: 'asc' }, { slug: 'asc' }],
    });
  }

  async inventory(userId: string) {
    const [user, items] = await this.prisma.$transaction([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { activeDecorationId: true },
      }),
      this.prisma.userDecoration.findMany({
        where: { userId },
        include: { decoration: true },
        orderBy: { purchasedAt: 'desc' },
      }),
    ]);
    return {
      activeDecorationId: user.activeDecorationId,
      items: items.map(({ decoration, purchasedAt }) => ({
        decoration,
        purchasedAt: purchasedAt.toISOString(),
      })),
    };
  }

  claimFree(userId: string, decorationId: string): Promise<never> {
    // Legacy URL stays fail-closed, including zero-price catalog mistakes.
    void userId;
    void decorationId;
    return Promise.reject(new ForbiddenException('Decoration grants require verified payment'));
  }

  async equip(userId: string, decorationId: string | null) {
    await this.prisma.$transaction(async (tx) => {
      if (decorationId !== null) {
        const owned = await tx.userDecoration.findUnique({
          where: { userId_decorationId: { userId, decorationId } },
        });
        if (!owned) throw new ForbiddenException('Decoration not owned');
      }
      await tx.user.update({ where: { id: userId }, data: { activeDecorationId: decorationId } });
    });
    await this.redis.del(`user:${userId}`);
    if (typeof (this.redis as any).delByPattern === 'function') {
      await (this.redis as any).delByPattern('friends:*');
    }
    const inv = await this.inventory(userId);
    const activeItem = inv.items.find((i) => i.decoration.id === decorationId)?.decoration ?? null;
    this.eventEmitter?.emit('user.customization.updated', {
      userId,
      activeDecorationId: decorationId,
      activeDecoration: activeItem,
    });
    return inv;
  }
}
