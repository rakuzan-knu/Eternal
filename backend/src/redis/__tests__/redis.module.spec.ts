import Redis from 'ioredis';
import { RedisModule } from '../redis.module';
import type { RedisService } from '../redis.service';

jest.mock('ioredis');

describe('RedisModule', () => {
  let mockRedisService: {
    getClient: jest.Mock;
  };
  let mockClient: {
    status: string;
    quit: jest.Mock;
    disconnect: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      status: 'ready',
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    };
    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockClient),
    };
  });

  describe('onModuleDestroy', () => {
    it('calls client.quit() when client status is "ready"', async () => {
      mockClient.status = 'ready';
      const module = new RedisModule(mockRedisService as unknown as RedisService);

      await module.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalledTimes(1);
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('calls client.quit() when client status is "connecting"', async () => {
      mockClient.status = 'connecting';
      const module = new RedisModule(mockRedisService as unknown as RedisService);

      await module.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalledTimes(1);
    });

    it('calls client.quit() when client status is "connect"', async () => {
      mockClient.status = 'connect';
      const module = new RedisModule(mockRedisService as unknown as RedisService);

      await module.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalledTimes(1);
    });

    it('calls client.disconnect() when client status is closed / other', async () => {
      mockClient.status = 'close';
      const module = new RedisModule(mockRedisService as unknown as RedisService);

      await module.onModuleDestroy();

      expect(mockClient.disconnect).toHaveBeenCalledTimes(1);
      expect(mockClient.quit).not.toHaveBeenCalled();
    });

    it('suppresses and catches errors during client teardown gracefully', async () => {
      mockClient.status = 'ready';
      mockClient.quit.mockRejectedValueOnce(new Error('Connection error during quit'));
      const module = new RedisModule(mockRedisService as unknown as RedisService);

      await expect(module.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('provider factory retryStrategy', () => {
    it('creates Redis client and configures retryStrategy properly', () => {
      const retryFn = (times: number) => (times > 3 ? null : Math.min(times * 100, 1000));
      expect(retryFn(1)).toBe(100);
      expect(retryFn(2)).toBe(200);
      expect(retryFn(3)).toBe(300);
      expect(retryFn(4)).toBeNull();
      expect(retryFn(15)).toBeNull();

      const redisUrl = 'redis://localhost:6379';
      new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 2000,
        retryStrategy: retryFn,
      });

      expect(Redis).toHaveBeenCalledTimes(1);
    });
  });
});
