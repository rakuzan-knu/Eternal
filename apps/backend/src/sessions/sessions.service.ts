import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import { RedisService } from '../redis/redis.service';
import {
  SESSIONS_REPOSITORY,
  type CreateSessionData,
  type ISessionsRepository,
} from './interfaces/sessions-repository.interface';
import { type SessionViewDto } from '@common/contracts';

export interface RequestMeta {
  userAgent?: string | null;
  ip?: string | null;
}

@Injectable()
export class SessionsService {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessionsRepo: ISessionsRepository,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, jti: string, meta: RequestMeta): Promise<void> {
    return this.redisService.withLock(`lock:session:create:${userId}`, async () => {
      const deviceName = this.parseDeviceName(meta.userAgent);
      const normalizedIp = this.normalizeIp(meta.ip);
      const geo = this.lookupGeo(meta.ip);

      // If user already has an active session from the same browser/device, update it
      if (meta.userAgent) {
        const existing = await this.sessionsRepo.findByUserAndAgent(userId, meta.userAgent);

        if (existing) {
          await this.sessionsRepo.updateSession(existing.id, {
            jti,
            deviceName: deviceName ?? existing.deviceName,
            ip: normalizedIp ?? existing.ip,
            city: geo.city ?? existing.city,
            country: geo.country ?? existing.country,
            lastActiveAt: new Date(),
          });
          return;
        }
      }

      const data: CreateSessionData = {
        userId,
        jti,
        deviceName,
        userAgent: meta.userAgent ?? null,
        ...geo,
        ip: normalizedIp,
      };
      await this.sessionsRepo.create(data);
    });
  }

  async touch(jti: string, meta?: RequestMeta): Promise<void> {
    const data: Record<string, unknown> = { lastActiveAt: new Date() };
    if (meta?.ip) {
      const normalizedIp = this.normalizeIp(meta.ip);
      const geo = this.lookupGeo(meta.ip);
      if (normalizedIp) data.ip = normalizedIp;
      if (geo.city) data.city = geo.city;
      if (geo.country) data.country = geo.country;
    }
    await this.sessionsRepo.touchWithMeta(jti, data);
  }

  deleteByJti(jti: string): Promise<void> {
    return this.sessionsRepo.deleteByJti(jti);
  }

  revokeOthers(userId: string, keepJti: string): Promise<string[]> {
    return this.sessionsRepo.deleteOtherJtis(userId, keepJti);
  }

  async listForUser(userId: string, currentJti?: string): Promise<SessionViewDto[]> {
    const rows = await this.sessionsRepo.listForUser(userId);
    return rows.map((row) => ({
      id: row.id,
      deviceName: row.deviceName,
      ip: row.ip,
      city: row.city,
      country: row.country,
      createdAt: row.createdAt,
      lastActiveAt: row.lastActiveAt,
      isCurrent: !!currentJti && row.jti === currentJti,
    }));
  }

  async revokeById(userId: string, sessionId: string): Promise<string> {
    const row = await this.sessionsRepo.findById(sessionId);
    if (!row) throw new NotFoundException('Session not found');
    if (row.userId !== userId) throw new ForbiddenException('Not your session');
    await this.sessionsRepo.deleteById(sessionId);
    return row.jti;
  }

  private parseDeviceName(userAgent?: string | null): string | null {
    if (!userAgent) return null;
    const parsed = UAParser(userAgent);
    const browser = parsed.browser.name;
    const os = parsed.os.name;
    if (browser && os) return `${browser} on ${os}`;
    return browser ?? os ?? null;
  }

  private normalizeIp(ip?: string | null): string | null {
    if (!ip) return null;
    return ip.replace(/^::ffff:/, '');
  }

  private lookupGeo(ip?: string | null): { city: string | null; country: string | null } {
    const clean = this.normalizeIp(ip);
    if (!clean) return { city: null, country: null };
    const geo = geoip.lookup(clean);
    if (!geo) return { city: null, country: null };
    return { city: geo.city || null, country: geo.country || null };
  }
}
