import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProtocolHandler, isNetworkRoute, resolveLocalFile } from './protocol';
import { APP_ORIGIN } from './constants';

describe('local HTTPS renderer', () => {
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'eternal-protocol-')));
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'index.html'), '<h1>Eternal</h1>');
    await writeFile(join(root, 'assets/app.js'), 'export {};');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.each([
    '/v1',
    '/v1/auth/login',
    '/api/conversations',
    '/uploads/a.mp4',
    '/health',
    '/integrations/github/callback',
  ])('forwards %s without consuming its request or replacing its response', async (path) => {
    const response = new Response('stream', {
      headers: { 'Set-Cookie': 'session=test; Secure; HttpOnly' },
    });
    const fetch = vi.fn().mockResolvedValue(response);
    const request = new Request(`${APP_ORIGIN}${path}`, { method: 'POST', body: 'upload' });
    const handler = createProtocolHandler({ fetch }, root, 'test-csp');
    expect(await handler(request)).toBe(response);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(request, { bypassCustomProtocolHandlers: true });
    expect(request.bodyUsed).toBe(false);
  });

  it('preserves local Twitch callback precedence over the external integration wildcard', () => {
    expect(isNetworkRoute('/integrations/twitch/callback')).toBe(false);
    expect(isNetworkRoute('/integrations/spotify')).toBe(true);
    expect(isNetworkRoute('/v10')).toBe(false);
  });

  it('serves assets with CSP and preserves partial streaming responses', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response('abc', {
        status: 206,
        headers: { 'Content-Range': 'bytes 0-2/10', 'Content-Type': 'text/javascript' },
      }),
    );
    const handler = createProtocolHandler({ fetch }, root, 'test-csp');
    const response = await handler(
      new Request(`${APP_ORIGIN}/assets/app.js`, { headers: { Range: 'bytes=0-2' } }),
    );
    expect(fetch.mock.calls[0]?.[0]).toContain('file:');
    expect(fetch.mock.calls[0]?.[1].headers.get('Range')).toBe('bytes=0-2');
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 0-2/10');
    expect(response.headers.get('Content-Security-Policy')).toBe('test-csp');
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(await response.text()).toBe('abc');
  });

  it('uses SPA fallback only for navigation', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('ok'));
    const handler = createProtocolHandler({ fetch }, root, 'csp');
    await handler(
      new Request(`${APP_ORIGIN}/chat/123`, { headers: { 'sec-fetch-mode': 'navigate' } }),
    );
    expect(fetch.mock.calls[0]?.[0]).toContain('index.html');
    const missingAsset = new Request(`${APP_ORIGIN}/missing.js`);
    await handler(missingAsset);
    expect(fetch.mock.calls[1]?.[0]).toBe(missingAsset);
  });

  it('forwards other hosts without exposing local files', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('network'));
    const request = new Request('https://example.org/index.html');
    await createProtocolHandler({ fetch }, root, 'csp')(request);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(request, { bypassCustomProtocolHandlers: true });
  });

  it.each(['/../secret', '/%2e%2e/secret', '/%2e%2e%5csecret', '/%00', '/C:/secret', '/%ZZ'])(
    'rejects unsafe local path %s',
    async (path) => {
      expect(await resolveLocalFile(root, path)).toBeNull();
    },
  );

  it('returns no body for HEAD and does not cache index.html indefinitely', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { headers: { 'Content-Type': 'text/html' } }));
    const response = await createProtocolHandler(
      { fetch },
      root,
      'csp',
    )(new Request(`${APP_ORIGIN}/index.html`, { method: 'HEAD' }));
    expect(response.body).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });
});
