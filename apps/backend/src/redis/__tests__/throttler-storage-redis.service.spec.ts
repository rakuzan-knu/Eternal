import { ThrottlerStorageRedisService } from '../throttler-storage-redis.service';
import type Redis from 'ioredis';

describe('ThrottlerStorageRedisService', () => {
  let service: ThrottlerStorageRedisService;
  let mockClient: {
    status: string;
    eval: jest.Mock;
  };

  beforeEach(() => {
    mockClient = {
      status: 'ready',
      eval: jest.fn(),
    };

    service = new ThrottlerStorageRedisService(mockClient as unknown as Redis);
  });

  it('increments hit count and parses Redis response correctly', async () => {
    mockClient.eval.mockResolvedValueOnce([1, 59500, 0, 0]);

    const res = await service.increment('test-key', 60000, 10, 0, 'default');

    expect(res).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(mockClient.eval).toHaveBeenCalledWith(
      expect.any(String),
      2,
      'throttle:default:test-key',
      'throttle:default:test-key:blocked',
      60000,
      10,
      0,
    );
  });

  it('returns blocked state when limit is exceeded', async () => {
    mockClient.eval.mockResolvedValueOnce([11, 45000, 1, 60000]);

    const res = await service.increment('test-key', 60000, 10, 60000, 'auth');

    expect(res).toEqual({
      totalHits: 11,
      timeToExpire: 45,
      isBlocked: true,
      timeToBlockExpire: 60,
    });
  });

  it('falls back to fail-open response when Redis status is disconnected', async () => {
    mockClient.status = 'close';

    const res = await service.increment('test-key', 60000, 10, 0, 'default');

    expect(res).toEqual({
      totalHits: 1,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
    expect(mockClient.eval).not.toHaveBeenCalled();
  });

  it('handles Redis error by degrading gracefully without throwing', async () => {
    mockClient.eval.mockRejectedValueOnce(new Error('Redis connection timed out'));

    const res = await service.increment('test-key', 30000, 5, 0, 'default');

    expect(res).toEqual({
      totalHits: 1,
      timeToExpire: 30,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });
});
