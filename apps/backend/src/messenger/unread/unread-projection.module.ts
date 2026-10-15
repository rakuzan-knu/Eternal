import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { UnreadProjectionService } from './unread-projection.service';
import { UnreadReconciliationWorker } from './unread-reconciliation.worker';

@Module({
  imports: [PrismaModule],
  providers: [UnreadProjectionService, UnreadReconciliationWorker],
  exports: [UnreadProjectionService],
})
export class UnreadProjectionModule {}
