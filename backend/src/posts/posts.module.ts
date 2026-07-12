import { Module } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';

@Module({
  controllers: [PostsController],
  providers: [
    PostsService,
    PostsRepository,
    {
      provide: POSTS_REPOSITORY,
      useClass: PostsRepository,
    },
  ],
  exports: [POSTS_REPOSITORY],
})
export class PostsModule {}
