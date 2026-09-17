import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { OutboxService } from '../outbox.service';
import { OUTBOX_REPOSITORY } from '../outbox.constants';
import type { IOutboxRepository } from '../interfaces/outbox-repository.interface';
import { OutboxStatus, type OutboxEvent } from '@prisma/client';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockOutboxRepo: jest.Mocked<IOutboxRepository>;

  const sampleEvent: OutboxEvent = {
    id: 'evt-123',
    aggregateType: 'POST',
    aggregateId: 'post-123',
    eventType: 'POST_CREATED',
    payload: { postId: 'post-123', authorId: 'user-1' },
    headers: null,
    status: OutboxStatus.PENDING,
    retryCount: 0,
    lastError: null,
    processedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockOutboxRepo = {
      createEvent: jest.fn().mockResolvedValue(sampleEvent),
      createEvents: jest.fn().mockResolvedValue([sampleEvent]),
      claimPendingEvents: jest.fn().mockResolvedValue([sampleEvent]),
      markAsPublished: jest.fn().mockResolvedValue(undefined),
      markAsFailed: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: OUTBOX_REPOSITORY,
          useValue: mockOutboxRepo,
        },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  it('should record outbox event successfully', async () => {
    const result = await service.recordEvent({
      aggregateType: 'POST',
      aggregateId: 'post-123',
      eventType: 'POST_CREATED',
      payload: { postId: 'post-123', authorId: 'user-1' },
    });

    expect(result).toEqual(sampleEvent);
    expect(mockOutboxRepo.createEvent).toHaveBeenCalledWith(
      {
        aggregateType: 'POST',
        aggregateId: 'post-123',
        eventType: 'POST_CREATED',
        payload: { postId: 'post-123', authorId: 'user-1' },
      },
      undefined,
    );
  });

  it('should record multiple outbox events in batch', async () => {
    const result = await service.recordEvents([
      {
        aggregateType: 'POST',
        aggregateId: 'post-123',
        eventType: 'POST_CREATED',
        payload: { postId: 'post-123' },
      },
    ]);

    expect(result).toHaveLength(1);
    expect(mockOutboxRepo.createEvents).toHaveBeenCalled();
  });
});
