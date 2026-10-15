import { ConfigService } from '@nestjs/config';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { createInMemoryRedisClient } from '../../../test/in-memory-db';
import { RedisService } from '../../redis/redis.service';
import { MediaBudgetService } from './media-budget.service';

describe('MediaBudgetService atomic admission', () => {
  let client: ReturnType<typeof createInMemoryRedisClient>;
  let redis: RedisService;
  let service: MediaBudgetService;
  let config: Record<string, number>;

  beforeEach(async () => {
    client = createInMemoryRedisClient();
    await client.flushdb();
    // ioredis-mock omits the real client's readiness state.
    Object.defineProperty(client, 'status', { configurable: true, value: 'ready' });
    redis = new RedisService(client);
    config = {};
    service = new MediaBudgetService(redis, new ConfigService(config));
  });

  afterEach(() => {
    redis.onModuleDestroy();
    vi.restoreAllMocks();
  });

  it('reserves once on repeated concurrent requests, including after completion', async () => {
    await Promise.all(Array.from({ length: 8 }, () => service.reserveUpload('alice', 'one', 123)));
    expect((await service.getStatus('alice')).user).toEqual({
      dailyBytes: 123,
      monthlyBytes: 123,
      dailyUploads: 1,
      activeUploads: 1,
    });
    await service.finishUpload('alice', 'one');
    await service.finishUpload('alice', 'one');
    await service.reserveUpload('alice', 'one', 123);
    expect((await service.getStatus('alice')).user).toEqual({
      dailyBytes: 123,
      monthlyBytes: 123,
      dailyUploads: 1,
      activeUploads: 0,
    });
    await expect(service.reserveUpload('alice', 'one', 124)).rejects.toMatchObject({ status: 400 });
  });

  it('never oversubscribes byte limits under concurrent distinct reservations', async () => {
    config.MEDIA_USER_DAILY_BYTES = 100;
    config.MEDIA_MAX_ACTIVE_UPLOADS = 20;
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, (_, index) =>
        service.reserveUpload('alice', `upload-${index}`, 30),
      ),
    );
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect((await service.getStatus('alice')).user.dailyBytes).toBe(90);
    for (const result of attempts) {
      if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(HttpException);
    }
  });

  it('applies global limits across users without exposing their usage', async () => {
    config.MEDIA_GLOBAL_MONTHLY_BYTES = 100;
    await service.reserveUpload('alice', 'a', 70);
    await expect(service.reserveUpload('bob', 'b', 31)).rejects.toMatchObject({ status: 429 });
    const status = await service.getStatus('bob');
    expect(status.user.monthlyBytes).toBe(0);
    expect(status.remaining.monthlyBytes).toBe(30);
    expect(JSON.stringify(status)).not.toContain('alice');
  });

  it('limits daily upload counts even after leases are finished', async () => {
    config.MEDIA_USER_DAILY_UPLOADS = 1;
    await service.reserveUpload('alice', 'one', 1);
    await service.finishUpload('alice', 'one');
    await expect(service.reserveUpload('alice', 'two', 1)).rejects.toMatchObject({ status: 429 });
    expect((await service.getStatus('alice')).user.dailyUploads).toBe(1);
  });

  it('limits global daily requests separately from per-user requests', async () => {
    config.MEDIA_GLOBAL_DAILY_UPLOADS = 1;
    await service.reserveUpload('alice', 'one', 1);
    await expect(service.reserveUpload('bob', 'two', 1)).rejects.toMatchObject({ status: 429 });
  });

  it('limits active upload headroom across users and releases it idempotently', async () => {
    config.MEDIA_GLOBAL_MAX_ACTIVE_UPLOADS = 1;
    await service.reserveUpload('alice', 'one', 1);
    await expect(service.reserveUpload('bob', 'two', 1)).rejects.toMatchObject({ status: 429 });
    await service.finishUpload('alice', 'one');
    await service.finishUpload('alice', 'one');
    await service.reserveUpload('bob', 'two', 1);
    expect((await service.getStatus('bob')).user.activeUploads).toBe(1);
  });

  it('expires active leases without refunding reserved bytes or counts', async () => {
    const start = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    for (let index = 0; index < 3; index++) await service.reserveUpload('alice', `u${index}`, 10);
    await expect(service.reserveUpload('alice', 'blocked', 10)).rejects.toMatchObject({
      status: 429,
    });
    clock.mockReturnValue(start + 15 * 60_000 + 1);
    expect((await service.getStatus('alice')).user.activeUploads).toBe(0);
    await service.reserveUpload('alice', 'new', 10);
    expect((await service.getStatus('alice')).user).toEqual({
      dailyBytes: 40,
      monthlyBytes: 40,
      dailyUploads: 4,
      activeUploads: 1,
    });
  });

  it('uses fixed UTC daily and monthly windows with bounded key expiry', async () => {
    const start = Date.UTC(2026, 11, 31, 23, 59, 30);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(start);
    await service.reserveUpload('alice', 'last-year', 10);
    const before = await service.getStatus('alice');
    expect(before.resetsAt).toEqual({
      daily: '2027-01-01T00:00:00.000Z',
      monthly: '2027-01-01T00:00:00.000Z',
    });
    const dailyKeys = await client.keys('media:*:day:*');
    expect(dailyKeys.length).toBeGreaterThan(0);
    for (const key of dailyKeys) expect(await client.ttl(key)).toBeGreaterThan(0);
    clock.mockReturnValue(start + 31_000);
    const after = await service.getStatus('alice');
    expect(after.user.dailyBytes).toBe(0);
    expect(after.user.monthlyBytes).toBe(0);
    // The same admission token remains idempotent across the UTC boundary.
    await service.reserveUpload('alice', 'last-year', 10);
    expect((await service.getStatus('alice')).user.monthlyBytes).toBe(0);
  });

  it('fails closed when Redis is unavailable and does not use the LRU fallback', async () => {
    vi.spyOn(client, 'eval').mockRejectedValue(new Error('unavailable'));
    const fallback = vi.spyOn(redis, 'get');
    await expect(service.reserveUpload('alice', 'one', 10)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(service.getStatus('alice')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('rejects invalid sizes without contacting Redis', async () => {
    const evaluate = vi.spyOn(client, 'eval');
    for (const size of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(service.reserveUpload('alice', 'one', size)).rejects.toMatchObject({
        status: 400,
      });
    }
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('rejects connecting clients before running an admission command', async () => {
    Object.defineProperty(client, 'status', { configurable: true, value: 'connecting' });
    const evaluate = vi.spyOn(client, 'eval');
    await expect(service.reserveUpload('alice', 'one', 10)).rejects.toMatchObject({ status: 503 });
    expect(evaluate).not.toHaveBeenCalled();
  });
});
