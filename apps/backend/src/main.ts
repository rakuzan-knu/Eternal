import { EventEmitter } from 'node:events';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { type INestApplication, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as zlib from 'zlib';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { setupGracefulShutdown } from './common/lifecycle/graceful-shutdown';
import { setupFdGuard } from './common/lifecycle/fd-guard';
import './instrument';

EventEmitter.defaultMaxListeners = 50;
if (typeof process.setMaxListeners === 'function') {
  process.setMaxListeners(50);
}

const logger = new Logger('Bootstrap');

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

let cachedApp: INestApplication | undefined;

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter({
    trustProxy: 1,
    bodyLimit: 10485760,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  setupFdGuard(app);

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  await app.register(fastifyCookie);

  await app.register(fastifyCompress, {
    threshold: 1024,
    encodings: ['br', 'gzip', 'deflate'],
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
      },
    },
    zlibOptions: {
      level: 6,
    },
  });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 10,
    },
    attachFieldsToBody: false,
  });

  const uploadDir = process.env.LOCAL_STORAGE_DIR
    ? path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR)
    : path.resolve(process.cwd(), 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });

  await app.register(fastifyStatic, {
    root: uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
  });

  setupApiVersioning(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    exposedHeaders: [
      'Content-Range',
      'X-Total-Count',
      'X-Trace-Id',
      'X-Correlation-Id',
      'X-Idempotency-Key',
      'X-Idempotent-Replay',
      'X-Cache-Lookup',
    ],
    credentials: true,
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(process.env.REDIS_URL);
  app.useWebSocketAdapter(redisIoAdapter);

  const config = new DocumentBuilder()
    .setTitle('Social Network API')
    .setDescription(
      'Social Network backend API documentation with RFC 8594 Deprecation & Versioning',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.enableShutdownHooks();
  setupGracefulShutdown(app, redisIoAdapter);

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Server running on port ${port}`);

  // Fallback forwarder on port 5000 in case legacy GitHub OAuth callback reaches port 5000
  if (Number(port) !== 5000) {
    try {
      const httpModule = await import('http');
      const forwarder = httpModule.createServer((req, res) => {
        const targetUrl = `http://localhost:${port}${req.url || ''}`;
        res.writeHead(302, { Location: targetUrl });
        res.end();
      });
      forwarder.listen(5000, '0.0.0.0', () => {
        logger.log(`OAuth fallback forwarder listening on port 5000 -> ${port}`);
      });
      forwarder.on('error', (err: Error) => {
        logger.warn(`Port 5000 forwarder skipped: ${err.message}`);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`Port 5000 forwarder setup failed: ${msg}`);
    }
  }
}

function setupApiVersioning(app: NestFastifyApplication): void {
  if (typeof app.enableVersioning === 'function') {
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
  }

  const httpAdapter = typeof app.getHttpAdapter === 'function' ? app.getHttpAdapter() : undefined;
  const fastifyRaw = httpAdapter?.getInstance?.() as unknown as {
    server?: {
      prependListener?: (
        event: string,
        listener: (
          req: {
            url?: string;
            method?: string;
            headers: Record<string, string | string[] | undefined>;
          },
          res: unknown,
        ) => void,
      ) => void;
    };
  };

  const server = fastifyRaw?.server;
  if (server && typeof server.prependListener === 'function') {
    server.prependListener('request', (req) => {
      let rawUrl = req.url || '';
      if (rawUrl.startsWith('/v1/v1/')) {
        rawUrl = rawUrl.replace(/^\/v1\/v1\//, '/v1/');
        req.url = rawUrl;
      }
      const [pathOnly, query] = rawUrl.split('?');
      if (
        pathOnly &&
        !pathOnly.startsWith('/v1') &&
        !pathOnly.startsWith('/v2') &&
        !pathOnly.startsWith('/health') &&
        !pathOnly.startsWith('/api/health') &&
        !pathOnly.startsWith('/metrics') &&
        !pathOnly.startsWith('/ping') &&
        !pathOnly.startsWith('/api/ping') &&
        !pathOnly.startsWith('/api/docs') &&
        !pathOnly.startsWith('/uploads') &&
        !pathOnly.startsWith('/socket.io') &&
        !pathOnly.startsWith('/favicon.ico')
      ) {
        req.url = `/v1${pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`}${query ? `?${query}` : ''}`;
        req.headers['x-legacy-unversioned'] = 'true';
      }
    });
  }
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  void bootstrap();
}

// Vercel Serverless Handler
export default async function handler(req: Request, res: Response): Promise<void> {
  if (!cachedApp) {
    const fastifyAdapter = new FastifyAdapter({
      trustProxy: 1,
      bodyLimit: 10485760,
    });
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter, {
      bufferLogs: true,
    });
    app.useLogger(app.get(PinoLogger));
    await app.register(fastifyHelmet, { contentSecurityPolicy: false });
    await app.register(fastifyCookie);
    await app.register(fastifyCompress, {
      threshold: 1024,
      encodings: ['br', 'gzip', 'deflate'],
    });
    await app.register(fastifyMultipart, {
      limits: { fileSize: 100 * 1024 * 1024, files: 10 },
      attachFieldsToBody: false,
    });
    const uploadDir = process.env.LOCAL_STORAGE_DIR
      ? path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR)
      : path.resolve(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    await app.register(fastifyStatic, {
      root: uploadDir,
      prefix: '/uploads/',
      decorateReply: false,
    });
    setupApiVersioning(app);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
    });
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(process.env.REDIS_URL);
    app.useWebSocketAdapter(redisIoAdapter);
    await app.init();
    await (app.getHttpAdapter().getInstance() as unknown as { ready: () => Promise<void> }).ready();
    cachedApp = app;
  }
  const fastifyInstance = cachedApp.getHttpAdapter().getInstance() as unknown as {
    server: { emit: (e: string, req: unknown, res: unknown) => void };
  };
  fastifyInstance.server.emit('request', req, res);
}
