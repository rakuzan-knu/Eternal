import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';
import { HealthRepository } from './health.repository';
import { HealthService } from './health.service';
import { roleControllers } from '../config/service-role';

@Module({
  imports: [TerminusModule, PrismaModule, RedisModule],
  controllers: roleControllers('all', [HealthController]),
  providers: [HealthRepository, HealthService],
  exports: [HealthService],
})
export class HealthModule {}
