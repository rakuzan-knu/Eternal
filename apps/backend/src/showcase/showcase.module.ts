import { Module, forwardRef } from '@nestjs/common';
import { ShowcaseController } from './showcase.controller';
import { ShowcaseService } from './showcase.service';
import { MediaProxyService } from './media-proxy.service';
import { PrismaModule } from '@common/prisma';
import { RedisModule } from '../redis/redis.module';
import { SHOWCASE_REPOSITORY } from './interfaces/showcase-repository.interface';
import { ShowcaseRepository } from './repositories/showcase.repository';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [PrismaModule, RedisModule, forwardRef(() => IntegrationsModule)],
  controllers: [ShowcaseController],
  providers: [
    ShowcaseService,
    MediaProxyService,
    {
      provide: SHOWCASE_REPOSITORY,
      useClass: ShowcaseRepository,
    },
  ],
  exports: [ShowcaseService, MediaProxyService],
})
export class ShowcaseModule {}
