import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { OutboxPublisherService } from '../outbox-publisher.service';
import { OUTBOX_REPOSITORY, OUTBOX_EVENT_TYPES } from '../outbox.constants';
import type { IOutboxRepository } from '../interfaces/outbox-repository.interface';
import { RedisService } from '../../../redis/redis.service';
import { QueueService } from '../../../queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxStatus, type OutboxEvent } from '@prisma/client';

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
});
