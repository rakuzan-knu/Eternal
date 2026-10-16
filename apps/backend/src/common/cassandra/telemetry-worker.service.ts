import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { TelemetrySyncRepository } from './telemetry-sync.repository';
import { CassandraTelemetryRepository } from './cassandra-telemetry.repository';
import { runsBackground } from '../../config/service-role';

@Injectable()
export class TelemetryWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryWorkerService.name);
  private timer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    private readonly sync: TelemetrySyncRepository,
    private readonly cassandra: CassandraTelemetryRepository,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV !== 'test' && this.cassandra.configured && runsBackground('messenger'))
      this.schedule();
  }

  private schedule(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      void this.run();
    }, 60000);
    this.timer.unref();
  }

  private async run(): Promise<void> {
    if (!runsBackground('messenger')) return;
    try {
      const deadline = Date.now() + 15000;
      for (let count = 0; count < 5 && !this.stopped && Date.now() < deadline; count++) {
        if (!(await this.sync.processOne())) break;
      }
    } catch {
      this.logger.warn('Cassandra synchronization deferred; durable intent retained');
    } finally {
      this.schedule();
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }
}
