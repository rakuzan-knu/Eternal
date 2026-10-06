import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ProfileFramesService } from './profile-frames.service';
import { ProfileFramesController } from './profile-frames.controller';
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ProfileFramesService],
  controllers: [ProfileFramesController],
})
export class ProfileFramesModule {}
