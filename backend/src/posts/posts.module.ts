import { Module } from '@nestjs/common';
import { PostsRepository } from './posts.repository';

@Module({
  providers: [
    PostsRepository,
    {
      provide: 'IPostRepository',
      useClass: PostsRepository,
    },
  ],
})
export class PostsModule {}