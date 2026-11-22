import { Module, forwardRef } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { ScreenTimeGuard } from './guards/screen-time.guard';
import { MessengerModule } from '../messenger/messenger.module';
import { PrismaModule } from '@common/prisma';
import { FamilySafetyModule } from './family-safety.module';
import { roleControllers } from '../config/service-role';

@Module({
  imports: [PrismaModule, FamilySafetyModule, forwardRef(() => MessengerModule)],
  controllers: roleControllers('core', [FamilyController]),
  providers: [FamilyService, ScreenTimeGuard],
  exports: [FamilyService, FamilySafetyModule, ScreenTimeGuard],
})
export class FamilyModule {}
