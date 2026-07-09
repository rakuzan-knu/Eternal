import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.validation';
import { CommentsModule } from './comments/comments.module';
import { HealthModule } from './health/health.module';
import { LikesModule } from './likes/likes.module';
import { PostsModule } from './posts/posts.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { FollowersModule } from './followers/followers.module';
import { AvatarsModule } from './avatars/avatars.module';
import { MessengerModule } from './messenger/messenger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
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
    MessengerModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
