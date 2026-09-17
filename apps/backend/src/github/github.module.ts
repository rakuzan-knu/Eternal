import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { GITHUB_REPOSITORY } from './interfaces/github-repository.interface';
import { GithubRepository } from './repositories/github.repository';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule],
  controllers: [GithubController],
  providers: [
    GithubService,
    {
      provide: GITHUB_REPOSITORY,
      useClass: GithubRepository,
    },
  ],
  exports: [GithubService],
})
export class GithubModule {}
