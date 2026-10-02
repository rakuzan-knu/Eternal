import { Module, forwardRef } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { FamilySafeguardService } from './family-safeguard.service';
import { ScreenTimeGuard } from './guards/screen-time.guard';
import { RedisModule } from '../redis/redis.module';
import { MessengerModule } from '../messenger/messenger.module';
import { PrismaModule } from '@common/prisma';

@Module({
  imports: [RedisModule, PrismaModule, forwardRef(() => MessengerModule)],
  controllers: [FamilyController],
  providers: [FamilyService, FamilySafeguardService, ScreenTimeGuard],
  exports: [FamilyService, FamilySafeguardService, ScreenTimeGuard],
})
export class FamilyModule {}
