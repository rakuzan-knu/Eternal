import { Global, Module } from '@nestjs/common';
import { RedisModule } from '../../redis/redis.module';
import { IdempotencyInterceptor } from './idempotency.interceptor';

@Global()
@Module({
  imports: [RedisModule],
  providers: [IdempotencyInterceptor],
  exports: [IdempotencyInterceptor],
})
export class IdempotencyModule {}
