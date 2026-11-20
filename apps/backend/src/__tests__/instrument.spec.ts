import * as Sentry from '@sentry/nestjs';

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

vi.mock('@sentry/nestjs', async (importOriginal) => ({
  ...(await importOriginal<typeof Sentry>()),
  init: vi.fn(),
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

  it('configures Sentry with custom traces sample rate and beforeSend hook', async () => {
    process.env.SENTRY_DSN = 'https://custom@sentry.io/123';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.75';
    process.env.NODE_ENV = 'production';

    vi.resetModules();
    await import('../instrument.js');

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
    expect(sanitized.request?.headers).toBeUndefined();

    // Test beforeSend when request or headers are undefined
    const eventWithoutHeaders = { message: 'Test error' };
    const sanitizedNoHeaders = initCall.beforeSend
      ? initCall.beforeSend(eventWithoutHeaders)
      : eventWithoutHeaders;
    expect(sanitizedNoHeaders).toEqual({ message: 'Test error' });
  });

  it('uses default tracesSampleRate in development when SENTRY_TRACES_SAMPLE_RATE is not provided', async () => {
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    process.env.NODE_ENV = 'development';

    vi.resetModules();
    await import('../instrument.js');

    const initMock = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
    const calls = initMock.mock.calls as unknown as [[SentryInitOptions]];
    expect(calls[0][0].tracesSampleRate).toBe(1.0);
  });

  it('uses default tracesSampleRate in production when SENTRY_TRACES_SAMPLE_RATE is not provided', async () => {
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    process.env.NODE_ENV = 'production';

    vi.resetModules();
    await import('../instrument.js');

    const initMock = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
    const calls = initMock.mock.calls as unknown as [[SentryInitOptions]];
    expect(calls[0][0].tracesSampleRate).toBe(0.2);
  });

  it.each([
    'https://api.example.test/v1/users/me/data-export',
    'https://messages.example.test/v1/messenger/me/data-export/',
    'https://api.example.test/v1/auth/register',
    'https://api.example.test/v1/auth/login',
    undefined,
  ])(
    'removes export passwords and cursors from Sentry events and transactions for %s',
    async (url) => {
      vi.resetModules();
      await import('../instrument.js');
      const options = vi.mocked(Sentry.init).mock.calls[0]?.[0];
      if (!options?.beforeSend || !options.beforeSendTransaction || !options.beforeBreadcrumb)
        throw new Error('Missing Sentry sanitization callbacks');
      expect(options.integrations).toEqual([expect.objectContaining({ name: 'Http' })]);
      expect(options.dataCollection).toEqual({
        httpBodies: [],
        httpHeaders: false,
        cookies: false,
        urlQueryParams: false,
        userInfo: false,
      });
      const request = {
        method: 'POST',
        ...(url ? { url: `${url}?cursor=private-continuation#private-fragment` } : {}),
        data: {
          password: 'must-not-leave-server',
          cursor: 'private-continuation',
          email: 'fixture@example.test',
        },
        cookies: { session: 'private-cookie' },
        query_string: 'private-query',
        headers: {
          Authorization: 'Bearer private-jwt',
          Cookie: 'private-cookie',
          'X-Forwarded-For': '192.0.2.4',
        },
      };
      const event = await options.beforeSend(
        { type: undefined, request: structuredClone(request) },
        {},
      );
      const trace = {
        trace_id: '0123456789abcdef0123456789abcdef',
        span_id: '0123456789abcdef',
        data: {
          'http.client_ip': '192.0.2.4',
          'http.user_agent': 'private-user-agent',
          'http.target': '/v1/auth/check-username?username=private-handle',
          url: '/v1/messenger/communities/invites/private-invite',
          'http.response.status_code': 500,
        },
      };
      const transaction = await options.beforeSendTransaction(
        {
          type: 'transaction',
          request: structuredClone(request),
          transaction: 'GET /v1/messenger/communities/invites/private-invite',
          contexts: { trace },
        },
        {},
      );
      for (const sanitized of [event, transaction]) {
        expect(sanitized?.request).toEqual({ method: 'POST', ...(url ? { url } : {}) });
      }
      expect(transaction?.contexts?.trace?.data).toEqual({
        'http.target': '/v1/auth/check-username',
        url: '/v1/messenger/communities/invites/[REDACTED]',
        'http.response.status_code': 500,
      });
      expect(transaction?.transaction).toBe('GET /v1/messenger/communities/invites/[REDACTED]');
      expect(
        options.beforeBreadcrumb(
          {
            category: 'http',
            data: { url: '/v1/messenger/communities/invites/private-invite?cursor=private-offset' },
          },
          {},
        ),
      ).toMatchObject({
        category: 'http',
        data: { url: '/v1/messenger/communities/invites/[REDACTED]' },
      });
    },
  );
});
