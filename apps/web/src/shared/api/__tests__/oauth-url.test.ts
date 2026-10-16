import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

describe('OAuth URL service routing', () => {
  it('routes popup starts and exchanges to music and GitHub callbacks to core', async () => {
    vi.stubEnv('VITE_API_URL', 'https://core.example');
    vi.stubEnv('VITE_MUSIC_API_URL', 'https://music.example/v1/');
    vi.resetModules();
    const { getApiUrl } = await import('../httpClient');
    expect(getApiUrl('/integrations/github/auth?userId=123&origin=https%3A%2F%2Fweb.example')).toBe(
      'https://music.example/v1/integrations/github/auth?userId=123&origin=https%3A%2F%2Fweb.example',
    );
    expect(getApiUrl('/integrations/spotify/auth')).toBe(
      'https://music.example/v1/integrations/spotify/auth',
    );
    expect(getApiUrl('/integrations/spotify/exchange-code')).toBe(
      'https://music.example/v1/integrations/spotify/exchange-code',
    );
    expect(getApiUrl('/api/v1/integrations/github/callback?code=example')).toBe(
      'https://core.example/v1/integrations/github/callback?code=example',
    );
  });
  it('retains the core fallback and explicit URLs', async () => {
    vi.stubEnv('VITE_API_URL', 'https://core.example/v1/');
    vi.stubEnv('VITE_MUSIC_API_URL', '');
    vi.resetModules();
    const { getApiUrl } = await import('../httpClient');
    expect(getApiUrl('/auth/spotify')).toBe('https://core.example/v1/auth/spotify');
    expect(getApiUrl('https://external.example/path')).toBe('https://external.example/path');
  });
});
