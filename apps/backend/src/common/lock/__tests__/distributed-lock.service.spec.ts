import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { DistributedLockService } from '../distributed-lock.service';
import { RedisService } from '../../../redis/redis.service';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let mockRedisClient: {
    status: string;
    set: jest.Mock;
    eval: jest.Mock;
  };
  let mockRedisService: Partial<RedisService>;

  beforeEach(async () => {
    mockRedisClient = {
      status: 'ready',
      set: jest.fn().mockResolvedValue('OK'),
      eval: jest.fn().mockResolvedValue(1),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DistributedLockService, { provide: RedisService, useValue: mockRedisService }],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
  });

  it('acquires lock when Redis SET NX succeeds', async () => {
    const lock = await service.acquire('resource:1', { ttlMs: 1000, retryCount: 0 });

    expect(lock).not.toBeNull();
    expect(lock?.resource).toBe('resource:1');
    expect(lock?.token).toBeDefined();
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'resource:1',
      expect.any(String),
      'PX',
      1000,
      'NX',
    );
  });

  it('returns null when lock cannot be acquired after retries', async () => {
    mockRedisClient.set.mockResolvedValue(null);

    const lock = await service.acquire('resource:1', {
      ttlMs: 500,
      retryCount: 1,
      retryDelayMs: 10,
    });

    expect(lock).toBeNull();
    expect(mockRedisClient.set).toHaveBeenCalledTimes(2);
  });

  it('releases lock using atomic Lua script', async () => {
    const lock = {
      resource: 'resource:1',
      token: 'token-abc',
      expiresAt: Date.now() + 1000,
      validityTimeMs: 1000,
    };

    const released = await service.release(lock);

    expect(released).toBe(true);
    expect(mockRedisClient.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("del", KEYS[1])'),
      1,
      'resource:1',
      'token-abc',
    );
  });

  it('executes withLock and releases lock automatically', async () => {
    const action = jest.fn().mockResolvedValue('success');

    const result = await service.withLock('resource:1', action, { ttlMs: 2000, retryCount: 0 });

    expect(result).toBe('success');
    expect(action).toHaveBeenCalled();
    expect(mockRedisClient.set).toHaveBeenCalled();
    expect(mockRedisClient.eval).toHaveBeenCalled();
  });
});
