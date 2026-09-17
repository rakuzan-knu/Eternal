import type Redis from 'ioredis';
import { Logger } from '@nestjs/common';
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
    smembers: jest.Mock;
    geoadd: jest.Mock;
    geodist: jest.Mock;
    geosearch: jest.Mock;
    georadius: jest.Mock;
    eval: jest.Mock;
    mget: jest.Mock;
    pipeline: jest.Mock;
    multi: jest.Mock;
    status: string;
  };

  beforeEach(() => {
    mockRedisClient = {
      status: 'ready',
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      eval: jest.fn().mockResolvedValue(1),
      mget: jest.fn(),
      pipeline: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      scanStream: jest.fn(),
      unlink: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zrangebyscore: jest.fn().mockResolvedValue(['item1']),
      zremrangebyrank: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      scard: jest.fn().mockResolvedValue(3),
      smembers: jest.fn().mockResolvedValue(['m1', 'm2']),
      geoadd: jest.fn().mockResolvedValue(1),
      geodist: jest.fn().mockResolvedValue('4.5'),
      geosearch: jest.fn().mockResolvedValue(['loc1', 'loc2']),
      georadius: jest.fn().mockResolvedValue(['loc1']),
      multi: jest.fn().mockReturnValue({
        sadd: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    service = new RedisService(mockRedisClient as unknown as Redis);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getClient returns underlying redis client', () => {
    expect(service.getClient()).toBe(mockRedisClient);
  });

  it('mutex lock: acquireLock, releaseLock, and withLock', async () => {
    // Successful acquire and release
    mockRedisClient.set.mockResolvedValueOnce('OK');
    const token = await service.acquireLock('lock:test', 2000);
    expect(token).toBeDefined();
    expect(mockRedisClient.set).toHaveBeenCalledWith('lock:test', token, 'PX', 2000, 'NX');

    const released = await service.releaseLock('lock:test', token!);
    expect(released).toBe(true);
    expect(mockRedisClient.eval).toHaveBeenCalled();

    // Acquire failure when already held
    mockRedisClient.set.mockResolvedValueOnce(null);
    expect(await service.acquireLock('lock:held')).toBeNull();

    // withLock execution
    mockRedisClient.set.mockResolvedValue('OK');
    const actionResult = await service.withLock('lock:action', async () => 'computed');
    expect(actionResult).toBe('computed');

    // withLock failure after retries
    mockRedisClient.set.mockResolvedValue(null);
    await expect(
      service.withLock('lock:fail', async () => 'never', { retryCount: 1, retryDelayMs: 10 }),
    ).rejects.toThrow('Failed to acquire lock');
  });

  it('getOrSetWithProbabilisticEarlyExpiration reads cache or recomputes', async () => {
    // Cache miss
    mockRedisClient.get.mockResolvedValueOnce(null);
    const loader = jest.fn().mockResolvedValue({ status: 'ok' });
    const fresh = await service.getOrSetWithProbabilisticEarlyExpiration('cache:key', 60, loader);
    expect(fresh).toEqual({ status: 'ok' });

    // Cache hit with valid payload
    const payload = JSON.stringify({
      value: { status: 'cached' },
      ttl: 60,
      savedAt: Date.now(),
      deltaMs: 10,
    });
    mockRedisClient.get.mockResolvedValueOnce(payload);
    const cached = await service.getOrSetWithProbabilisticEarlyExpiration('cache:key', 60, loader);
    expect(cached).toEqual({ status: 'cached' });
  });

  it('set, get, del, exists operate on redis client and catch errors', async () => {
    await service.set('key-1', 'val-1', 60);
    expect(mockRedisClient.set).toHaveBeenCalledWith('key-1', 'val-1', 'EX', 60);

    mockRedisClient.get.mockResolvedValueOnce('val-1');
    expect(await service.get('key-1')).toBe('val-1');

    await service.del('key-1');
    expect(mockRedisClient.del).toHaveBeenCalledWith('key-1');

    expect(await service.exists('key-1')).toBe(true);

    // Error handling
    mockRedisClient.set.mockRejectedValueOnce(new Error('fail'));
    await expect(service.set('key', 'val')).resolves.not.toThrow();

    mockRedisClient.get.mockRejectedValueOnce(new Error('fail'));
    expect(await service.get('uncached-key')).toBeNull();

    mockRedisClient.del.mockRejectedValueOnce(new Error('fail'));
    await expect(service.del('key')).resolves.not.toThrow();

    mockRedisClient.exists.mockRejectedValueOnce(new Error('fail'));
    expect(await service.exists('key')).toBe(false);
  });

  it('getOrSet returns cached value or executes loader and catches errors', async () => {
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ test: 'cached' }));
    const loader = jest.fn();
    const result = await service.getOrSet('test-key', 60, loader);
    expect(result).toEqual({ test: 'cached' });

    mockRedisClient.get.mockRejectedValueOnce(new Error('get fail'));
    mockRedisClient.set.mockRejectedValueOnce(new Error('set fail'));
    const freshLoader = jest.fn().mockResolvedValue({ test: 'fresh' });
    const fresh = await service.getOrSet('fresh-key', 60, freshLoader);
    expect(fresh).toEqual({ test: 'fresh' });

    // Singleflight: concurrent calls for same key coalesce into single execution
    mockRedisClient.get.mockResolvedValue(null);
    let executionCount = 0;
    const slowLoader = jest.fn(async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { count: executionCount };
    });

    const [res1, res2] = await Promise.all([
      service.getOrSet('concurrent-key', 60, slowLoader),
      service.getOrSet('concurrent-key', 60, slowLoader),
    ]);

    expect(res1).toEqual({ count: 1 });
    expect(res2).toEqual({ count: 1 });
    expect(slowLoader).toHaveBeenCalledTimes(1);
  });

  it('delByPattern deletes matching keys from scanStream and catches errors', async () => {
    const destroyFn = jest.fn();
    async function* asyncGenerator() {
      await Promise.resolve();
      yield ['key:1', 'key:2'];
    }
    const gen = Object.assign(asyncGenerator(), { destroy: destroyFn });
    mockRedisClient.scanStream.mockReturnValue(gen);
    await service.delByPattern('key:*');
    expect(mockRedisClient.unlink).toHaveBeenCalledWith('key:1', 'key:2');
    expect(destroyFn).toHaveBeenCalledTimes(1);

    // Early return when not connected
    mockRedisClient.status = 'end';
    await service.delByPattern('key:*');
    mockRedisClient.status = 'ready';

    // Connection is closed error
    mockRedisClient.scanStream.mockImplementationOnce(() => {
      throw new Error('Connection is closed');
    });
    await expect(service.delByPattern('closed:*')).resolves.not.toThrow();

    // Generic error
    mockRedisClient.scanStream.mockImplementationOnce(() => {
      throw new Error('scan fail');
    });
    await expect(service.delByPattern('error:*')).resolves.not.toThrow();
  });

  it('sorted set, string, and set commands operate properly and handle errors', async () => {
    expect(await service.zadd('zkey', 10, 'm1')).toBe(1);
    expect(await service.zrangebyscore('zkey', 0, 100)).toEqual(['item1']);
    expect(await service.zremrangebyrank('zkey', 0, 1)).toBe(1);
    expect(await service.incr('counter')).toBe(1);
    expect(await service.expire('counter', 30)).toBe(1);
    expect(await service.sadd('setkey', 'a', 'b')).toBe(1);
    expect(await service.saddWithTtl('setkey', 3600, 'a', 'b')).toBe(1);
    expect(mockRedisClient.expire).toHaveBeenCalledWith('setkey', 3600);
    expect(await service.srem('setkey', 'a')).toBe(1);
    expect(await service.scard('setkey')).toBe(3);
    expect(await service.smembers('setkey')).toEqual(['m1', 'm2']);

    mockRedisClient.zadd.mockRejectedValueOnce(new Error('fail'));
    expect(await service.zadd('zkey', 10, 'm1')).toBe(0);

    mockRedisClient.zrangebyscore.mockRejectedValueOnce(new Error('fail'));
    expect(await service.zrangebyscore('zkey', 0, 100)).toEqual([]);

    mockRedisClient.zremrangebyrank.mockRejectedValueOnce(new Error('fail'));
    expect(await service.zremrangebyrank('zkey', 0, 1)).toBe(0);

    mockRedisClient.incr.mockRejectedValueOnce(new Error('fail'));
    expect(await service.incr('counter')).toBe(0);

    mockRedisClient.expire.mockRejectedValueOnce(new Error('fail'));
    expect(await service.expire('counter', 30)).toBe(0);

    mockRedisClient.sadd.mockRejectedValueOnce(new Error('fail'));
    expect(await service.sadd('setkey', 'a')).toBe(0);

    mockRedisClient.srem.mockRejectedValueOnce(new Error('fail'));
    expect(await service.srem('setkey', 'a')).toBe(0);

    mockRedisClient.scard.mockRejectedValueOnce(new Error('fail'));
    expect(await service.scard('setkey')).toBe(0);

    mockRedisClient.smembers.mockRejectedValueOnce(new Error('fail'));
    expect(await service.smembers('setkey')).toEqual([]);
  });

  it('geo commands: geoadd, geodist, geosearchMembers', async () => {
    expect(await service.geoadd('geo:users', 37.6173, 55.7558, 'u1')).toBe(1);
    mockRedisClient.geoadd.mockRejectedValueOnce(new Error('fail'));
    expect(await service.geoadd('geo:users', 37.6173, 55.7558, 'u1')).toBe(0);

    expect(await service.geodist('geo:users', 'u1', 'u2', 'km')).toBe(4.5);
    mockRedisClient.geodist.mockResolvedValueOnce(null);
    expect(await service.geodist('geo:users', 'u1', 'u2')).toBeNull();
    mockRedisClient.geodist.mockRejectedValueOnce(new Error('fail'));
    expect(await service.geodist('geo:users', 'u1', 'u2')).toBeNull();

    // geosearch success
    const members = await service.geosearchMembers('geo:users', 37.6, 55.7, 50, 10);
    expect(members).toEqual(['loc1', 'loc2']);

    // geosearch error -> fallback to georadius
    mockRedisClient.geosearch.mockRejectedValueOnce(new Error('no geosearch'));
    const fallbackMembers = await service.geosearchMembers('geo:users', 37.6, 55.7, 50, 10);
    expect(fallbackMembers).toEqual(['loc1']);

    // both error
    mockRedisClient.geosearch.mockRejectedValueOnce(new Error('fail'));
    mockRedisClient.georadius.mockRejectedValueOnce(new Error('fail'));
    expect(await service.geosearchMembers('geo:users', 37.6, 55.7, 50)).toEqual([]);
  });

  it('batch reads: mget + geodistMany in single roundtrips', async () => {
    // mget: order-preserving values, empty input short-circuits.
    mockRedisClient.mget.mockResolvedValue(['a', null, 'c']);
    await expect(service.mget(['k1', 'k2', 'k3'])).resolves.toEqual(['a', null, 'c']);
    expect(mockRedisClient.mget).toHaveBeenCalledWith(['k1', 'k2', 'k3']);
    await expect(service.mget([])).resolves.toEqual([]);

    // mget failure -> LRU fallback, then nulls.
    mockRedisClient.mget.mockRejectedValueOnce(new Error('fail'));
    await expect(service.mget(['k9'])).resolves.toEqual([null]);

    // geodistMany: one pipeline, per-member results incl. errors.
    const exec = jest.fn().mockResolvedValue([
      [null, '1.5'],
      [new Error('no member'), null],
      [null, null],
    ]);
    const geodist = jest.fn().mockReturnThis();
    mockRedisClient.pipeline.mockReturnValue({ geodist, exec });
    await expect(service.geodistMany('geo:users', 'me', ['a', 'b', 'c'])).resolves.toEqual([
      1.5,
      null,
      null,
    ]);
    expect(geodist).toHaveBeenCalledTimes(3);
    await expect(service.geodistMany('geo:users', 'me', [])).resolves.toEqual([]);

    // pipeline failure -> all nulls (same degraded semantics as geodist).
    mockRedisClient.pipeline.mockImplementationOnce(() => {
      throw new Error('fail');
    });
    await expect(service.geodistMany('geo:users', 'me', ['a'])).resolves.toEqual([null]);
  });

  it('dismissSuggestedUser multi pipeline and error handling', async () => {
    await service.dismissSuggestedUser('viewer-1', 'target-1');
    expect(mockRedisClient.multi).toHaveBeenCalled();

    mockRedisClient.multi.mockImplementationOnce(() => {
      throw new Error('multi fail');
    });
    await expect(service.dismissSuggestedUser('viewer-1', 'target-1')).resolves.not.toThrow();
  });

  describe('Degraded Mode & In-Memory LRU Fallback Cache', () => {
    it('serves cached feed/data from local LRU cache when Redis throws error', async () => {
      // 1. Initial write stores in local LRU fallback as well
      await service.set('feed:user:123', JSON.stringify({ posts: ['p1', 'p2'] }), 300);

      // 2. Redis goes down / throws
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection refused'));

      // 3. Reads still succeed from local RAM without 500 error
      const cached = await service.get('feed:user:123');
      expect(cached).toBe(JSON.stringify({ posts: ['p1', 'p2'] }));
      expect(service.isDegraded()).toBe(true);
    });

    it('getOrSet continues serving via loader and caching in local LRU when Redis is down', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Connection is closed'));
      mockRedisClient.set.mockRejectedValue(new Error('Connection is closed'));

      const loader = jest.fn().mockResolvedValue({ message: 'Hello from DB fallback' });

      // First call invokes loader and stores in local LRU
      const result1 = await service.getOrSet('conv:msg:456', 60, loader);
      expect(result1).toEqual({ message: 'Hello from DB fallback' });
      expect(loader).toHaveBeenCalledTimes(1);

      // Second call serves directly from in-memory LRU without re-hitting DB loader!
      const result2 = await service.getOrSet('conv:msg:456', 60, loader);
      expect(result2).toEqual({ message: 'Hello from DB fallback' });
      expect(loader).toHaveBeenCalledTimes(1); // Not called again!
    });
  });
});
