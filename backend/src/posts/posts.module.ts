import { Module } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  controllers: [PostsController],
  providers: [
    PostsService,
    PostsRepository,
    {
      provide: 'IPostRepository',
      useClass: PostsRepository,
    },
  ],
  exports: ['IPostRepository'],
})
export class PostsModule {}
