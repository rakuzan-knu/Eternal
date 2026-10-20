import { describe, expect, it } from 'vitest';
import deployment from '../../../../../../vercel.json';

function destinationFor(path: string): string | undefined {
  return deployment.rewrites.find(({ source }) => {
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
