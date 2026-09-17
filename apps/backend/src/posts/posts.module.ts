import { Module, forwardRef } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsMediaService } from './posts-media.service';
import { postsS3Provider } from './s3-provider';
import { PrismaModule } from '@common/prisma';
import { MessengerModule } from '../messenger/messenger.module';
import { SnowflakeModule } from '../common/id/snowflake.module';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';

import { PostStatsCoalescerService } from './coalescing/post-stats-coalescer.service';

import { FeedScoringService } from './feed-scoring.service';

@Module({
  imports: [PrismaModule, forwardRef(() => MessengerModule), SnowflakeModule],
  controllers: [PostsController],
  providers: [
    postsS3Provider,
    PostsMediaService,
    FeedScoringService,
    PostsService,
    PostStatsCoalescerService,
    PostsRepository,
    {
      provide: POSTS_REPOSITORY,
      useClass: PostsRepository,
    },
  ],
  exports: [PostsService, PostStatsCoalescerService, FeedScoringService, POSTS_REPOSITORY],
})
export class PostsModule {}
