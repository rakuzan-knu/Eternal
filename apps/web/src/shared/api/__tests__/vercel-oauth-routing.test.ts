import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Rewrite = { source: string; destination: string };

function isRewrite(value: unknown): value is Rewrite {
  return (
    typeof value === 'object' &&
    value !== null &&
    'source' in value &&
    typeof value.source === 'string' &&
    'destination' in value &&
    typeof value.destination === 'string'
  );
}

// Read deployment config at test runtime; frontend Docker builds intentionally
// compile only web/workspace sources and do not copy the root Vercel config.
const deployment: unknown = JSON.parse(
  await readFile(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../vercel.json'),
    'utf8',
  ),
);
if (
  typeof deployment !== 'object' ||
  deployment === null ||
  !('rewrites' in deployment) ||
  !Array.isArray(deployment.rewrites) ||
  !deployment.rewrites.every(isRewrite)
) {
  throw new Error('Expected Vercel rewrite sources and destinations to be strings');
}
const rewrites = deployment.rewrites;

function destinationFor(path: string): string | undefined {
  return rewrites.find(({ source }) => {
    if (source === '/(.*)') return true;
    if (source.endsWith('/:path*')) {
      const prefix = source.slice(0, -'/:path*'.length);
      return path === prefix || path.startsWith(`${prefix}/`);
    }
    return source === path;
  })?.destination;
}

describe('Vercel OAuth callback routing', () => {
  it('serves the Twitch SPA callback before the broad integration API rewrite', () => {
    expect(destinationFor('/integrations/twitch/callback')).toBe('/index.html');
  });

  it.each([
    '/integrations/twitch/exchange-code',
    '/integrations/twitch/auth',
    '/integrations/spotify/callback',
    '/v1/integrations/twitch/callback',
    '/api/integrations/twitch/callback',
  ])('keeps %s routed to the Music API', (path) => {
    expect(destinationFor(path)).toMatch(/^https:\/\/eternal-music-hub\.onrender\.com\/v1\//);
  });

  it('preserves the GitHub callback Core exception', () => {
    expect(destinationFor('/integrations/github/callback')).toBe(
      'https://social-network-backend-4h47.onrender.com/v1/integrations/github/callback/:path*',
    );
  });
});
