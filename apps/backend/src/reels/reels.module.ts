import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { ReelsRepository } from './repositories/reels.repository';
import { REELS_REPOSITORY } from './interfaces/reels-repository.interface';
import { reelsS3Provider } from './s3-provider';

@Module({
  imports: [PrismaModule],
  controllers: [ReelsController],
  providers: [
    reelsS3Provider,
    ReelsService,
    ReelsRepository,
    {
      provide: REELS_REPOSITORY,
      useClass: ReelsRepository,
    },
  ],
  exports: [ReelsService, REELS_REPOSITORY],
})
export class ReelsModule {}
