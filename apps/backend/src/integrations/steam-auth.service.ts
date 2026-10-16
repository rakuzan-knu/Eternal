import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

const STEAM_ENDPOINT = 'https://steamcommunity.com/openid/login';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const STATE_TTL_SECONDS = 600;
const OPENID_FIELDS = [
  'openid.ns',
  'openid.mode',
  'openid.op_endpoint',
  'openid.claimed_id',
  'openid.identity',
  'openid.return_to',
  'openid.response_nonce',
  'openid.assoc_handle',
  'openid.signed',
  'openid.sig',
  'openid.realm',
];
const allowedOpenIdFields: ReadonlySet<string> = new Set(OPENID_FIELDS);
export const STEAM_AUTH_COOKIE = 'steam_auth_browser';

interface SteamTransaction {
  userId: string;
  origin: string;
  callback: string;
  expiresAt: number;
  browserHash?: string;
  launchHash?: string;
  returnTo?: string;
}

@Injectable()
export class SteamAuthService {
  constructor(private readonly redis: RedisService) {}

  private async redisOperation<T>(operation: () => Promise<T>): Promise<T> {
    if (this.redis.getClient().status !== 'ready') {
      throw new ServiceUnavailableException('Steam authentication requires Redis');
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Redis deadline')), 2000);
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException('Steam authentication is temporarily unavailable');
    } finally {
      clearTimeout(timer);
    }
  }

  private callbackUrl(): string {
    const configured = process.env.STEAM_CALLBACK_URL;
    const renderOrigin = process.env.RENDER_EXTERNAL_URL;
    const raw =
      configured ||
      (renderOrigin
        ? new URL('/v1/integrations/steam/callback', renderOrigin).href
        : process.env.NODE_ENV !== 'production'
          ? 'http://localhost:3000/v1/integrations/steam/callback'
          : '');
    try {
      const url = new URL(raw);
      const local =
        process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
      if (
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/v1/integrations/steam/callback'
      )
        throw new Error('Invalid callback');
      return url.href;
    } catch {
      throw new ServiceUnavailableException('Steam callback URL is not configured securely');
    }
  }

  private allowedOrigin(raw: string): string {
    try {
      const url = new URL(raw);
      if (
        url.origin !== raw ||
        !['https:', 'http:'].includes(url.protocol) ||
        (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
      )
        throw new Error('Invalid origin');
      const allowed = (process.env.CORS_ORIGIN || '').split(',').map((value) => value.trim());
      const local =
        process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
      if (!allowed.includes(url.origin) && !local) throw new Error('Untrusted origin');
      return url.origin;
    } catch {
      throw new BadRequestException('Frontend origin is not allowed');
    }
  }

  async start(userId: string, origin: string): Promise<{ url: string; launchProof: string }> {
    if (!userId) throw new UnauthorizedException();
    const transaction: SteamTransaction = {
      userId,
      origin: this.allowedOrigin(origin),
      callback: this.callbackUrl(),
      expiresAt: Date.now() + 60_000,
    };
    const ticket = randomBytes(32).toString('hex');
    const launchProof = randomBytes(32).toString('hex');
    transaction.launchHash = this.hash(launchProof);
    const stored = await this.redisOperation(() =>
      this.redis
        .getClient()
        .set(`steam:launch:${ticket}`, JSON.stringify(transaction), 'EX', 60, 'NX'),
    );
    if (stored !== 'OK')
      throw new ServiceUnavailableException('Could not start Steam authentication');
    return {
      url: new URL(`/v1/integrations/steam/launch#${ticket}`, transaction.callback).href,
      launchProof,
    };
  }

  async launch(
    ticket: string,
    proof: string,
    openerOrigin: string,
    requestOrigin?: string,
  ): Promise<{ url: string; browserProof: string; secure: boolean }> {
    if (requestOrigin !== new URL(this.callbackUrl()).origin || !/^[a-f0-9]{64}$/.test(proof))
      throw new UnauthorizedException('Invalid Steam launch');
    const transaction = await this.consume('launch', ticket);
    if (transaction.launchHash !== this.hash(proof) || openerOrigin !== transaction.origin)
      throw new UnauthorizedException('Invalid Steam launch');
    const state = randomBytes(32).toString('hex');
    const browserProof = randomBytes(32).toString('hex');
    const returnTo = new URL(transaction.callback);
    returnTo.searchParams.set('state', state);
    transaction.returnTo = returnTo.href;
    transaction.browserHash = this.hash(browserProof);
    transaction.expiresAt = Date.now() + STATE_TTL_SECONDS * 1000;
    const stored = await this.redisOperation(() =>
      this.redis
        .getClient()
        .set(`steam:state:${state}`, JSON.stringify(transaction), 'EX', STATE_TTL_SECONDS, 'NX'),
    );
    if (stored !== 'OK')
      throw new ServiceUnavailableException('Could not start Steam authentication');
    const url = new URL(STEAM_ENDPOINT);
    for (const [key, value] of Object.entries({
      ns: OPENID_NS,
      mode: 'checkid_setup',
      return_to: returnTo.href,
      realm: new URL(transaction.callback).origin + '/',
      identity: OPENID_NS + '/identifier_select',
      claimed_id: OPENID_NS + '/identifier_select',
    }))
      url.searchParams.set(`openid.${key}`, value);
    return { url: url.href, browserProof, secure: transaction.callback.startsWith('https:') };
  }

  private async consume(kind: 'launch' | 'state', token: string): Promise<SteamTransaction> {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Invalid Steam transaction');
    const raw = await this.redisOperation(() =>
      this.redis.getClient().getdel(`steam:${kind}:${token}`),
    );
    if (!raw) throw new UnauthorizedException('Steam transaction expired or already used');
    try {
      const data: unknown = JSON.parse(raw);
      if (
        typeof data !== 'object' ||
        !data ||
        !('userId' in data) ||
        typeof data.userId !== 'string' ||
        !('origin' in data) ||
        typeof data.origin !== 'string' ||
        !('callback' in data) ||
        typeof data.callback !== 'string' ||
        !('expiresAt' in data) ||
        typeof data.expiresAt !== 'number' ||
        data.expiresAt < Date.now()
      )
        throw new Error('Invalid transaction');
      const transaction: SteamTransaction = {
        userId: data.userId,
        origin: data.origin,
        callback: data.callback,
        expiresAt: data.expiresAt,
      };
      if ('browserHash' in data && typeof data.browserHash === 'string')
        transaction.browserHash = data.browserHash;
      if ('launchHash' in data && typeof data.launchHash === 'string')
        transaction.launchHash = data.launchHash;
      if ('returnTo' in data && typeof data.returnTo === 'string')
        transaction.returnTo = data.returnTo;
      if (
        transaction.callback !== this.callbackUrl() ||
        transaction.origin !== this.allowedOrigin(transaction.origin)
      )
        throw new Error('Configuration changed');
      return transaction;
    } catch {
      throw new UnauthorizedException('Invalid Steam transaction');
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  async verify(
    query: Record<string, unknown>,
    browserProof: unknown,
    callbackPath: string,
  ): Promise<{ userId: string; origin: string; steamId: string }> {
    if (
      typeof browserProof !== 'string' ||
      !/^[a-f0-9]{64}$/.test(browserProof) ||
      typeof query.state !== 'string'
    )
      throw new UnauthorizedException('Invalid Steam transaction');
    const transaction = await this.consume('state', query.state);
    const invalid = () => new UnauthorizedException('Steam authentication could not be verified');
    if (
      transaction.browserHash !== this.hash(browserProof) ||
      callbackPath !== new URL(transaction.callback).pathname ||
      'userId' in query ||
      'origin' in query
    )
      throw invalid();
    if (Object.keys(query).length > 32) throw invalid();
    for (const [key, value] of Object.entries(query)) {
      if (typeof value !== 'string' || value.length > 4096) throw invalid();
      if (key.startsWith('openid.') && !allowedOpenIdFields.has(key)) throw invalid();
    }
    // Keys come exclusively from the protocol allowlist, never from callback parameters.
    const fields = Object.fromEntries<string>(
      OPENID_FIELDS.flatMap<[string, string]>((key) => {
        const value = query[key];
        return typeof value === 'string' ? [[key, value]] : [];
      }),
    );
    const claimed = fields['openid.claimed_id'];
    const identity = claimed?.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
    const nonce = fields['openid.response_nonce'] || '';
    const nonceTime = Date.parse(nonce.slice(0, 20));
    const signed = new Set((fields['openid.signed'] || '').split(','));
    if (
      fields['openid.ns'] !== OPENID_NS ||
      fields['openid.mode'] !== 'id_res' ||
      fields['openid.op_endpoint'] !== STEAM_ENDPOINT ||
      fields['openid.return_to'] !== transaction.returnTo ||
      !identity ||
      fields['openid.identity'] !== claimed ||
      ![
        'op_endpoint',
        'claimed_id',
        'identity',
        'return_to',
        'response_nonce',
        'assoc_handle',
      ].every((key) => signed.has(key)) ||
      !fields['openid.assoc_handle'] ||
      !fields['openid.sig'] ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ.+$/.test(nonce) ||
      !Number.isFinite(nonceTime) ||
      nonceTime > Date.now() + 60_000 ||
      nonceTime < Date.now() - STATE_TTL_SECONDS * 1000 ||
      (fields['openid.realm'] !== undefined &&
        fields['openid.realm'] !== new URL(transaction.callback).origin + '/')
    )
      throw invalid();
    const body = new URLSearchParams(fields);
    body.set('openid.mode', 'check_authentication');
    try {
      const response = await fetch(STEAM_ENDPOINT, {
        method: 'POST',
        redirect: 'error',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(5000),
      });
      const text = await response.text();
      const validity = text.split(/\r?\n/).filter((line) => line.startsWith('is_valid:'));
      if (!response.ok || validity.length !== 1 || validity[0] !== 'is_valid:true') throw invalid();
    } catch {
      throw invalid();
    }
    const claimedNonce = await this.redisOperation(() =>
      this.redis
        .getClient()
        .set(`steam:nonce:${this.hash(nonce)}`, '1', 'EX', STATE_TTL_SECONDS, 'NX'),
    );
    if (claimedNonce !== 'OK') throw invalid();
    const steamId = identity[1];
    if (!steamId) throw invalid();
    return { userId: transaction.userId, origin: transaction.origin, steamId };
  }

  launchPage(): string {
    const origins = JSON.stringify(
      (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()),
    ).replaceAll('<', '\\u003c');
    return `<!doctype html><html><head><title>Connecting Steam</title></head><body><p id="status">Connecting Steam...</p><script>
      const ticket = location.hash.slice(1);
      history.replaceState(null, '', location.pathname);
      const fail = () => {document.getElementById('status').textContent = 'Steam authentication failed. Close this window and try again.';};
      if (!/^[a-f0-9]{64}$/.test(ticket) || !window.opener) fail();
      else {
        const timer = setTimeout(fail, 30000);
        const receive = event => {
          const allowed = ${origins}.includes(event.origin)${process.env.NODE_ENV !== 'production' ? ' || /^https?:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d+)?$/.test(event.origin)' : ''};
          if (event.source !== window.opener || !allowed || event.data?.type !== 'STEAM_LAUNCH_PROOF' || !/^[a-f0-9]{64}$/.test(event.data.proof)) return;
          window.removeEventListener('message', receive);
          clearTimeout(timer);
          fetch(location.pathname, {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,proof:event.data.proof,origin:event.origin})})
            .then(async response => {if(!response.ok) throw new Error(); const data=await response.json(); location.replace(data.url);}).catch(fail);
        };
        window.addEventListener('message', receive);
        for (const origin of ${origins}) window.opener.postMessage({type:'STEAM_LAUNCH_REQUEST',platform:'steam'}, origin);
      }
    </script></body></html>`;
  }
}
