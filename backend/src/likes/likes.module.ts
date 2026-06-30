import { Module } from '@nestjs/common';
import { LikesRepository } from './likes.repository';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';

@Module({
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
