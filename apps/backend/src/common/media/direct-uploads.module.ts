import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../../redis/redis.module';
import { roleControllers, runsBackground } from '../../config/service-role';
import { StorageModule } from '../storage/storage.module';
import { DirectUploadsController } from './direct-uploads.controller';
import { DirectUploadsService } from './direct-uploads.service';
import { MediaBudgetService } from './media-budget.service';
import { MediaAccessRepository } from './media-access.repository';
import { ResourceUsageRepository } from './resource-usage.repository';
import { ResourceBudgetService } from './resource-budget.service';

@Global()
@Module({
  imports: [ConfigModule, StorageModule, PrismaModule, RedisModule],
  controllers: roleControllers('core', [DirectUploadsController]),
  providers: [
    DirectUploadsService,
    MediaBudgetService,
    MediaAccessRepository,
    ResourceUsageRepository,
    ...(runsBackground('core') ? [ResourceBudgetService] : []),
  ],
  exports: [DirectUploadsService, MediaBudgetService],
})
export class DirectUploadsModule {}
