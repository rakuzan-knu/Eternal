import type { Session } from '@prisma/client';

export const SESSIONS_REPOSITORY = Symbol('SESSIONS_REPOSITORY');

export interface CreateSessionData {
  userId: string;
  jti: string;
  deviceName?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface ISessionsRepository {
  create(data: CreateSessionData): Promise<Session>;
  findByJti(jti: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  findByUserAndAgent(userId: string, userAgent: string): Promise<Session | null>;
  updateSession(
    id: string,
    data: Partial<CreateSessionData> & { lastActiveAt?: Date },
  ): Promise<void>;
  listForUser(userId: string): Promise<Session[]>;
  touchByJti(jti: string): Promise<void>;
  touchWithMeta(jti: string, data: Record<string, unknown>): Promise<void>;
  deleteByJti(jti: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  deleteOtherJtis(userId: string, keepJti: string): Promise<string[]>;
}
