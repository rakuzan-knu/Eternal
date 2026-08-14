import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  controllers: [GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
