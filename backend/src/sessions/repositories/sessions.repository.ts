import { Injectable } from '@nestjs/common';
import type { Session } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type {
  CreateSessionData,
  ISessionsRepository,
} from '../interfaces/sessions-repository.interface';

@Injectable()
export class SessionsRepository implements ISessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSessionData): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        jti: data.jti,
        deviceName: data.deviceName ?? null,
        userAgent: data.userAgent ?? null,
        ip: data.ip ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
      },
    });
  }

  findByJti(jti: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { jti } });
  }

  findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id } });
  }

  listForUser(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  async touchByJti(jti: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { jti },
      data: { lastActiveAt: new Date() },
    });
  }

  async deleteByJti(jti: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { jti } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id } });
  }

  async deleteOtherJtis(userId: string, keepJti: string): Promise<string[]> {
    const rows = await this.prisma.session.findMany({
      where: { userId, jti: { not: keepJti } },
      select: { jti: true },
    });
    await this.prisma.session.deleteMany({
      where: { userId, jti: { not: keepJti } },
    });
    return rows.map((r: { jti: string }) => r.jti);
  }
}
