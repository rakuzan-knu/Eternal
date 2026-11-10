import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { OutboxStatus, Prisma, type OutboxEvent } from '@prisma/client';
import type {
  CreateOutboxEventInput,
  IOutboxRepository,
} from '../interfaces/outbox-repository.interface';
import { TELEMETRY_EVENTS } from '../../cassandra/telemetry-sync.repository';
import { MESSAGE_BODY_EVENTS } from '../../cassandra/message-body.service';

@Injectable()
export class OutboxRepository implements IOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(
    data: CreateOutboxEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEvent> {
    const client = tx || this.prisma;
    return client.outboxEvent.create({
      data: {
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        eventType: data.eventType,
        payload: data.payload,
        status: OutboxStatus.PENDING,
        ...(data.headers !== undefined ? { headers: data.headers } : {}),
      },
    });
  }

  async createEvents(
    data: CreateOutboxEventInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<OutboxEvent[]> {
    if (data.length === 0) return [];
    const client = tx || this.prisma;
    const events: OutboxEvent[] = [];
    for (const item of data) {
      const created = await client.outboxEvent.create({
        data: {
          aggregateType: item.aggregateType,
          aggregateId: item.aggregateId,
          eventType: item.eventType,
          payload: item.payload,
          status: OutboxStatus.PENDING,
          ...(item.headers !== undefined ? { headers: item.headers } : {}),
        },
      });
      events.push(created);
    }
    return events;
  }

  async claimPendingEvents(batchSize: number, maxRetries: number): Promise<OutboxEvent[]> {
    return this.prisma.$transaction(async (tx) => {
      const candidateEvents = await tx.$queryRaw<OutboxEvent[]>(Prisma.sql`
        SELECT id, aggregate_type AS "aggregateType", aggregate_id AS "aggregateId",
          event_type AS "eventType", payload, headers, status, retry_count AS "retryCount",
          last_error AS "lastError", processed_at AS "processedAt", created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM outbox_events
        WHERE event_type NOT IN (${Prisma.join([...TELEMETRY_EVENTS, ...MESSAGE_BODY_EVENTS, 'public_search.user.sync'])})
          AND (status = 'PENDING' OR (status = 'FAILED' AND retry_count < ${maxRetries}))
        ORDER BY created_at ASC LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      `);

      if (candidateEvents.length === 0) {
        return [];
      }

      const eventIds = candidateEvents.map((e) => e.id);
      await tx.outboxEvent.updateMany({
        where: {
          id: { in: eventIds },
          status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
        },
        data: {
          status: OutboxStatus.PROCESSING,
          updatedAt: new Date(),
        },
      });

      return candidateEvents;
    });
  }

  async markAsPublished(eventId: string): Promise<void> {
    // Delivery/retries need the full payload until success. Only known ordinary
    // terminal events can discard content; specialized/unknown consumers retain theirs.
    await this.prisma.$executeRaw`
      UPDATE outbox_events SET status = 'PUBLISHED', processed_at = NOW(), updated_at = NOW(),
        last_error = NULL,
        payload = CASE WHEN event_type IN ('COMMUNITY_CHANGED', 'POST_CREATED', 'MESSAGE_SENT', 'NOTIFICATION_CREATED')
          THEN '{}'::jsonb ELSE payload END,
        headers = CASE WHEN event_type IN ('COMMUNITY_CHANGED', 'POST_CREATED', 'MESSAGE_SENT', 'NOTIFICATION_CREATED')
          THEN NULL ELSE headers END
      WHERE id = ${eventId} AND status = 'PROCESSING'
    `;
  }

  async markAsFailed(eventId: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.updateMany({
      where: { id: eventId, status: OutboxStatus.PROCESSING },
      data: {
        status: OutboxStatus.FAILED,
        retryCount: { increment: 1 },
        lastError: error.slice(0, 2000),
      },
    });
  }
}
