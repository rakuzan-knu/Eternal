import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsRepository } from './feature-flags.repository';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { FEATURE_FLAGS_REPOSITORY } from './interfaces/feature-flags-repository.interface';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FeatureFlagsController],
  providers: [
    FeatureFlagsRepository,
    {
      provide: FEATURE_FLAGS_REPOSITORY,
      useClass: FeatureFlagsRepository,
    },
    FeatureFlagsService,
    FeatureFlagGuard,
  ],
  exports: [FeatureFlagsService, FEATURE_FLAGS_REPOSITORY, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
