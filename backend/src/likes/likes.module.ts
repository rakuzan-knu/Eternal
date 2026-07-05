import { Module } from '@nestjs/common';
import { LikesRepository } from './likes.repository';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PostsModule],
  controllers: [LikesController],
  providers: [
    LikesService,
    LikesRepository,
    {
      provide: 'ILikesRepository',
      useClass: LikesRepository,
    },
  ],
})
export class LikesModule {}
