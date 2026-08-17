import type Redis from 'ioredis';
import { RedisService } from '../redis.service';

describe('RedisService', () => {
  let service: RedisService;
  let mockRedisClient: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
    scanStream: jest.Mock;
    unlink: jest.Mock;
    zadd: jest.Mock;
    zrangebyscore: jest.Mock;
    zremrangebyrank: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
    sadd: jest.Mock;
    srem: jest.Mock;
    scard: jest.Mock;
  };

  beforeEach(() => {
    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      scanStream: jest.fn(),
      unlink: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zrangebyscore: jest.fn().mockResolvedValue([]),
      zremrangebyrank: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(0),
    };

    service = new RedisService(mockRedisClient as unknown as Redis);
  });

  it('getClient returns underlying redis client', () => {
    expect(service.getClient()).toBe(mockRedisClient);
  });

  it('set, get, del, exists operate on redis client', async () => {
    await service.set('key-1', 'val-1', 60);
    expect(mockRedisClient.set).toHaveBeenCalledWith('key-1', 'val-1', 'EX', 60);

    mockRedisClient.get.mockResolvedValueOnce('val-1');
    expect(await service.get('key-1')).toBe('val-1');

    await service.del('key-1');
    expect(mockRedisClient.del).toHaveBeenCalledWith('key-1');

    expect(await service.exists('key-1')).toBe(true);
  });

  it('getOrSet returns cached value if available', async () => {
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ test: 'cached' }));
    const loader = jest.fn();

    const result = await service.getOrSet('test-key', 60, loader);

    expect(result).toEqual({ test: 'cached' });
    expect(loader).not.toHaveBeenCalled();
  });

  it('getOrSet executes loader and caches value when cache misses', async () => {
    mockRedisClient.get.mockResolvedValueOnce(null);
    const loader = jest.fn().mockResolvedValue({ test: 'fresh' });

    const result = await service.getOrSet('test-key', 60, loader);

    expect(result).toEqual({ test: 'fresh' });
    expect(loader).toHaveBeenCalled();
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ test: 'fresh' }),
      'EX',
      expect.any(Number),
    );
  });

  it('delByPattern deletes matching keys from scanStream', async () => {
    async function* asyncGenerator() {
      await Promise.resolve();
      yield ['key:1', 'key:2'];
    }
    mockRedisClient.scanStream.mockReturnValue(asyncGenerator());

    await service.delByPattern('key:*');

    expect(mockRedisClient.unlink).toHaveBeenCalledWith('key:1', 'key:2');
  });
});
