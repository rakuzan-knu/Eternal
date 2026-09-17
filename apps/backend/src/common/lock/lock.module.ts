import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { DistributedLockService } from './distributed-lock.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [DistributedLockService],
  exports: [DistributedLockService],
})
export class LockModule {}
