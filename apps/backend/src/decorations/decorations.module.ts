import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { DecorationsController } from './decorations.controller';
import { DecorationsService } from './decorations.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [DecorationsController],
  providers: [DecorationsService],
})
export class DecorationsModule {}
