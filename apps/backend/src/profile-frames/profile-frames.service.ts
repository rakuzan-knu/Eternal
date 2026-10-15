import { ForbiddenException, Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ProfileFramesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}
  catalog() {
    return this.prisma.profileFrame.findMany({
      orderBy: [{ priceCents: 'asc' }, { slug: 'asc' }],
    });
  }
  async inventory(userId: string) {
    const [user, items] = await this.prisma.$transaction([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { activeProfileFrameId: true },
      }),
      this.prisma.userProfileFrame.findMany({
        where: { userId },
        include: { profileFrame: true },
        orderBy: { purchasedAt: 'desc' },
      }),
    ]);
    return {
      activeProfileFrameId: user.activeProfileFrameId,
      items: items.map(({ profileFrame, purchasedAt }) => ({
        profileFrame,
        purchasedAt: purchasedAt.toISOString(),
      })),
    };
  }
  async equip(userId: string, profileFrameId: string | null) {
    await this.prisma.$transaction(async (tx) => {
      if (profileFrameId !== null) {
        const owned = await tx.userProfileFrame.findUnique({
          where: { userId_profileFrameId: { userId, profileFrameId } },
        });
        if (!owned) throw new ForbiddenException('ProfileFrame not owned');
      }
      await tx.user.update({
        where: { id: userId },
        data: { activeProfileFrameId: profileFrameId },
      });
    });
    await this.redis.del(`user:${userId}`);
    const inv = await this.inventory(userId);
    const activeItem =
      inv.items.find((i) => i.profileFrame.id === profileFrameId)?.profileFrame ?? null;
    this.eventEmitter?.emit('user.customization.updated', {
      userId,
      activeProfileFrameId: profileFrameId,
      activeProfileFrame: activeItem,
    });
    return inv;
  }
}
