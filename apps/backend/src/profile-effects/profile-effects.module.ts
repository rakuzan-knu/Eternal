import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ProfileEffectsService } from './profile-effects.service';
import { ProfileEffectsController } from './profile-effects.controller';
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ProfileEffectsService],
  controllers: [ProfileEffectsController],
})
export class ProfileEffectsModule {}
