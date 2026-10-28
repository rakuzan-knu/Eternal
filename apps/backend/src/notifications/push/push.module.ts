import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../../redis/redis.module';
import { ExpoPushClient } from './expo-push.client';
import { PushDevicesService } from './push-devices.service';
import { PushDispatchService } from './push-dispatch.service';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ExpoPushClient, PushDevicesService, PushDispatchService],
  exports: [PushDevicesService, PushDispatchService],
})
export class PushModule {}
