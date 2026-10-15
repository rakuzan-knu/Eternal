import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { RedisService } from '../../redis/redis.service';

interface LaunchRecord {
  provider: string;
  url: string;
  origin: string;
  launchUrl: string;
  proofHash: string;
  expiresAt: number;
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function allowedOrigin(origin: string): string {
  try {
    const parsed = new URL(origin);
    const local =
      process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
    if (
      parsed.origin !== origin ||
      !['https:', 'http:'].includes(parsed.protocol) ||
      (!local && parsed.protocol !== 'https:') ||
      (!(process.env.CORS_ORIGIN || '')
        .split(',')
        .map((value) => value.trim())
        .includes(origin) &&
        !local)
    )
      throw new Error();
    return origin;
  } catch {
    throw new BadRequestException('Frontend origin is not allowed');
  }
}

function validatedLaunchUrl(raw: string): URL {
  try {
    const url = new URL(raw);
    const local =
      process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url;
  } catch {
    throw new ServiceUnavailableException('OAuth launch URL is not configured securely');
  }
}

export async function issueOAuthLaunch(
  redis: RedisService,
  providerUrl: string,
  origin: string,
  launchUrl: string,
): Promise<{ url: string; launchProof: string }> {
  const target = new URL(providerUrl);
  const state = target.searchParams.get('state') || '';
  const provider = state.split(':')[0] || '';
  if (!/^[a-z]+:[a-f0-9]{64}$/.test(state) || target.protocol !== 'https:')
    throw new UnauthorizedException('Invalid OAuth transaction');
  const callback = validatedLaunchUrl(launchUrl);
  const ticket = randomBytes(32).toString('hex');
  const launchProof = randomBytes(32).toString('hex');
  const record: LaunchRecord = {
    provider,
    url: target.href,
    origin: allowedOrigin(origin),
    launchUrl: callback.href,
    proofHash: hash(launchProof),
    expiresAt: Date.now() + 60000,
  };
  const client = redis.getClient();
  if (client.status !== 'ready') throw new ServiceUnavailableException('OAuth requires Redis');
  const stored = await client.set(`oauth-launch:${ticket}`, JSON.stringify(record), 'EX', 60, 'NX');
  if (stored !== 'OK') throw new ServiceUnavailableException('Could not start OAuth');
  callback.hash = ticket;
  return { url: callback.href, launchProof };
}

export async function consumeOAuthLaunch(
  redis: RedisService,
  body: unknown,
  requestOrigin: string | undefined,
  launchUrl: string,
): Promise<{ provider: string; state: string; url: string }> {
  if (
    !body ||
    typeof body !== 'object' ||
    !('ticket' in body) ||
    !('proof' in body) ||
    !('origin' in body) ||
    typeof body.ticket !== 'string' ||
    typeof body.proof !== 'string' ||
    typeof body.origin !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.ticket) ||
    !/^[a-f0-9]{64}$/.test(body.proof)
  )
    throw new UnauthorizedException('Invalid OAuth launch');
  const callback = validatedLaunchUrl(launchUrl);
  if (requestOrigin !== callback.origin)
    throw new UnauthorizedException('Invalid OAuth launch origin');
  const client = redis.getClient();
  if (client.status !== 'ready') throw new ServiceUnavailableException('OAuth requires Redis');
  const raw = await client.getdel(`oauth-launch:${body.ticket}`);
  if (!raw) throw new UnauthorizedException('OAuth launch expired or already used');
  let data: LaunchRecord;
  try {
    data = JSON.parse(raw) as LaunchRecord;
  } catch {
    throw new UnauthorizedException('Invalid OAuth launch');
  }
  if (
    data.launchUrl !== callback.href ||
    data.proofHash !== hash(body.proof) ||
    data.origin !== body.origin ||
    data.origin !== allowedOrigin(body.origin) ||
    data.expiresAt < Date.now()
  )
    throw new UnauthorizedException('Invalid OAuth launch proof');
  const target = new URL(data.url);
  const state = target.searchParams.get('state') || '';
  if (!/^[a-z]+:[a-f0-9]{64}$/.test(state) || !state.startsWith(`${data.provider}:`))
    throw new UnauthorizedException('Invalid OAuth launch state');
  return { provider: data.provider, state, url: target.href };
}

export function oauthLaunchPage(): string {
  const origins = JSON.stringify(
    (process.env.CORS_ORIGIN || '').split(',').map((origin) => origin.trim()),
  ).replaceAll('<', '\\u003c');
  return `<!doctype html><html><head><title>Connecting account</title></head><body><p id="status">Connecting account...</p><script>
    const ticket=location.hash.slice(1); history.replaceState(null,'',location.pathname);
    const fail=()=>{document.getElementById('status').textContent='Authentication failed. Close this window and try again.';};
    if(!/^[a-f0-9]{64}$/.test(ticket)||!window.opener) fail();
    else {
      const timer=setTimeout(fail,30000);
      const receive=event=>{
        if(event.source!==window.opener||!${origins}.includes(event.origin)||event.data?.type!=='OAUTH_LAUNCH_PROOF'||!/^[a-f0-9]{64}$/.test(event.data.proof))return;
        window.removeEventListener('message',receive);clearTimeout(timer);
        fetch(location.pathname,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket,proof:event.data.proof,origin:event.origin})})
          .then(async response=>{if(!response.ok)throw new Error();const data=await response.json();location.replace(data.url);}).catch(fail);
      };
      window.addEventListener('message',receive);
      for(const origin of ${origins})window.opener.postMessage({type:'OAUTH_LAUNCH_REQUEST'},origin);
    }
  </script></body></html>`;
}
