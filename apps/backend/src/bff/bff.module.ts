import { roleControllers } from '../config/service-role';
import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { RedisModule } from '../redis';
import { FeedBffController } from './feed-bff.controller';
import { FeedBffService } from './feed-bff.service';

@Module({
  imports: [PostsModule, RedisModule],
  controllers: roleControllers('core', [FeedBffController]),
  providers: [FeedBffService],
  exports: [FeedBffService],
})
export class BffModule {}
