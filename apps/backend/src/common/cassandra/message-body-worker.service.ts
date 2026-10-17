import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { runsBackground } from '../../config/service-role';
import { MessageBodyService } from './message-body.service';
import { MessageBodyRepository } from './message-body.repository';

@Injectable()
export class MessageBodyWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageBodyWorkerService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running: Promise<void> | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly history: MessageBodyService,
    private readonly bodies: MessageBodyRepository,
  ) {}

  onModuleInit(): void {
    if (
      process.env.NODE_ENV === 'test' ||
      !runsBackground('messenger') ||
      !this.bodies.configured ||
      this.config.get<string>('MESSAGE_BODY_ARCHIVE_ENABLED') !== 'true'
    )
      return;
    this.timer = setInterval(() => this.tick(), 60_000);
    this.timer.unref();
  }

  private tick(): void {
    if (this.running || !runsBackground('messenger')) return;
    this.running = this.drain().finally(() => {
      this.running = undefined;
    });
  }

  private async drain(): Promise<void> {
    const deadline = Date.now() + 15_000;
    try {
      for (let count = 0; count < 50 && Date.now() < deadline; count++)
        if (!(await this.history.processOne())) break;
    } catch {
      this.logger.warn('Message history synchronization unavailable; durable work retained');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
}
