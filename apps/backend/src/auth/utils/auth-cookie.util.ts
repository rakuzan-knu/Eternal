import type { Request } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
export const HOST_REFRESH_TOKEN_COOKIE_NAME = '__Host-refreshToken';

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

export function getCookieOptions(
  req?: Request,
  ttlSeconds = 7 * 24 * 60 * 60,
): Record<string, unknown> {
  const secure = isSecureConnection(req);
  const domain = process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN.trim() : undefined;
  const sameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || 'lax';
  const expires = new Date(Date.now() + ttlSeconds * 1000);

  const options: Record<string, unknown> = {
    httpOnly: true,
    secure: sameSite === 'none' ? true : secure,
    sameSite,
    path: '/',
    maxAge: ttlSeconds,
    expires,
  };

  if (domain) {
    options.domain = domain;
  }

  return options;
}

export function setRefreshTokenCookie(
  res: CookieResponse | undefined,
  req: Request | undefined,
  refreshToken: string,
  ttlSeconds = 7 * 24 * 60 * 60,
): void {
  if (!res) return;
  const options = getCookieOptions(req, ttlSeconds);
  const cookieName = process.env.COOKIE_NAME || REFRESH_TOKEN_COOKIE_NAME;

  if (typeof res.setCookie === 'function') {
    res.setCookie(cookieName, refreshToken, options);
  } else if (typeof res.cookie === 'function') {
    res.cookie(cookieName, refreshToken, {
      ...options,
      maxAge: ttlSeconds * 1000,
    });
  }
}

export function clearRefreshTokenCookie(res: CookieResponse | undefined, req?: Request): void {
  if (!res) return;
  const options = getCookieOptions(req, 0);
  delete options.expires;
  delete options.maxAge;

  const namesToClear = Array.from(
    new Set([
      process.env.COOKIE_NAME || REFRESH_TOKEN_COOKIE_NAME,
      REFRESH_TOKEN_COOKIE_NAME,
      HOST_REFRESH_TOKEN_COOKIE_NAME,
    ]),
  );

  for (const name of namesToClear) {
    if (typeof res.clearCookie === 'function') {
      res.clearCookie(name, options);
    } else if (typeof res.setCookie === 'function') {
      res.setCookie(name, '', {
        ...options,
        maxAge: 0,
        expires: new Date(0),
      });
    }
  }
}

export function extractRefreshToken(req?: Request, bodyToken?: string): string | undefined {
  if (bodyToken && typeof bodyToken === 'string' && bodyToken.trim().length > 0) {
    return bodyToken.trim();
  }
  if (!req) return undefined;
  const cookies = (req as unknown as { cookies?: Record<string, unknown> }).cookies;
  if (cookies && typeof cookies === 'object') {
    const configuredName = process.env.COOKIE_NAME;
    const val =
      (configuredName ? cookies[configuredName] : undefined) ||
      cookies[HOST_REFRESH_TOKEN_COOKIE_NAME] ||
      cookies[REFRESH_TOKEN_COOKIE_NAME];
    return typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined;
  }
  return undefined;
}
