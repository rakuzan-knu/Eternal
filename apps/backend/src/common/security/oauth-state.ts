import { randomBytes } from 'node:crypto';
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
  if (
    !/^[a-z]+$/.test(provider) ||
    !state ||
    !new RegExp(`^${provider}:[a-f0-9]{64}$`).test(state) ||
    (!expectedUserId && browserState !== state)
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

export function setOAuthCookie(res: Response, provider: string, state: string): void {
  const secure = process.env.NODE_ENV === 'production';
  const reply = res as Response & {
    setCookie?: (name: string, value: string, options: Record<string, unknown>) => void;
  };
  if (reply.setCookie) {
    reply.setCookie(`${provider}_oauth_state`, state, {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      maxAge: 600,
    });
  } else {
    res.cookie(`${provider}_oauth_state`, state, {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      path: '/',
      maxAge: 600000,
    });
  }
}
