import { HealthService } from '../health.service';
import type { HealthRepository } from '../health.repository';
import type { RedisService } from '../../redis/redis.service';

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

    service = new HealthService(
      mockHealthRepo as unknown as HealthRepository,
      mockRedisService as unknown as RedisService,
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
    });
  });
});
