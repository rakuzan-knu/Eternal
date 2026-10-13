import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { OutboxPublisherService } from '../outbox-publisher.service';
import { OUTBOX_REPOSITORY, OUTBOX_EVENT_TYPES } from '../outbox.constants';
import type { IOutboxRepository } from '../interfaces/outbox-repository.interface';
import { RedisService } from '../../../redis/redis.service';
import { QueueService } from '../../../queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxStatus, type OutboxEvent } from '@prisma/client';
import { vi } from 'vitest';

describe('OutboxPublisherService', () => {
  let service: OutboxPublisherService;
  let mockOutboxRepo: jest.Mocked<IOutboxRepository>;
  let mockRedisService: Partial<RedisService>;
  let mockQueueService: Partial<QueueService>;
  let mockEventEmitter: Partial<EventEmitter2>;

  const sampleEvent: OutboxEvent = {
    id: 'evt-1',
    aggregateType: 'POST',
    aggregateId: 'post-1',
    eventType: OUTBOX_EVENT_TYPES.POST_CREATED,
    payload: { postId: 'post-1', content: 'Hello #world' },
    headers: null,
    status: OutboxStatus.PROCESSING,
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockOutboxRepo = {
      createEvent: jest.fn(),
      createEvents: jest.fn(),
      claimPendingEvents: jest.fn().mockResolvedValue([sampleEvent]),
      markAsPublished: jest.fn().mockResolvedValue(undefined),
      markAsFailed: jest.fn().mockResolvedValue(undefined),
    };

    mockRedisService = {
      acquireLock: jest.fn().mockResolvedValue('token-123'),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    mockQueueService = {
      addSearchIndexingJob: jest.fn().mockResolvedValue(undefined),
      addMessageJob: jest.fn().mockResolvedValue(undefined),
      addNotificationJob: jest.fn().mockResolvedValue(undefined),
    };

    mockEventEmitter = {
      emit: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxPublisherService,
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepo },
        { provide: RedisService, useValue: mockRedisService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OutboxPublisherService>(OutboxPublisherService);
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('claims and publishes pending outbox events', async () => {
    const processed = await service.processOutboxBatch();

    expect(processed).toBe(1);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalled();
    expect(mockQueueService.addSearchIndexingJob).toHaveBeenCalled();
    expect(mockOutboxRepo.markAsPublished).toHaveBeenCalledWith('evt-1');
    expect(mockRedisService.releaseLock).toHaveBeenCalled();
  });

  it('marks event as failed if publishing throws an error', async () => {
    (mockQueueService.addSearchIndexingJob as jest.Mock).mockRejectedValueOnce(
      new Error('Broker unreachable'),
    );

    const processed = await service.processOutboxBatch();

    expect(processed).toBe(1);
    expect(mockOutboxRepo.markAsFailed).toHaveBeenCalledWith(
      'evt-1',
      expect.stringContaining('Broker unreachable'),
    );
  });

  it('backs off empty polling up to ten seconds and resumes fast polling after work', async () => {
    vi.useFakeTimers();
    vi.stubEnv('ENABLE_OUTBOX_POLLER_IN_TEST', 'true');
    mockOutboxRepo.claimPendingEvents.mockResolvedValue([]);
    service.onModuleInit();

    await vi.advanceTimersByTimeAsync(15000); // polls at 1, 3, 7 and 15 seconds
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(9999);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(4);

    mockOutboxRepo.claimPendingEvents.mockResolvedValue([sampleEvent]);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockOutboxRepo.markAsPublished).toHaveBeenCalledWith('evt-1');
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(6);
  });

  it('retries unavailable storage after five seconds and stops cleanly on shutdown', async () => {
    vi.useFakeTimers();
    vi.stubEnv('ENABLE_OUTBOX_POLLER_IN_TEST', 'true');
    mockOutboxRepo.claimPendingEvents.mockRejectedValueOnce(new Error('Unavailable'));
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(1000);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(2);
    service.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(30000);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(2);
  });

  it('does not overlap a slow batch with another poll', async () => {
    vi.useFakeTimers();
    vi.stubEnv('ENABLE_OUTBOX_POLLER_IN_TEST', 'true');
    let finishBatch: ((events: OutboxEvent[]) => void) | undefined;
    mockOutboxRepo.claimPendingEvents.mockImplementationOnce(
      () =>
        new Promise<OutboxEvent[]>((resolve) => {
          finishBatch = resolve;
        }),
    );
    service.onModuleInit();
    await vi.advanceTimersByTimeAsync(20000);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(1);
    finishBatch?.([]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockOutboxRepo.claimPendingEvents).toHaveBeenCalledTimes(2);
  });
});
