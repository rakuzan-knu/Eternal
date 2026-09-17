import { Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { E2eeService } from './e2ee.service';
import { E2eeController } from './e2ee.controller';

@Module({
  imports: [RedisModule],
  controllers: [E2eeController],
  providers: [E2eeService],
  exports: [E2eeService],
})
export class E2eeModule {}
