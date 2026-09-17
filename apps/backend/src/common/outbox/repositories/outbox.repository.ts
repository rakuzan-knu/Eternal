import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { OutboxStatus, type OutboxEvent, type Prisma } from '@prisma/client';
import type {
  CreateOutboxEventInput,
  IOutboxRepository,
} from '../interfaces/outbox-repository.interface';

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
      const candidateEvents = await tx.outboxEvent.findMany({
        where: {
          OR: [
            { status: OutboxStatus.PENDING },
            {
              status: OutboxStatus.FAILED,
              retryCount: { lt: maxRetries },
            },
          ],
        },
        orderBy: [{ createdAt: 'asc' }],
        take: batchSize,
      });

      if (candidateEvents.length === 0) {
        return [];
      }

      const eventIds = candidateEvents.map((e) => e.id);
      await tx.outboxEvent.updateMany({
        where: { id: { in: eventIds } },
        data: {
          status: OutboxStatus.PROCESSING,
          updatedAt: new Date(),
        },
      });

      return candidateEvents;
    });
  }

  async markAsPublished(eventId: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.PUBLISHED,
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markAsFailed(eventId: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.FAILED,
        retryCount: { increment: 1 },
        lastError: error.slice(0, 2000),
      },
    });
  }
}
