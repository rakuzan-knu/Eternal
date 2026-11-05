import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { RedisService } from '../redis/redis.service';
import { consumeOAuthState, issueOAuthState } from '../common/security/oauth-state';
import { consumeOAuthLaunch, issueOAuthLaunch } from '../common/security/oauth-launch';
import type { YouTubeDesktopCallbackDto, YouTubeDesktopRedeemDto } from './dto/youtube-desktop.dto';

const transactionSchema = z.object({
  userId: z.string().min(1),
  challenge: z.string().regex(/^[a-f0-9]{64}$/),
  redirectUri: z.string().url(),
});
const handoffSchema = transactionSchema.extend({
  transaction: z.string().regex(/^[a-f0-9]{64}$/),
  code: z.string().max(4096).optional(),
  failed: z.boolean(),
});
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function parseRecord(raw: string | null): unknown {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

@Injectable()
export class YouTubeDesktopService {
  constructor(private readonly redis: RedisService) {}

  private client() {
    const client = this.redis.getClient();
    if (client.status !== 'ready') throw new ServiceUnavailableException('OAuth requires Redis');
    return client;
  }

  private url(action: 'launch' | 'callback'): string {
    try {
      const url = new URL(process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000');
      const local = process.env.NODE_ENV !== 'production' && url.hostname === 'localhost';
      if (
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        throw new Error();
      return new URL(`/v1/integrations/youtube/desktop/${action}`, url).href;
    } catch {
      throw new ServiceUnavailableException('Desktop OAuth host is not configured securely');
    }
  }

  async start(userId: string, challenge: string, origin: string) {
    this.client();
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      throw new ServiceUnavailableException('YouTube OAuth is not configured');
    const redirectUri = this.url('callback');
    const state = await issueOAuthState(this.redis, 'youtube', userId, redirectUri);
    const transaction = state.slice('youtube:'.length);
    const stored = await this.client().set(
      `youtube-desktop:${state}`,
      JSON.stringify({ userId, challenge, redirectUri }),
      'EX',
      600,
      'NX',
    );
    if (stored !== 'OK') throw new ServiceUnavailableException('Could not start YouTube OAuth');
    const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    google.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    }).toString();
    const launch = await issueOAuthLaunch(this.redis, google.href, origin, this.url('launch'));
    const url = new URL(launch.url);
    url.hash = new URLSearchParams({
      ticket: url.hash.slice(1),
      proof: launch.launchProof,
      origin,
    }).toString();
    return { url: url.href, transaction };
  }

  launch(body: unknown, origin?: string) {
    return consumeOAuthLaunch(this.redis, body, origin, this.url('launch'));
  }

  async callback(query: YouTubeDesktopCallbackDto, browserState?: string): Promise<string> {
    this.client();
    const identity = await consumeOAuthState(
      this.redis,
      'youtube',
      query.state,
      undefined,
      browserState,
    );
    const raw = await this.client().getdel(`youtube-desktop:${query.state}`);
    const data = transactionSchema.safeParse(parseRecord(raw));
    if (
      !data.success ||
      data.data.userId !== identity.userId ||
      data.data.redirectUri !== identity.redirectUri
    )
      throw new UnauthorizedException('Invalid desktop OAuth transaction');
    const transaction = query.state.slice('youtube:'.length);
    const code = randomBytes(32).toString('hex');
    const stored = await this.client().set(
      `youtube-handoff:${hash(code)}`,
      JSON.stringify({
        ...data.data,
        transaction,
        code: query.code,
        failed: Boolean(query.error || !query.code),
      }),
      'EX',
      60,
      'NX',
    );
    if (stored !== 'OK') throw new ServiceUnavailableException('Could not complete YouTube OAuth');
    return `eternal://oauth/youtube?transaction=${transaction}&code=${code}`;
  }

  async redeem(userId: string, body: YouTubeDesktopRedeemDto) {
    const client = this.client();
    const key = `youtube-handoff:${hash(body.code)}`;
    const raw = await client.get(key);
    if (!raw) throw new UnauthorizedException('Invalid, expired or reused YouTube handoff');
    const parsed = handoffSchema.safeParse(parseRecord(raw));
    if (
      !parsed.success ||
      parsed.data.userId !== userId ||
      parsed.data.transaction !== body.transaction ||
      parsed.data.challenge !== hash(body.verifier)
    )
      throw new UnauthorizedException('Invalid, expired or reused YouTube handoff');
    const consumed = await client.eval(
      "if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('DEL', KEYS[1]) return 1",
      1,
      key,
      raw,
    );
    if (consumed !== 1) throw new UnauthorizedException('YouTube handoff already used');
    return parsed.data;
  }
}

export function youtubeDesktopLaunchPage(): string {
  return `<!doctype html><html><head><title>Connect YouTube</title></head><body><p id="status">Connecting YouTube...</p><script>
    const params=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);
    fetch(location.pathname,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:params.get('ticket'),proof:params.get('proof'),origin:params.get('origin')})})
      .then(async response=>{if(!response.ok)throw new Error();const data=await response.json();location.replace(data.url);})
      .catch(()=>{document.getElementById('status').textContent='Could not start YouTube authentication. Return to Eternal and try again.';});
  </script></body></html>`;
}
