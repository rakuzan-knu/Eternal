import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { TraceContext } from './common/tracing/trace-context';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './auth';
import { CommentsModule } from './comments/comments.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { LikesModule } from './likes/likes.module';
import { PostsModule } from './posts/posts.module';
import { BffModule } from './bff/bff.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { PrismaModule } from '@common/prisma';
import { DataLoaderModule } from './common/dataloader';
import { RedisModule, ThrottlerStorageRedisService } from './redis';
import { QueueModule } from './queue';
import { UsersModule } from './users/users.module';
import { FollowersModule } from './followers/followers.module';
import { AvatarsModule } from './avatars/avatars.module';
import { BannersModule } from './banners/banners.module';
import { MessengerModule } from './messenger/messenger.module';
import { SessionsModule } from './sessions/sessions.module';
import { MetricsModule } from './metrics/metrics.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PollModule } from './poll/poll.module';
import { GithubModule } from './github/github.module';
import { OpenGraphModule } from './opengraph/opengraph.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { ShowcaseModule } from './showcase/showcase.module';
import { StoriesModule } from './stories/stories.module';
import { ReelsModule } from './reels/reels.module';
import { WorkersModule } from './common/workers';
import { MemoryModule } from './common/memory/memory.module';
import { E2eeModule } from './crypto/e2ee/e2ee.module';
import { OutboxModule } from './common/outbox/outbox.module';
import { LockModule } from './common/lock';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { SnowflakeModule } from './common/id/snowflake.module';
import {
  ResilienceModule,
  LoadSheddingGuard,
  QueryComplexityGuard,
  DeadlockDetectionInterceptor,
} from './common/resilience';
import { VersioningModule, DeprecationInterceptor } from './common/versioning';
import { SerializationModule } from './common/serialization';
import { CrdtModule } from './common/crdt/crdt.module';
import { BloomModule } from './common/bloom/bloom.module';
import { TextPipelineModule } from './common/text-pipeline/text-pipeline.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { StorageModule } from './common/storage/storage.module';

import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

import { MetricsMiddleware } from './metrics/metrics.middleware';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const isTest = configService.get<string>('NODE_ENV') === 'test';
        const configuredLogLevel = configService.get<string>('LOG_LEVEL');
        const defaultLogLevel = isProduction ? 'info' : 'info';
        return {
          pinoHttp: {
            level: isTest ? 'silent' : configuredLogLevel || defaultLogLevel,
            ...(isProduction
              ? {}
              : {
                  transport: {
                    target: 'pino-pretty',
                    options: {
                      colorize: true,
                      singleLine: true,
                      translateTime: 'HH:MM:ss',
                      ignore: 'pid,hostname,req.headers,res.headers',
                    },
                  },
                }),
            customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) => {
              if (res.statusCode >= 500 || error) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            customSuccessMessage: (
              req: IncomingMessage,
              res: ServerResponse,
              responseTime: number,
            ) => {
              return `${req.method || 'GET'} ${req.url || '/'} -> ${res.statusCode} (${Math.round(responseTime)}ms)`;
            },
            customErrorMessage: (req: IncomingMessage, res: ServerResponse, error: Error) => {
              return `${req.method || 'GET'} ${req.url || '/'} -> ${res.statusCode} (${error.message})`;
            },
            genReqId: (req: IncomingMessage) => {
              const headerVal =
                req.headers['x-trace-id'] ||
                req.headers['x-correlation-id'] ||
                req.headers['x-request-id'];
              const rawId = Array.isArray(headerVal) ? headerVal[0] : headerVal;
              return (rawId && typeof rawId === 'string' ? rawId : undefined) || randomUUID();
            },
            customProps: (req: IncomingMessage) => {
              const store = TraceContext.getStore();
              return {
                traceId:
                  store?.traceId ||
                  (req as unknown as { traceId?: string }).traceId ||
                  (req as unknown as { id?: string }).id,
                userId: store?.userId || (req as unknown as { user?: { id?: string } }).user?.id,
              };
            },
            mixin: () => {
              const store = TraceContext.getStore();
              if (store) {
                return {
                  traceId: store.traceId,
                  correlationId: store.correlationId || store.traceId,
                  ...(store.userId ? { userId: store.userId } : {}),
                };
              }
              return {};
            },
            serializers: {
              req: (req: IncomingMessage & { id?: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                ...(isProduction
                  ? {
                      headers: {
                        host: req.headers.host,
                        'user-agent': req.headers['user-agent'],
                        'x-trace-id': req.headers['x-trace-id'],
                        'x-correlation-id': req.headers['x-correlation-id'],
                        authorization: req.headers.authorization ? '[REDACTED]' : undefined,
                        cookie: req.headers.cookie ? '[REDACTED]' : undefined,
                      },
                    }
                  : {}),
              }),
              res: (res: ServerResponse) => ({
                statusCode: res.statusCode,
              }),
              err: (err: Error & { type?: string }) => ({
                type: err.type || err.name,
                message: err.message,
                stack: err.stack,
              }),
            },
            autoLogging: {
              ignore: (req: IncomingMessage) =>
                Boolean(
                  req.url && (req.url.startsWith('/health') || req.url.startsWith('/metrics')),
                ),
            },
          },
        };
      },
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [ThrottlerStorageRedisService],
      useFactory: (storage: ThrottlerStorageRedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60_000,
            limit: 100,
          },
          {
            name: 'auth',
            ttl: 60_000,
            limit: 10,
            skipIf: (context) => {
              const handler = context.getHandler();
              const classRef = context.getClass();
              return (
                Reflect.getMetadata('THROTTLER:LIMITauth', handler) === undefined &&
                Reflect.getMetadata('THROTTLER:LIMITauth', classRef) === undefined
              );
            },
          },
          {
            name: 'sensitive',
            ttl: 60_000,
            limit: 30,
            skipIf: (context) => {
              const handler = context.getHandler();
              const classRef = context.getClass();
              return (
                Reflect.getMetadata('THROTTLER:LIMITsensitive', handler) === undefined &&
                Reflect.getMetadata('THROTTLER:LIMITsensitive', classRef) === undefined
              );
            },
          },
        ],
        storage,
      }),
    }),
    ScheduleModule.forRoot(),
    StorageModule,
    MetricsModule,
    PrismaModule,
    DataLoaderModule,
    RedisModule,
    QueueModule,
    AuthModule,
    HealthModule,
    PostsModule,
    BffModule,
    FeatureFlagsModule,
    LikesModule,
    CommentsModule,
    UsersModule,
    FollowersModule,
    AvatarsModule,
    BannersModule,
    MessengerModule,
    EventEmitterModule.forRoot({
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    SessionsModule,
    PollModule,
    GithubModule,
    OpenGraphModule,
    NotificationsModule,
    SitemapModule,
    ShowcaseModule,
    StoriesModule,
    ReelsModule,
    WorkersModule,
    MemoryModule,
    E2eeModule,
    OutboxModule,
    LockModule,
    IdempotencyModule,
    SnowflakeModule,
    TextPipelineModule,
    ResilienceModule,
    VersioningModule,
    SerializationModule,
    CrdtModule,
    BloomModule,
    IntegrationsModule,
  ],

  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: LoadSheddingGuard,
    },
    {
      provide: APP_GUARD,
      useClass: QueryComplexityGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DeadlockDetectionInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DeprecationInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
