/* eslint-disable @typescript-eslint/no-require-imports */
import * as Sentry from '@sentry/nestjs';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('@sentry/nestjs', () => ({
  init: jest.fn(),
}));

interface SentryInitOptions {
  dsn?: string;
  tracesSampleRate?: number;
  environment?: string;
  beforeSend?: (event: { request?: { headers?: Record<string, string> }; message?: string }) => {
    request?: { headers?: Record<string, string> };
    message?: string;
  };
}

describe('instrument.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('configures Sentry with custom traces sample rate and beforeSend hook', () => {
    process.env.SENTRY_DSN = 'https://custom@sentry.io/123';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.75';
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      require('../instrument');
    });

    expect(Sentry.init).toHaveBeenCalled();
    const initMock = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
    const calls = initMock.mock.calls as unknown as [[SentryInitOptions]];
    const initCall = calls[0][0];

    expect(initCall.dsn).toBe('https://custom@sentry.io/123');
    expect(initCall.tracesSampleRate).toBe(0.75);
    expect(initCall.environment).toBe('production');

    // Test beforeSend hook
    const mockEvent = {
      request: {
        headers: {
          authorization: 'Bearer token-secret',
          cookie: 'session=secret-cookie',
          'content-type': 'application/json',
        },
      },
    };

    const sanitized = initCall.beforeSend ? initCall.beforeSend(mockEvent) : mockEvent;
    expect(sanitized.request?.headers?.['authorization']).toBeUndefined();
    expect(sanitized.request?.headers?.['cookie']).toBeUndefined();
    expect(sanitized.request?.headers?.['content-type']).toBe('application/json');

    // Test beforeSend when request or headers are undefined
    const eventWithoutHeaders = { message: 'Test error' };
    const sanitizedNoHeaders = initCall.beforeSend
      ? initCall.beforeSend(eventWithoutHeaders)
      : eventWithoutHeaders;
    expect(sanitizedNoHeaders).toEqual({ message: 'Test error' });
  });

  it('uses default tracesSampleRate in development when SENTRY_TRACES_SAMPLE_RATE is not provided', () => {
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    process.env.NODE_ENV = 'development';

    jest.isolateModules(() => {
      require('../instrument');
    });

    const initMock = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
    const calls = initMock.mock.calls as unknown as [[SentryInitOptions]];
    expect(calls[0][0].tracesSampleRate).toBe(1.0);
  });

  it('uses default tracesSampleRate in production when SENTRY_TRACES_SAMPLE_RATE is not provided', () => {
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    process.env.NODE_ENV = 'production';

    jest.isolateModules(() => {
      require('../instrument');
    });

    const initMock = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
    const calls = initMock.mock.calls as unknown as [[SentryInitOptions]];
    expect(calls[0][0].tracesSampleRate).toBe(0.2);
  });
});
