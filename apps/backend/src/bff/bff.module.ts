import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { RedisModule } from '../redis';
import { FeedBffController } from './feed-bff.controller';
import { FeedBffService } from './feed-bff.service';

@Module({
  imports: [PostsModule, RedisModule],
  controllers: [FeedBffController],
  providers: [FeedBffService],
  exports: [FeedBffService],
})
export class BffModule {}
