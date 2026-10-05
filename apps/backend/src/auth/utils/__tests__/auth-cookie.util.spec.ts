import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import {
  clearRefreshTokenCookie,
  extractRefreshToken,
  isSecureConnection,
  parseTtlToSeconds,
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
} from '../auth-cookie.util';

describe('auth-cookie.util', () => {
  it('parses TTL string formats correctly', () => {
    expect(parseTtlToSeconds('60s')).toBe(60);
    expect(parseTtlToSeconds('15m')).toBe(900);
    expect(parseTtlToSeconds('24h')).toBe(86400);
    expect(parseTtlToSeconds('7d')).toBe(604800);
    expect(parseTtlToSeconds('30d')).toBe(2592000);
    expect(parseTtlToSeconds(undefined)).toBe(604800);
    expect(parseTtlToSeconds('3600')).toBe(3600);
  });

  it('determines secure connection based on req properties and forwarded headers', () => {
    expect(isSecureConnection({ secure: true } as Request)).toBe(true);
    expect(
      isSecureConnection({
        headers: { 'x-forwarded-proto': 'https' },
      } as unknown as Request),
    ).toBe(true);
    expect(
      isSecureConnection({
        headers: { 'x-forwarded-proto': 'http' },
      } as unknown as Request),
    ).toBe(false);
  });

  it('sets cookie via setCookie method on Fastify reply', () => {
    const mockReply = {
      setCookie: vi.fn(),
    };
    const mockReq = { secure: true } as Request;

    setRefreshTokenCookie(mockReply, mockReq, 'token-123', 3600);

    expect(mockReply.setCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE_NAME,
      'token-123',
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600,
      }),
    );
  });

  it('sets cookie via cookie method on Express response with millisecond maxAge', () => {
    const mockRes = {
      cookie: vi.fn(),
    };
    const mockReq = { secure: false } as Request;

    setRefreshTokenCookie(mockRes, mockReq, 'token-abc', 3600);

    expect(mockRes.cookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE_NAME,
      'token-abc',
      expect.objectContaining({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 3600 * 1000,
      }),
    );
  });

  it('clears cookie via clearCookie method', () => {
    const mockRes = {
      clearCookie: vi.fn(),
    };

    clearRefreshTokenCookie(mockRes);

    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      REFRESH_TOKEN_COOKIE_NAME,
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('extracts token preferentially from body then cookies', () => {
    const mockReqWithCookies = {
      cookies: {
        refreshToken: 'cookie-token',
      },
    } as unknown as Request;

    // Body token takes priority
    expect(extractRefreshToken(mockReqWithCookies, 'body-token')).toBe('body-token');

    // Falls back to cookie
    expect(extractRefreshToken(mockReqWithCookies, undefined)).toBe('cookie-token');
    expect(extractRefreshToken(mockReqWithCookies, '')).toBe('cookie-token');

    // Returns undefined if neither exists
    expect(extractRefreshToken({ cookies: {} } as unknown as Request)).toBeUndefined();
  });
});
