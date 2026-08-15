import { Module } from '@nestjs/common';
import { OpenGraphService } from './opengraph.service';
import { OpenGraphController } from './opengraph.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [OpenGraphController],
  providers: [OpenGraphService],
  exports: [OpenGraphService],
})
export class OpenGraphModule {}
