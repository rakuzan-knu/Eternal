import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initSentry } from '../sentry';
import * as Sentry from '@sentry/react';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn().mockReturnValue({}),
  replayIntegration: vi.fn().mockReturnValue({}),
}));

describe('sentry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips initialization when DSN is empty or invalid', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();

    vi.stubEnv('VITE_SENTRY_DSN', 'invalid-dsn');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('initializes Sentry when valid DSN is provided', () => {
    vi.stubEnv('PROD', true as any);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    initSentry();
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

    vi.stubEnv('PROD', true as any);
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    // Should not throw - the catch block swallows errors
    expect(() => initSentry()).not.toThrow();
    vi.unstubAllEnvs();
  });

  it('skips initialization when DSN is "undefined" or "null" string', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'undefined');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();

    vi.stubEnv('VITE_SENTRY_DSN', 'null');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it('sets tracesSampleRate to 0.2 in production environment', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://prodkey@sentry.io/12345');
    vi.stubEnv('PROD', true as any);
    initSentry();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.2,
      }),
    );
    vi.unstubAllEnvs();
  });
});
