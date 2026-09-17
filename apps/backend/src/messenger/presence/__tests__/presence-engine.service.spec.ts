import { PresenceEngineService } from '../presence-engine.service';
import type { RedisService } from '../../../redis/redis.service';
import { WS_EVENTS } from '../../events/ws-events';
import type { Server } from 'socket.io';

describe('PresenceEngineService', () => {
  let service: PresenceEngineService;
  let mockRedisClient: {
    pipeline: jest.Mock;
    zscore: jest.Mock;
  };
  let mockPipeline: {
    zadd: jest.Mock;
    expire: jest.Mock;
    zremrangebyscore: jest.Mock;
    zscore: jest.Mock;
    exec: jest.Mock;
  };
  let mockRedisService: {
    getClient: jest.Mock;
  };
  let mockServer: {
    emit: jest.Mock;
  };

  beforeEach(() => {
    mockPipeline = {
      zadd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      zremrangebyscore: jest.fn().mockReturnThis(),
      zscore: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockRedisClient = {
      pipeline: jest.fn().mockReturnValue(mockPipeline),
      zscore: jest.fn(),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    mockServer = {
      emit: jest.fn(),
    };

    service = new PresenceEngineService(mockRedisService as unknown as RedisService);
    service.setServer(mockServer as unknown as Server);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should ingest heartbeats in-memory with zero Redis queries on packet path', () => {
    service.recordHeartbeat('user-1');
    service.recordHeartbeat('user-2');

    // No pipeline created yet
    expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
  });

  it('should flush aggregated heartbeats into Redis ZSET with sliding expiration', async () => {
    service.recordHeartbeat('user-1');
    service.recordHeartbeat('user-2');

    await service.flushHeartbeats();

    expect(mockRedisClient.pipeline).toHaveBeenCalled();
    expect(mockPipeline.zadd).toHaveBeenCalled();
    expect(mockPipeline.expire).toHaveBeenCalledWith(
      PresenceEngineService.PRESENCE_ZSET_KEY,
      86400,
    );
    expect(mockPipeline.zremrangebyscore).toHaveBeenCalled();
    expect(mockPipeline.exec).toHaveBeenCalled();
  });

  it('should track multi-device local sockets and state transitions', () => {
    const isFirstSocket = service.recordUserOnline('user-1', 'sock-1');
    expect(isFirstSocket).toBe(true);

    const isSecondSocket = service.recordUserOnline('user-1', 'sock-2');
    expect(isSecondSocket).toBe(false);

    expect(service.isLocallyConnected('user-1')).toBe(true);
    expect(service.getLocalSockets('user-1')).toEqual(['sock-1', 'sock-2']);

    const isFirstDisconnect = service.recordUserOffline('user-1', 'sock-1');
    expect(isFirstDisconnect).toBe(false);

    const isLastDisconnect = service.recordUserOffline('user-1', 'sock-2');
    expect(isLastDisconnect).toBe(true);

    expect(service.isLocallyConnected('user-1')).toBe(false);
  });

  it('should batch broadcast presence transitions every 2.5-3 seconds', () => {
    service.recordUserOnline('user-3', 'sock-3');
    service.flushPresenceBatch(); // flush initial connection

    mockServer.emit.mockClear();

    service.recordUserOnline('user-1', 'sock-1');
    service.recordUserOnline('user-2', 'sock-2');
    service.recordUserOffline('user-3', 'sock-3');

    service.flushPresenceBatch();

    const anyOnline: unknown = expect.arrayContaining(['user-1', 'user-2']);
    const anyNumber: unknown = expect.any(Number);
    expect(mockServer.emit).toHaveBeenCalledWith(
      WS_EVENTS.PRESENCE_BATCH,
      expect.objectContaining({
        online: anyOnline,
        offline: ['user-3'],
        timestamp: anyNumber,
      }),
    );
  });

  it('should resolve online users without executing SQL queries', async () => {
    service.recordUserOnline('user-1', 'sock-1'); // local socket

    mockPipeline.exec.mockResolvedValueOnce([
      [null, (Date.now() - 5000).toString()], // user-2 online in redis
      [null, (Date.now() - 100000).toString()], // user-3 expired/offline
    ]);

    const online = await service.getOnlineUserIds(['user-1', 'user-2', 'user-3']);
    expect(online).toContain('user-1');
    expect(online).toContain('user-2');
    expect(online).not.toContain('user-3');
  });

  it('should return single user online status accurately', async () => {
    mockRedisClient.zscore.mockResolvedValueOnce((Date.now() - 5000).toString());
    const isOnline = await service.isUserOnline('remote-user');
    expect(isOnline).toBe(true);

    mockRedisClient.zscore.mockResolvedValueOnce((Date.now() - 120000).toString());
    const isExpired = await service.isUserOnline('stale-user');
    expect(isExpired).toBe(false);
  });
});
