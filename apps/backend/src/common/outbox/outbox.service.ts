import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OutboxEvent, Prisma } from '@prisma/client';
import { OUTBOX_REPOSITORY } from './outbox.constants';
import type {
  CreateOutboxEventInput,
  IOutboxRepository,
} from './interfaces/outbox-repository.interface';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepo: IOutboxRepository,
  ) {}

  async recordEvent(
    event: CreateOutboxEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEvent> {
    this.logger.debug(
      `Recording outbox event: ${event.eventType} for aggregate ${event.aggregateType}:${event.aggregateId}`,
    );
    return this.outboxRepo.createEvent(event, tx);
  }

  async recordEvents(
    events: CreateOutboxEventInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEvent[]> {
    if (events.length === 0) return [];
    return this.outboxRepo.createEvents(events, tx);
  }
}
