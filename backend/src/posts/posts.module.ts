import { Module, forwardRef } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { PostsMediaService } from './posts-media.service';
import { postsS3Provider } from './s3-provider';
import { PrismaModule } from '../prisma/prisma.module';
import { MessengerModule } from '../messenger/messenger.module';
import { POSTS_REPOSITORY } from './interfaces/posts-repository.interface';

@Module({
  imports: [PrismaModule, forwardRef(() => MessengerModule)],
  controllers: [PostsController],
  providers: [
    postsS3Provider,
    PostsMediaService,
    PostsService,
    PostsRepository,
    {
      provide: POSTS_REPOSITORY,
      useClass: PostsRepository,
    },
  ],
  exports: [PostsService, POSTS_REPOSITORY],
})
export class PostsModule {}
