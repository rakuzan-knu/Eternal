import { HealthService } from '../health.service';
import type { HealthRepository } from '../health.repository';
import type { RedisService } from '../../redis/redis.service';
import type { RedisSelfHealingService } from '../../redis/redis-self-healing.service';
import type { MemoryLeakDetectorService } from '../../common/memory/memory-leak-detector.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockHealthRepo: {
    pingDatabase: jest.Mock;
  };
  let mockRedisService: {
    getClient: jest.Mock;
  };
  let mockRedisClient: {
    ping: jest.Mock;
  };
  let mockRedisSelfHealingService: {
    getRedisMemoryInfo: jest.Mock;
    getLastEvictionInfo: jest.Mock;
    checkAndSelfHeal: jest.Mock;
  };

  beforeEach(() => {
    mockHealthRepo = {
      pingDatabase: jest.fn(),
    };

    mockRedisClient = {
      ping: jest.fn(),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    mockRedisSelfHealingService = {
      getRedisMemoryInfo: jest.fn().mockResolvedValue({
        usedMemoryBytes: 1000,
        usedMemoryHuman: '1 KB',
        maxMemoryBytes: 100000,
        maxMemoryHuman: '100 KB',
        memoryRatio: 0.01,
        memoryUsagePercent: 1.0,
        isHighMemory: false,
        thresholdRatio: 0.9,
      }),
      getLastEvictionInfo: jest.fn().mockReturnValue({
        lastEvictionTimestamp: undefined,
        lastEvictedKeysCount: 0,
      }),
      checkAndSelfHeal: jest.fn(),
    };

    service = new HealthService(
      mockHealthRepo as unknown as HealthRepository,
      mockRedisService as unknown as RedisService,
      mockRedisSelfHealingService as unknown as RedisSelfHealingService,
    );
  });

  describe('getLiveness', () => {
    it('returns status ok and ISO timestamp', () => {
      const result = service.getLiveness();

      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('getReadiness', () => {
    it('returns healthy when both DB and Redis are reachable', async () => {
      mockHealthRepo.pingDatabase.mockResolvedValueOnce(true);
      mockRedisClient.ping.mockResolvedValueOnce('PONG');

      const { isHealthy, response } = await service.getReadiness();

      expect(isHealthy).toBe(true);
      expect(response.status).toBe('ok');
      expect(response.services.database).toBe('ok');
      expect(response.services.redis).toBe('ok');
    });

    it('returns degraded when Redis or DB is failing', async () => {
      mockHealthRepo.pingDatabase.mockResolvedValueOnce(true);
      mockRedisClient.ping.mockRejectedValueOnce(new Error('Redis connection lost'));

      const { isHealthy, response } = await service.getReadiness();

      expect(isHealthy).toBe(false);
      expect(response.status).toBe('degraded');
      expect(response.services.database).toBe('ok');
      expect(response.services.redis).toBe('error');

      mockHealthRepo.pingDatabase.mockResolvedValueOnce(false);
      mockRedisClient.ping.mockResolvedValueOnce('PONG');
      const dbFail = await service.getReadiness();
      expect(dbFail.isHealthy).toBe(false);
      expect(dbFail.response.services.database).toBe('error');
    });

    it('returns degraded when memoryLeakDetector reports isReadyForTraffic() === false', async () => {
      mockHealthRepo.pingDatabase.mockResolvedValue(true);
      mockRedisClient.ping.mockResolvedValue('PONG');

      const mockMemoryDetector = {
        isReadyForTraffic: jest.fn().mockReturnValue(false),
      };

      const healthServiceWithLeak = new HealthService(
        mockHealthRepo as unknown as HealthRepository,
        mockRedisService as unknown as RedisService,
        mockRedisSelfHealingService as unknown as RedisSelfHealingService,
        mockMemoryDetector as unknown as MemoryLeakDetectorService,
      );

      const { isHealthy, response } = await healthServiceWithLeak.getReadiness();
      expect(isHealthy).toBe(false);
      expect(response.status).toBe('degraded');
    });
  });
});
