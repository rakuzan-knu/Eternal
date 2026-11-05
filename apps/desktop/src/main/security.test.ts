import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }));

import { isTrustedUrl } from './security';
import { isPermissionAllowed } from './permissions';
import { createContentSecurityPolicy } from './csp';
import {
  externalArgumentsSchema,
  externalUrlSchema,
  noArgumentsSchema,
} from '../shared/ipcContract';
import { APP_ORIGIN, DEV_ORIGIN } from './constants';

describe('desktop security boundaries', () => {
  it.each([
    'https://eternalnet.vercel.app.evil.test/',
    'https://evil.test/?next=https://eternalnet.vercel.app',
    'http://eternalnet.vercel.app',
    'https://eternalnet.vercel.app:444/',
    'https://user@eternalnet.vercel.app/',
    'file:///etc/passwd',
    'data:text/html,test',
  ])('rejects untrusted navigation %s', (url) => {
    expect(isTrustedUrl(url, APP_ORIGIN)).toBe(false);
  });

  it('allows only the exact configured origin', () => {
    expect(isTrustedUrl(`${APP_ORIGIN}/chat/1`, APP_ORIGIN)).toBe(true);
    expect(isTrustedUrl(DEV_ORIGIN, APP_ORIGIN)).toBe(false);
    expect(isTrustedUrl(DEV_ORIGIN, DEV_ORIGIN)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'file:///c:/Windows',
    'http://example.org',
    'eternal://chat/1',
    'https://user:password@example.org',
    'https://example.org/\n',
  ])('rejects unsafe shell URLs %s', (value) => {
    expect(externalUrlSchema.safeParse(value).success).toBe(false);
  });

  it('validates the entire IPC argument tuple', () => {
    expect(noArgumentsSchema.safeParse(['extra']).success).toBe(false);
    expect(externalArgumentsSchema.safeParse(['https://example.org', 'extra']).success).toBe(false);
    expect(externalUrlSchema.safeParse('https://example.org/docs').success).toBe(true);
    expect(externalUrlSchema.safeParse('mailto:support@example.org').success).toBe(true);
  });

  it('requires both trusted requesting and top-level origins for permission checks', () => {
    expect(isPermissionAllowed('media', APP_ORIGIN, APP_ORIGIN, APP_ORIGIN)).toBe(true);
    expect(isPermissionAllowed('media', 'https://evil.test', APP_ORIGIN, APP_ORIGIN)).toBe(false);
    expect(isPermissionAllowed('media', APP_ORIGIN, 'https://evil.test', APP_ORIGIN)).toBe(false);
    expect(isPermissionAllowed('geolocation', APP_ORIGIN, APP_ORIGIN, APP_ORIGIN)).toBe(false);
    expect(isPermissionAllowed('usb', APP_ORIGIN, APP_ORIGIN, APP_ORIGIN)).toBe(false);
  });

  it('hashes inline scripts without permitting arbitrary inline scripts or eval in production', () => {
    const csp = createContentSecurityPolicy('<script>window.theme = 1;</script>');
    const scripts = csp.split('; ').find((directive) => directive.startsWith('script-src'));
    expect(scripts).toContain("'sha256-");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('http:');
  });
});
