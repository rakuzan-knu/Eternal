import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';
import { HealthRepository } from './health.repository';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthRepository, HealthService],
  exports: [HealthService],
})
export class HealthModule {}
