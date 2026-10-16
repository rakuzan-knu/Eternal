import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { runsBackground } from '../../config/service-role';
import { UnreadProjectionService } from './unread-projection.service';

@Injectable()
export class UnreadReconciliationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UnreadReconciliationWorker.name);
  private timer?: NodeJS.Timeout;
  private stopped = true;
  private cursor = '';
  private failed = false;

  constructor(private readonly projection: UnreadProjectionService) {}

  onModuleInit(): void {
    if (
      !runsBackground('messenger') ||
      process.env.UNREAD_PROJECTION_RECONCILE_ENABLED !== 'true' ||
      process.env.NODE_ENV === 'test'
    )
      return;
    this.stopped = false;
    this.schedule();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule(): void {
    if (this.stopped) return;
    const interval = Math.max(
      1_000,
      Number(process.env.UNREAD_PROJECTION_RECONCILE_INTERVAL_MS) || 30_000,
    );
    this.timer = setTimeout(() => {
      void this.poll();
    }, interval);
    this.timer.unref();
  }

  private async poll(): Promise<void> {
    try {
      const result = await this.projection.reconcileBatch(
        this.cursor,
        Number(process.env.UNREAD_PROJECTION_RECONCILE_BATCH_SIZE) || 25,
      );
      this.cursor = result.wrapped ? '' : result.cursor;
      this.failed = false;
    } catch (error) {
      if (!this.failed) this.logger.warn(`Unread reconciliation delayed: ${String(error)}`);
      this.failed = true;
    } finally {
      this.schedule();
    }
  }
}
