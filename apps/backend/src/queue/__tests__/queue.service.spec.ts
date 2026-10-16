import { QueueService } from '../queue.service';
import type { ConfigService } from '@nestjs/config';
import {
  NotificationJobType,
  MediaJobType,
  SearchJobType,
  MessageJobType,
  QUEUE_NOTIFICATIONS,
  QUEUE_VIDEO_TRANSCODE,
} from '../queue.constants';
import { Queue } from 'bullmq';

const mockQueueAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
const mockQueueClose = jest.fn().mockResolvedValue(undefined);
const mockGetJob = jest.fn();
const mockGetJobCounts = jest.fn().mockResolvedValue({
  waiting: 3,
  active: 1,
  completed: 20,
  failed: 0,
  delayed: 2,
});

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(function () {
      return {
        add: mockQueueAdd,
        close: mockQueueClose,
        getJobCounts: mockGetJobCounts,
        getJob: mockGetJob,
        on: jest.fn().mockReturnThis(),
        client: Promise.resolve({ on: jest.fn() }),
        waitUntilReady: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(function () {
    return {
      on: jest.fn().mockReturnThis(),
      status: 'ready',
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };
  });
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
    expect(metrics).toHaveLength(6);
    expect(metrics.find((metric) => metric.name === QUEUE_VIDEO_TRANSCODE)).toBeDefined();
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

  it('bounds completed and failed jobs by both age and count', () => {
    service.onModuleInit();
    const options = jest
      .mocked(Queue)
      .mock.calls.find(([name]) => name === QUEUE_VIDEO_TRANSCODE)?.[1];
    expect(options?.defaultJobOptions).toMatchObject({
      attempts: 3,
      removeOnComplete: { age: 3600, count: 25 },
      removeOnFail: { age: 7 * 24 * 3600, count: 100 },
    });
  });

  it('can retry video jobs from the DLQ while preserving the storage reference', async () => {
    service.onModuleInit();
    const remove = jest.fn().mockResolvedValue(undefined);
    const data = {
      reelId: 'reel-1',
      videoUrl: 'https://example.com/clip.mp4',
      sourceStorageKey: 'reels/clip.mp4',
    };
    mockGetJob.mockResolvedValue({
      data: { originalQueue: QUEUE_VIDEO_TRANSCODE, jobName: 'video_hls_transcode', data },
      remove,
    });

    await expect(service.retryDeadLetterJob('dlq-1')).resolves.toBe(true);

    expect(mockQueueAdd).toHaveBeenCalledWith('video_hls_transcode', data);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
