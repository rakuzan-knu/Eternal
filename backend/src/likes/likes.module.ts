import { Module } from '@nestjs/common';
import { LikesRepository } from './likes.repository';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PostsModule } from '../posts/posts.module';
import { LIKES_REPOSITORY } from './interfaces/likes-repository.interface';

@Module({
  imports: [PostsModule],
  controllers: [LikesController],
  providers: [
    LikesService,
    LikesRepository,
    {
      provide: LIKES_REPOSITORY,
      useClass: LikesRepository,
    },
  ],
})
export class LikesModule {}
