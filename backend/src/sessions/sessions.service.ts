import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import {
  SESSIONS_REPOSITORY,
  type CreateSessionData,
  type ISessionsRepository,
} from './interfaces/sessions-repository.interface';
import { SessionViewDto } from './dto/session-view.dto';

export interface RequestMeta {
  userAgent?: string | null;
  ip?: string | null;
}

@Injectable()
export class SessionsService {
  constructor(
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessionsRepo: ISessionsRepository,
  ) {}

  async create(userId: string, jti: string, meta: RequestMeta): Promise<void> {
    const data: CreateSessionData = {
      userId,
      jti,
      deviceName: this.parseDeviceName(meta.userAgent),
      userAgent: meta.userAgent ?? null,
      ...this.lookupGeo(meta.ip),
      ip: this.normalizeIp(meta.ip),
    };
    await this.sessionsRepo.create(data);
  }

  touch(jti: string): Promise<void> {
    return this.sessionsRepo.touchByJti(jti);
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
