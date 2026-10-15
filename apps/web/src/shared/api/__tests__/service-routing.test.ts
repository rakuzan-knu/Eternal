import { describe, expect, it } from 'vitest';
import { getApiService, getServiceBaseUrl } from '@social-network/shared-api-client';

describe('deployment routing', () => {
  it.each([
    ['/decorations/frames', 'core'],
    ['/families', 'core'],
    ['/nameplates', 'core'],
    ['/new-feature', 'core'],
    ['/auth/refresh', 'core'],
    ['/users/me', 'core'],
    ['/integrations/github/callback?code=example', 'core'],
    ['/api/v1/integrations/github/callback', 'core'],
    ['/api/integrations/github/callback', 'core'],
    ['/v1/integrations/github/callback', 'core'],
    ['/integrations/github/auth', 'music'],
    ['/integrations/github/exchange-code', 'music'],
    ['/integrations/github-other', 'music'],
    ['/messenger/channels', 'messenger'],
    ['/messenger/bots', 'messenger'],
    ['/soundboard/my', 'messenger'],
    ['/api/v1/watch-together/history', 'messenger'],
    ['/auth/github/oauth/start', 'core'],
    ['/v1/conversations?limit=20', 'messenger'],
    ['v1/calls/123', 'messenger'],
    ['/api/v1/crypto/prekeys', 'messenger'],
    ['/e2ee/keys', 'messenger'],
    ['/reels/feed', 'reels'],
    ['/api/integrations/soundcloud/stream/12', 'music'],
    ['/auth/spotify/callback', 'music'],
  ])('routes %s to %s', (url, service) => {
    expect(getApiService(url)).toBe(service);
  });

  it('preserves legacy routing until a feature origin is configured', () => {
    expect(getServiceBaseUrl('/conversations', {}, '/v1')).toBe('/v1');
  });
  it('normalizes long slash suffixes and preserves nonterminal slashes', () => {
    expect(
      getServiceBaseUrl('/reels', { reels: `https://reels.example${'/'.repeat(20_000)}` }, '/v1'),
    ).toBe('https://reels.example/v1');
    expect(getServiceBaseUrl('/reels', { reels: '/'.repeat(20_000) }, '/v1')).toBe('/v1');
    expect(getServiceBaseUrl('/reels', { reels: 'https://reels.example/a//b/' }, '/v1')).toBe(
      'https://reels.example/a//b/v1',
    );
  });
  it('keeps refresh on core when requests alternate between services', () => {
    const origins = { messenger: 'https://messenger.example/v1/', reels: 'https://reels.example' };
    expect(getServiceBaseUrl('/conversations', origins, 'https://core.example/v1')).toBe(
      'https://messenger.example/v1',
    );
    expect(getServiceBaseUrl('/reels', origins, 'https://core.example/v1')).toBe(
      'https://reels.example/v1',
    );
    expect(getServiceBaseUrl('/auth/refresh', origins, 'https://core.example/v1')).toBe(
      'https://core.example/v1',
    );
  });
  it('does not reroute explicit external URLs or similar namespace names', () => {
    expect(
      getServiceBaseUrl(
        'https://external.example/reels',
        { reels: 'https://reels.example' },
        '/v1',
      ),
    ).toBe('/v1');
    expect(getApiService('/reels-settings')).toBe('core');
    expect(getApiService('/messenger-tools')).toBe('core');
  });
});
