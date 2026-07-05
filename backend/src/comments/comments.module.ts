import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsRepository } from './comments.repository';
import { CommentsService } from './comments.service';

@Module({
  controllers: [CommentsController],
  providers: [
    CommentsService,
    {
      provide: 'ICommentsRepository',
      useClass: CommentsRepository,
    },
  ],
})
export class CommentsModule {}
