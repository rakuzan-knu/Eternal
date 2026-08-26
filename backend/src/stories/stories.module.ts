import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { FollowersModule } from '../followers/followers.module';
import { MessengerModule } from '../messenger/messenger.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { StoriesRepository } from './stories.repository';
import { StoriesRetentionService } from './stories-retention.service';

@Module({
  imports: [PrismaModule, RedisModule, FollowersModule, forwardRef(() => MessengerModule)],
  controllers: [StoriesController],
  providers: [StoriesService, StoriesRepository, StoriesRetentionService],
  exports: [StoriesService, StoriesRepository],
})
export class StoriesModule {}
