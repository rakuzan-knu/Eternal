import type { OutboxEvent, Prisma } from '@prisma/client';

export interface CreateOutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  headers?: Prisma.InputJsonValue;
}

export interface IOutboxRepository {
  createEvent(data: CreateOutboxEventInput, tx?: Prisma.TransactionClient): Promise<OutboxEvent>;
  createEvents(
    data: CreateOutboxEventInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEvent[]>;
  claimPendingEvents(batchSize: number, maxRetries: number): Promise<OutboxEvent[]>;
  markAsPublished(eventId: string): Promise<void>;
  markAsFailed(eventId: string, error: string): Promise<void>;
}
