import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class NameplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}
  catalog() {
    return this.prisma.nameplate.findMany({ orderBy: [{ priceCents: 'asc' }, { slug: 'asc' }] });
  }
  async inventory(userId: string) {
    const [user, items] = await this.prisma.$transaction([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { activeNameplateId: true },
      }),
      this.prisma.userNameplate.findMany({
        where: { userId },
        include: { nameplate: true },
        orderBy: { purchasedAt: 'desc' },
      }),
    ]);
    return {
      activeNameplateId: user.activeNameplateId,
      items: items.map(({ nameplate, purchasedAt }) => ({
        nameplate,
        purchasedAt: purchasedAt.toISOString(),
      })),
    };
  }
  async equip(userId: string, nameplateId: string | null) {
    await this.prisma.$transaction(async (tx) => {
      if (nameplateId !== null) {
        const owned = await tx.userNameplate.findUnique({
          where: { userId_nameplateId: { userId, nameplateId } },
        });
        if (!owned) throw new ForbiddenException('Nameplate not owned');
      }
      await tx.user.update({ where: { id: userId }, data: { activeNameplateId: nameplateId } });
    });
    await this.redis.del(`user:${userId}`);
    if (typeof (this.redis as any).delByPattern === 'function') {
      await (this.redis as any).delByPattern('friends:*');
    }
    const inv = await this.inventory(userId);
    const activeItem = inv.items.find((i) => i.nameplate.id === nameplateId)?.nameplate ?? null;
    this.eventEmitter?.emit('user.customization.updated', {
      userId,
      activeNameplateId: nameplateId,
      activeNameplate: activeItem,
    });
    return inv;
  }
}
