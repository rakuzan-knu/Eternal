import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: {}, BrowserWindow: {} }));

import {
  isGithubCompletion,
  isOAuthNavigationAllowed,
  oauthProvider,
  oauthServiceOrigin,
} from './oauth';
import { APP_ORIGIN, DEV_ORIGIN } from './constants';

describe('OAuth window boundaries', () => {
  it.each(['github', 'spotify', 'steam', 'twitch'] as const)(
    'recognizes only the existing %s popup contract',
    (provider) => {
      expect(oauthProvider(`${provider}_oauth_window`)).toBe(provider);
      expect(oauthProvider(`${provider}_oauth_window_other`)).toBeUndefined();
      const path =
        provider === 'github'
          ? '/auth/github/oauth/launch'
          : provider === 'steam'
            ? '/integrations/steam/launch'
            : '/integrations/oauth/launch';
      const owner = oauthServiceOrigin(provider, APP_ORIGIN);
      expect(
        isOAuthNavigationAllowed(`${owner}/v1${path}#${'a'.repeat(64)}`, provider, APP_ORIGIN),
      ).toBe(true);
      expect(
        isOAuthNavigationAllowed(`${APP_ORIGIN}/v1${path}#${'a'.repeat(64)}`, provider, APP_ORIGIN),
      ).toBe(true);
      expect(
        isOAuthNavigationAllowed(`${owner}/v1${path}?proof=secret`, provider, APP_ORIGIN),
      ).toBe(false);
      expect(
        isOAuthNavigationAllowed(
          `${owner}/v1/integrations/${provider}/callback?code=fixture`,
          provider,
          APP_ORIGIN,
        ),
      ).toBe(true);
      expect(isOAuthNavigationAllowed(`${owner}/v1/users`, provider, APP_ORIGIN)).toBe(false);
    },
  );

  it.each([
    'https://github.com.evil.test/login',
    'https://user:secret@github.com/login',
    'https://github.com:444/login',
    'http://github.com/login',
    'https://accounts.google.com/o/oauth2/auth',
    'https://accounts.spotify.com/authorize',
    'javascript:alert(1)',
    'file:///c:/Windows',
    'data:text/html,test',
    'about:blank',
    'https://github.com/\n',
    'https://evil.test/callback',
  ])('rejects untrusted GitHub navigation %s', (url) => {
    expect(isOAuthNavigationAllowed(url, 'github', APP_ORIGIN)).toBe(false);
  });

  it('keeps provider origins, owner services and callback routes separate', () => {
    expect(isOAuthNavigationAllowed('https://github.com/login', 'github', APP_ORIGIN)).toBe(true);
    expect(isOAuthNavigationAllowed('https://www.twitch.tv/login', 'twitch', APP_ORIGIN)).toBe(
      true,
    );
    expect(
      isOAuthNavigationAllowed('https://steamcommunity.com/openid/login', 'steam', APP_ORIGIN),
    ).toBe(true);
    expect(
      isOAuthNavigationAllowed(
        `${oauthServiceOrigin('spotify', APP_ORIGIN)}/v1/auth/github/oauth/launch`,
        'github',
        APP_ORIGIN,
      ),
    ).toBe(false);
    expect(
      isOAuthNavigationAllowed(`${APP_ORIGIN}/integrations/spotify/callback`, 'twitch', APP_ORIGIN),
    ).toBe(false);
    expect(
      isOAuthNavigationAllowed(
        `${APP_ORIGIN}/integrations/twitch/callback?code=x`,
        'twitch',
        APP_ORIGIN,
      ),
    ).toBe(true);
    expect(
      isOAuthNavigationAllowed(`${APP_ORIGIN}/oauth/callback?code=x`, 'twitch', APP_ORIGIN),
    ).toBe(true);
    expect(isOAuthNavigationAllowed(`${APP_ORIGIN}/`, 'twitch', APP_ORIGIN)).toBe(false);
    expect(oauthProvider('youtube_oauth_window')).toBeUndefined();
  });

  it('permits local development only for the development renderer', () => {
    expect(oauthServiceOrigin('github', DEV_ORIGIN)).toBe('http://localhost:3000');
    expect(
      isOAuthNavigationAllowed(
        'http://localhost:3000/v1/auth/github/oauth/launch',
        'github',
        DEV_ORIGIN,
      ),
    ).toBe(true);
    expect(
      isOAuthNavigationAllowed(
        'http://localhost:3000/v1/auth/github/oauth/launch',
        'github',
        APP_ORIGIN,
      ),
    ).toBe(false);
  });

  it('recognizes only the existing first-party GitHub terminal redirects', () => {
    expect(isGithubCompletion(`${APP_ORIGIN}/settings?github=connected`, APP_ORIGIN)).toBe(true);
    expect(isGithubCompletion(`${APP_ORIGIN}/settings?error=oauth_failed`, APP_ORIGIN)).toBe(true);
    expect(isGithubCompletion('https://evil.test/settings?github=connected', APP_ORIGIN)).toBe(
      false,
    );
    expect(isGithubCompletion(`${APP_ORIGIN}/settings?github=pending`, APP_ORIGIN)).toBe(false);
    expect(isGithubCompletion(`${APP_ORIGIN}/other?github=connected`, APP_ORIGIN)).toBe(false);
  });
});
