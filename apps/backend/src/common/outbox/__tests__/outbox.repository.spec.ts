import { Test } from '@nestjs/testing';
import { OutboxStatus, type OutboxEvent, type Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxRepository } from '../repositories/outbox.repository';

describe('ordinary outbox claim and failure transitions', () => {
  const query = vi.fn<(sql: Prisma.Sql) => Promise<OutboxEvent[]>>();
  const updateMany = vi.fn();
  let repository: OutboxRepository;
  const event: OutboxEvent = {
    id: 'event-1',
    aggregateType: 'MESSAGE',
    aggregateId: 'message-1',
    eventType: 'MESSAGE_SENT',
    payload: { messageView: { body: 'synthetic pending body' } },
    headers: { traceId: 'synthetic-trace' },
    status: OutboxStatus.PENDING,
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  beforeEach(async () => {
    vi.resetAllMocks();
    const tx = { $queryRaw: query, outboxEvent: { updateMany } };
    const module = await Test.createTestingModule({
      providers: [
        OutboxRepository,
        {
          provide: PrismaService,
          useValue: {
            ...tx,
            $transaction: (run: (db: typeof tx) => Promise<unknown>) => run(tx),
          },
        },
      ],
    }).compile();
    repository = module.get(OutboxRepository);
  });

  it('claims under a row lock while retaining the full payload and headers for delivery', async () => {
    query.mockResolvedValue([event]);
    updateMany.mockResolvedValue({ count: 1 });
    expect(await repository.claimPendingEvents(10, 5)).toEqual([event]);
    expect(query.mock.calls[0]?.[0].text).toContain('FOR UPDATE SKIP LOCKED');
    const updatedAt: unknown = expect.any(Date);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: [event.id] },
        status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
      },
      data: { status: OutboxStatus.PROCESSING, updatedAt },
    });
  });

  it('does not issue a claim update when no events are eligible', async () => {
    query.mockResolvedValue([]);
    expect(await repository.claimPendingEvents(10, 5)).toEqual([]);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('fails only a processing event, increments retries and bounds the error without touching content', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    await repository.markAsFailed(event.id, 'x'.repeat(2100));
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: event.id, status: OutboxStatus.PROCESSING },
      data: {
        status: OutboxStatus.FAILED,
        retryCount: { increment: 1 },
        lastError: 'x'.repeat(2000),
      },
    });
  });
});
