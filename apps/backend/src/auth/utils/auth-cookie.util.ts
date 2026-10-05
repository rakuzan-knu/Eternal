import type { Request } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export interface CookieResponse {
  cookie?: (name: string, val: string, options?: Record<string, unknown>) => void;
  setCookie?: (name: string, val: string, options?: Record<string, unknown>) => void;
  clearCookie?: (name: string, options?: Record<string, unknown>) => void;
}

export function parseTtlToSeconds(ttl?: string): number {
  if (!ttl) return 7 * 24 * 60 * 60;
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) {
    const asNum = Number(ttl);
    return Number.isNaN(asNum) ? 7 * 24 * 60 * 60 : asNum;
  }
  const val = Number(match[1]);
  const unit = match[2];
  const mult: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };
  return val * (mult[unit] || 1);
}

export function isSecureConnection(req?: Request): boolean {
  if (!req) return process.env.NODE_ENV === 'production';
  const forwardedProtoHeader = req.headers?.['x-forwarded-proto'];
  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader?.split(',')[0];
  return (
    Boolean(req.secure) ||
    forwardedProto?.trim() === 'https' ||
    process.env.NODE_ENV === 'production'
  );
}

export function setRefreshTokenCookie(
  res: CookieResponse | undefined,
  req: Request | undefined,
  refreshToken: string,
  ttlSeconds = 7 * 24 * 60 * 60,
): void {
  if (!res) return;
  const secure = isSecureConnection(req);
  const expires = new Date(Date.now() + ttlSeconds * 1000);

  const options: Record<string, unknown> = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds,
    expires,
  };

  if (typeof res.setCookie === 'function') {
    res.setCookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, options);
  } else if (typeof res.cookie === 'function') {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...options,
      maxAge: ttlSeconds * 1000,
    });
  }
}

export function clearRefreshTokenCookie(res: CookieResponse | undefined, req?: Request): void {
  if (!res) return;
  const secure = isSecureConnection(req);
  const options: Record<string, unknown> = {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  };

  if (typeof res.clearCookie === 'function') {
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, options);
  } else if (typeof res.setCookie === 'function') {
    res.setCookie(REFRESH_TOKEN_COOKIE_NAME, '', {
      ...options,
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

export function extractRefreshToken(req?: Request, bodyToken?: string): string | undefined {
  if (bodyToken && typeof bodyToken === 'string' && bodyToken.trim().length > 0) {
    return bodyToken.trim();
  }
  if (!req) return undefined;
  const cookies = (req as unknown as { cookies?: Record<string, unknown> }).cookies;
  if (cookies && typeof cookies === 'object') {
    const val = cookies[REFRESH_TOKEN_COOKIE_NAME];
    return typeof val === 'string' ? val : undefined;
  }
  return undefined;
}
