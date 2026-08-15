import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { validateEnv } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { LikesModule } from './likes/likes.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { FollowersModule } from './followers/followers.module';
import { AvatarsModule } from './avatars/avatars.module';
import { BannersModule } from './banners/banners.module';
import { MessengerModule } from './messenger/messenger.module';
import { SessionsModule } from './sessions/sessions.module';
import { MetricsModule } from './metrics/metrics.module';
import { PollModule } from './poll/poll.module';
import { GithubModule } from './github/github.module';
import { OpenGraphModule } from './opengraph/opengraph.module';

import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    SentryModule.forRoot(),

    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    ScheduleModule.forRoot(),
    MetricsModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    HealthModule,
    PostsModule,
    LikesModule,
    CommentsModule,
    UsersModule,
    FollowersModule,
    AvatarsModule,
    BannersModule,
    MessengerModule,
    SessionsModule,
    PollModule,
    GithubModule,
    OpenGraphModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
