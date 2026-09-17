import { SearchIndexingProcessor } from '../search-indexing.processor';
import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '../../../redis/redis.service';
import type { Job } from 'bullmq';
import { SearchJobType } from '../../queue.constants';

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
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

describe('SearchIndexingProcessor', () => {
  let processor: SearchIndexingProcessor;
  let mockConfigService: { get: jest.Mock };
  let mockRedisService: { incr: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };
    mockRedisService = {
      incr: jest.fn().mockResolvedValue(1),
    };
    processor = new SearchIndexingProcessor(
      mockConfigService as unknown as ConfigService,
      mockRedisService as unknown as RedisService,
    );
  });

  afterEach(async () => {
    await processor.onModuleDestroy();
  });

  it('indexes hashtags by incrementing Redis counter', async () => {
    const job = {
      name: SearchJobType.INDEX_HASHTAG,
      data: {
        id: 'msg-1',
        type: 'hashtag',
        tags: ['#typescript', '#nestjs'],
      },
    } as unknown as Job;

    await processor.processJob(job);
    expect(mockRedisService.incr).toHaveBeenCalledWith('hashtag:count:typescript');
    expect(mockRedisService.incr).toHaveBeenCalledWith('hashtag:count:nestjs');
  });

  it('processes user and post indexing without error', async () => {
    const job = {
      name: SearchJobType.INDEX_USER,
      data: {
        id: 'usr-1',
        type: 'user',
      },
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();
  });
});
