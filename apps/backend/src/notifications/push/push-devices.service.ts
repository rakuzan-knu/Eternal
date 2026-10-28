import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { PushDeviceView, RegisterPushDeviceDto } from '@common/contracts';
import type { PushLocale } from './push-copy';

export interface PushTarget {
  userId: string;
  token: string;
  locale: PushLocale;
}

@Injectable()
export class PushDevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    userId: string,
    sessionJti: string | undefined,
    dto: RegisterPushDeviceDto,
  ): Promise<PushDeviceView> {
    const session = sessionJti
      ? await this.prisma.session.findUnique({
          where: { jti: sessionJti },
          select: { userId: true },
        })
      : null;
    const linkedJti = session?.userId === userId ? sessionJti : null;
    const data = {
      userId,
      platform: dto.platform,
      locale: dto.locale,
      sessionJti: linkedJti ?? null,
      lastSeenAt: new Date(),
    };
    const device = await this.prisma.pushDevice.upsert({
      where: { token: dto.token },
      create: { token: dto.token, ...data },
      update: data,
    });
    return {
      token: device.token,
      platform: device.platform === 'ios' ? 'ios' : 'android',
      locale: device.locale === 'uk' ? 'uk' : 'en',
    };
  }

  async remove(userId: string, token: string): Promise<void> {
    await this.prisma.pushDevice.deleteMany({ where: { userId, token } });
  }

  async targets(userIds: readonly string[]): Promise<PushTarget[]> {
    if (!userIds.length) return [];
    const rows = await this.prisma.pushDevice.findMany({
      where: { userId: { in: [...new Set(userIds)] } },
      select: { userId: true, token: true, locale: true },
    });
    return rows.map((row) => ({ ...row, locale: row.locale === 'uk' ? 'uk' : 'en' }));
  }

  async forget(tokens: readonly string[]): Promise<void> {
    if (!tokens.length) return;
    await this.prisma.pushDevice.deleteMany({ where: { token: { in: [...tokens] } } });
  }
}
