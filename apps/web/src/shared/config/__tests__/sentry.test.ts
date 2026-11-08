import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { containsInvitationCredential, syncSentryConsent } from '../sentry';
import * as Sentry from '@sentry/react';

const sdk = vi.hoisted(() => {
  const options = { enabled: true };
  const close = vi.fn().mockResolvedValue(true);
  const clearBreadcrumbs = vi.fn();
  return { options, close, clearBreadcrumbs };
});
vi.mock('@sentry/react', () => ({
  init: vi.fn(() => ({ getOptions: () => sdk.options, close: sdk.close })),
  getIsolationScope: () => ({ clearBreadcrumbs: sdk.clearBreadcrumbs }),
  browserTracingIntegration: vi.fn().mockReturnValue({}),
  replayIntegration: vi.fn().mockReturnValue({}),
}));

describe('sentry', () => {
  afterEach(() => {
    syncSentryConsent(false);
    vi.unstubAllEnvs();
  });

  it('starts only after analytics consent and disables the old client on withdrawal', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    sdk.options.enabled = true;
    syncSentryConsent(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    syncSentryConsent(true);
    syncSentryConsent(true);
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    const config = vi.mocked(Sentry.init).mock.calls[0]?.[0];
    const breadcrumb = { category: 'navigation' };
    expect(config?.beforeBreadcrumb?.(breadcrumb, {})).toEqual(breadcrumb);
    syncSentryConsent(false);
    expect(sdk.options.enabled).toBe(false);
    expect(sdk.close).toHaveBeenCalledOnce();
    expect(config?.beforeBreadcrumb?.(breadcrumb, {})).toBeNull();
    syncSentryConsent(true);
    expect(Sentry.init).toHaveBeenCalledTimes(2);
    expect(config?.beforeBreadcrumb?.(breadcrumb, {})).toBeNull();
  });
  it('respects the synchronous desktop telemetry policy before initializing', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    Object.defineProperty(window, 'desktop', {
      configurable: true,
      value: { telemetryDisabled: true },
    });
    try {
      syncSentryConsent(true);
      expect(Sentry.init).not.toHaveBeenCalled();
    } finally {
      Reflect.deleteProperty(window, 'desktop');
      vi.unstubAllEnvs();
    }
  });
  it('identifies invitation credentials in errors, breadcrumbs and navigation URLs', () => {
    expect(
      containsInvitationCredential({ data: { url: 'https://eternal.test/invite/secret' } }),
    ).toBe(true);
    expect(
      containsInvitationCredential({
        request: { url: '/messenger/communities/invites/secret/accept' },
      }),
    ).toBe(true);
    expect(containsInvitationCredential({ url: '/communities/public-id' })).toBe(false);
    expect(
      containsInvitationCredential({
        config: { url: '/auth/register', data: { password: 'private', admission: {} } },
      }),
    ).toBe(true);
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips initialization when DSN is empty or invalid', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    syncSentryConsent(true);
    expect(Sentry.init).not.toHaveBeenCalled();

    vi.stubEnv('VITE_SENTRY_DSN', 'invalid-dsn');
    syncSentryConsent(true);
    expect(Sentry.init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('initializes Sentry when valid DSN is provided', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    syncSentryConsent(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://prodkey@sentry.io/12345',
      }),
    );
    vi.unstubAllEnvs();
  });

  it('covers line 21 - handles Sentry.init() throwing gracefully (catch block)', () => {
    // Make Sentry.init throw to cover the catch block around line 33-35 of sentry.ts
    vi.mocked(Sentry.init).mockImplementationOnce(() => {
      throw new Error('Sentry init failed');
    });

    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    // Should not throw - the catch block swallows errors
    expect(() => syncSentryConsent(true)).not.toThrow();
    vi.unstubAllEnvs();
  });

  it('skips initialization when DSN is "undefined" or "null" string', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'undefined');
    syncSentryConsent(true);
    expect(Sentry.init).not.toHaveBeenCalled();

    vi.stubEnv('VITE_SENTRY_DSN', 'null');
    syncSentryConsent(true);
    expect(Sentry.init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('sets tracesSampleRate to 0.2 in production environment', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    vi.stubEnv('PROD', true);
    syncSentryConsent(true);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.2,
      }),
    );
    vi.unstubAllEnvs();
  });
});
