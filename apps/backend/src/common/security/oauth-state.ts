import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import type { RedisService } from '../../redis/redis.service';
import type { Response } from 'express';

interface OAuthState {
  userId: string;
  provider: string;
  redirectUri?: string;
}

export async function issueOAuthState(
  redis: RedisService,
  provider: string,
  userId: string,
  redirectUri?: string,
): Promise<string> {
  if (!userId || !/^[a-z]+$/.test(provider))
    throw new UnauthorizedException('Authentication required');
  const state = `${provider}:${randomBytes(32).toString('hex')}`;
  // Security state must never use the Redis service's process-local fallback.
  const stored = await redis
    .getClient()
    .set(
      `oauth-state:${state}`,
      JSON.stringify({ provider, userId, redirectUri }),
      'EX',
      600,
      'NX',
    );
  if (stored !== 'OK') throw new UnauthorizedException('Unable to store OAuth state');
  return state;
}

export async function consumeOAuthState(
  redis: RedisService,
  provider: string,
  state?: string,
  expectedUserId?: string,
  browserState?: string,
): Promise<OAuthState> {
  const effectiveBrowserState = browserState ? decryptOAuthState(browserState) : undefined;
  if (
    !/^[a-z]+$/.test(provider) ||
    !state ||
    !new RegExp(`^${provider}:[a-f0-9]{64}$`).test(state) ||
    (!expectedUserId && effectiveBrowserState !== state)
  ) {
    throw new UnauthorizedException('Invalid OAuth state');
  }
  const client = redis.getClient();
  const key = `oauth-state:${state}`;
  const raw = await client.get(key);
  if (typeof raw !== 'string')
    throw new UnauthorizedException('Expired, mismatched or reused OAuth state');
  let data: OAuthState;
  try {
    data = JSON.parse(raw) as OAuthState;
  } catch {
    throw new UnauthorizedException('Invalid OAuth state');
  }
  if (
    !data ||
    data.provider !== provider ||
    typeof data.userId !== 'string' ||
    !data.userId ||
    (expectedUserId && data.userId !== expectedUserId)
  ) {
    throw new UnauthorizedException('Expired, mismatched or reused OAuth state');
  }
  // Compare-and-delete makes verification and consumption safe under concurrent callbacks.
  const consumed = await client.eval(
    `
    if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
    redis.call('DEL', KEYS[1])
    return 1
  `,
    1,
    key,
    raw,
  );
  if (consumed !== 1) throw new UnauthorizedException('Expired, mismatched or reused OAuth state');
  return data;
}

function getOAuthEncryptionKey(): Buffer {
  const secret =
    process.env.COOKIE_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    'eternal-oauth-cookie-secure-fallback-key';
  return createHash('sha256').update(secret).digest();
}

export function encryptOAuthState(state: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getOAuthEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(state, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptOAuthState(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  if (/^[a-z]+:[a-f0-9]{64}$/.test(raw)) {
    return raw;
  }
  const parts = raw.split(':');
  if (parts.length === 3) {
    try {
      const [ivHex, tagHex, dataHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = createDecipheriv('aes-256-gcm', getOAuthEncryptionKey(), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(Buffer.from(dataHex, 'hex')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return raw;
    }
  }
  return raw;
}

export function setOAuthCookie(res: Response, provider: string, state: string): void {
  const secure = process.env.NODE_ENV === 'production';
  const encryptedState = encryptOAuthState(state);
  const reply = res as Response & {
    setCookie?: (name: string, value: string, options: Record<string, unknown>) => void;
  };
  if (reply.setCookie) {
    reply.setCookie(`${provider}_oauth_state`, encryptedState, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
  } else {
    res.cookie(`${provider}_oauth_state`, encryptedState, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 600000,
    });
  }
}

export function readOAuthCookieState(
  req: { cookies?: Record<string, string> },
  provider: string,
): string | undefined {
  const raw = req?.cookies?.[`${provider}_oauth_state`];
  if (!raw) return undefined;
  return decryptOAuthState(raw);
}
