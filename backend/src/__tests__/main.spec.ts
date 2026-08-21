/* eslint-disable @typescript-eslint/no-require-imports */
import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';

jest.mock('../instrument', () => ({}));
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('../app.module', () => ({
  AppModule: class MockAppModule {},
}));

jest.mock('@nestjs/core', () => {
  const actual: Record<string, unknown> = jest.requireActual('@nestjs/core');
  return {
    ...actual,
    NestFactory: {
      create: jest.fn(),
    },
  };
});

jest.mock('@nestjs/swagger', () => {
  const actual: Record<string, unknown> = jest.requireActual('@nestjs/swagger');
  return {
    ...actual,
    DocumentBuilder: jest.fn().mockImplementation(() => ({
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addBearerAuth: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    })),
    SwaggerModule: {
      createDocument: jest.fn().mockReturnValue({}),
      setup: jest.fn(),
    },
  };
});

jest.mock('helmet', () => jest.fn(() => jest.fn()));
jest.mock('@nestjs/platform-socket.io', () => ({
  IoAdapter: jest.fn().mockImplementation(() => ({})),
}));

interface CorsCallback {
  (err: Error | null, allow?: boolean): void;
}

interface CorsOptions {
  origin: (this: void, origin: string | null, cb: CorsCallback) => void;
  credentials?: boolean;
}

interface ServerlessModule {
  default: (req: Request, res: Response) => Promise<void>;
}

describe('main.ts handler and bootstrap', () => {
  const originalEnv = process.env;
  let mockApp: {
    set: jest.Mock;
    use: jest.Mock;
    enableCors: jest.Mock;
    useWebSocketAdapter: jest.Mock;
    listen: jest.Mock;
    init: jest.Mock;
    getHttpAdapter: jest.Mock;
  };
  let mockHttpInstance: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    mockHttpInstance = jest.fn();

    mockApp = {
      set: jest.fn(),
      use: jest.fn(),
      enableCors: jest.fn(),
      useWebSocketAdapter: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
      init: jest.fn().mockResolvedValue(undefined),
      getHttpAdapter: jest.fn().mockReturnValue({
        getInstance: () => mockHttpInstance,
      }),
    };

    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('runs serverless handler and initializes cachedApp on first request', async () => {
    let handler: ((req: Request, res: Response) => Promise<void>) | undefined;

    process.env.NODE_ENV = 'production';
    process.env.VERCEL = '1';
    process.env.CORS_ORIGIN = 'http://localhost:3000, https://myapp.vercel.app';

    jest.isolateModules(() => {
      const mod = require('../main') as ServerlessModule;
      handler = mod.default;
    });

    const req = { url: '/api/health' } as unknown as Request;
    const res = { status: jest.fn() } as unknown as Response;

    const createSpy = jest.spyOn(NestFactory, 'create');
    const setSpy = jest.spyOn(mockApp, 'set');
    const initSpy = jest.spyOn(mockApp, 'init');

    // First call: initializes app
    if (handler) {
      await handler(req, res);
    }

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith('trust proxy', 1);
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(mockHttpInstance).toHaveBeenCalledWith(req, res);

    // Second call: re-uses cachedApp
    const req2 = { url: '/api/users' } as unknown as Request;
    if (handler) {
      await handler(req2, res);
    }
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(mockHttpInstance).toHaveBeenCalledWith(req2, res);
  });

  it('handles CORS options callback in bootstrap', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL;
    process.env.CORS_ORIGIN = 'http://allowed-domain.com';

    jest.isolateModules(() => {
      require('../main');
    });

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const corsSpy = jest.spyOn(mockApp, 'enableCors');
    expect(corsSpy).toHaveBeenCalled();
    const calls = corsSpy.mock.calls as unknown as Array<[CorsOptions]>;
    const corsOptions = calls[0]?.[0];
    const invokeOrigin = (origin: string | null, cb: CorsCallback) => {
      if (corsOptions) {
        Reflect.apply(corsOptions.origin, undefined, [origin, cb]);
      }
    };

    // Allowed because no origin (same-origin / curl / server-to-server)
    const cb1 = jest.fn();
    invokeOrigin(null, cb1);
    expect(cb1).toHaveBeenCalledWith(null, true);

    // Allowed because in allowedOrigins
    const cb2 = jest.fn();
    invokeOrigin('http://allowed-domain.com', cb2);
    expect(cb2).toHaveBeenCalledWith(null, true);

    // Allowed because ends with .vercel.app
    const cb3 = jest.fn();
    invokeOrigin('https://preview-deploy.vercel.app', cb3);
    expect(cb3).toHaveBeenCalledWith(null, true);

    // Allowed because NODE_ENV !== 'production'
    const cb4 = jest.fn();
    invokeOrigin('http://random-origin.org', cb4);
    expect(cb4).toHaveBeenCalledWith(null, true);
  });

  it('rejects disallowed origin in production mode', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;
    process.env.CORS_ORIGIN = 'http://allowed-domain.com';

    jest.isolateModules(() => {
      require('../main');
    });

    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const corsSpy = jest.spyOn(mockApp, 'enableCors');
    expect(corsSpy).toHaveBeenCalled();
    const calls = corsSpy.mock.calls as unknown as Array<[CorsOptions]>;
    const corsOptions = calls[0]?.[0];
    const invokeOrigin = (origin: string | null, cb: CorsCallback) => {
      if (corsOptions) {
        Reflect.apply(corsOptions.origin, undefined, [origin, cb]);
      }
    };

    const cb = jest.fn();
    invokeOrigin('http://evil-origin.com', cb);
    expect(cb).toHaveBeenCalledWith(new Error('Not allowed by CORS'), false);
  });

  it('sets DIRECT_URL to DATABASE_URL if DIRECT_URL is missing', () => {
    delete process.env.DIRECT_URL;
    process.env.DATABASE_URL = 'postgresql://fallback:5432/db';

    jest.isolateModules(() => {
      require('../main');
    });

    expect(process.env.DIRECT_URL).toBe('postgresql://fallback:5432/db');
  });
});
