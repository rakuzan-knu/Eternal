import { QueueService } from '../queue.service';
import type { ConfigService } from '@nestjs/config';
import {
  NotificationJobType,
  MediaJobType,
  SearchJobType,
  MessageJobType,
  QUEUE_NOTIFICATIONS,
} from '../queue.constants';

const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
const mockQueueClose = jest.fn().mockResolvedValue(undefined);
const mockGetJobCounts = jest.fn().mockResolvedValue({
  waiting: 3,
  active: 1,
  completed: 20,
  failed: 0,
  delayed: 2,
});

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: mockQueueAdd,
      close: mockQueueClose,
      getJobCounts: mockGetJobCounts,
      on: jest.fn().mockReturnThis(),
      client: Promise.resolve({ on: jest.fn() }),
      waitUntilReady: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
    status: 'ready',
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  }));
  return {
    default: MockRedis,
    Redis: MockRedis,
    __esModule: true,
  };
});

describe('QueueService', () => {
  let service: QueueService;
  let mockConfigService: {
    get: jest.Mock;
  };

  let prevTestBullmq: string | undefined;

  beforeEach(() => {
    prevTestBullmq = process.env.TEST_BULLMQ;
    process.env.TEST_BULLMQ = 'true';
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };
    service = new QueueService(mockConfigService as unknown as ConfigService);
  });

  afterEach(async () => {
    if (prevTestBullmq !== undefined) {
      process.env.TEST_BULLMQ = prevTestBullmq;
    } else {
      delete process.env.TEST_BULLMQ;
    }
    await service.onModuleDestroy();
  });

  it('initializes queues when REDIS_URL is configured', () => {
    service.onModuleInit();
    expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL');
  });

  it('handles missing REDIS_URL gracefully in passive mode', () => {
    mockConfigService.get.mockReturnValueOnce(undefined);
    service.onModuleInit();
    expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL');
  });

  it('adds jobs to notifications queue', async () => {
    service.onModuleInit();
    await service.addNotificationJob(NotificationJobType.PUSH, { userId: 'u-1' });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      NotificationJobType.PUSH,
      { userId: 'u-1' },
      undefined,
    );
  });

  it('adds jobs to media previews queue', async () => {
    service.onModuleInit();
    await service.addMediaPreviewJob(MediaJobType.IMAGE_OPTIMIZE, { bufferBase64: 'abc' });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      MediaJobType.IMAGE_OPTIMIZE,
      { bufferBase64: 'abc' },
      undefined,
    );
  });

  it('adds jobs to search indexing queue', async () => {
    service.onModuleInit();
    await service.addSearchIndexingJob(SearchJobType.INDEX_HASHTAG, { tags: ['#react'] });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      SearchJobType.INDEX_HASHTAG,
      { tags: ['#react'] },
      undefined,
    );
  });

  it('adds jobs to messages queue', async () => {
    service.onModuleInit();
    await service.addMessageJob(MessageJobType.FANOUT, { conversationId: 'c-1' });
    expect(mockQueueAdd).toHaveBeenCalledWith(
      MessageJobType.FANOUT,
      { conversationId: 'c-1' },
      undefined,
    );
  });

  it('returns queue metrics for initialized queues', async () => {
    service.onModuleInit();
    const metrics = await service.getQueueMetrics();
    expect(metrics).toHaveLength(5);
    expect(metrics[0]).toMatchObject({
      name: QUEUE_NOTIFICATIONS,
      waiting: 3,
      active: 1,
      completed: 20,
      failed: 0,
      delayed: 2,
      total: 6,
    });
  });
});
