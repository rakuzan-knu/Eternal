import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { NameplatesService } from './nameplates.service';
import { NameplatesController } from './nameplates.controller';
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [NameplatesService],
  controllers: [NameplatesController],
})
export class NameplatesModule {}
