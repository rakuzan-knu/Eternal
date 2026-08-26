import { Module } from '@nestjs/common';
import { ShowcaseController } from './showcase.controller';
import { ShowcaseService } from './showcase.service';
import { MediaProxyService } from './media-proxy.service';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ShowcaseController],
  providers: [ShowcaseService, MediaProxyService],
  exports: [ShowcaseService, MediaProxyService],
})
export class ShowcaseModule {}
