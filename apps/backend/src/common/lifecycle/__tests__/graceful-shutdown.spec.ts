import { setupGracefulShutdown } from '../graceful-shutdown';
import type { INestApplication } from '@nestjs/common';
import type { RedisIoAdapter } from '../../adapters/redis-io.adapter';

describe('GracefulShutdown', () => {
  let mockApp: {
    getHttpServer: jest.Mock;
    get?: jest.Mock;
    close: jest.Mock;
  };
  let mockHttpServer: {
    close: jest.Mock;
    closeIdleConnections: jest.Mock;
  };
  let mockRedisIoAdapter: {
    close: jest.Mock;
  };

  beforeEach(() => {
    mockHttpServer = {
      close: jest.fn((cb?: () => void) => {
        if (typeof cb === 'function') {
          cb();
        }
      }),
      closeIdleConnections: jest.fn(),
    };
    const mockGateway = {
      drainSockets: jest.fn().mockResolvedValue(undefined),
    };
    mockApp = {
      getHttpServer: jest.fn().mockReturnValue(mockHttpServer),
      get: jest.fn((token: string) => {
        if (token === 'MessengerGateway') return mockGateway;
        return undefined;
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockRedisIoAdapter = {
      close: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('drains HTTP connections, drains WebSocket connections, closes WebSocket adapter, and closes Nest application', async () => {
    const shutdown = setupGracefulShutdown(
      mockApp as unknown as INestApplication,
      mockRedisIoAdapter as unknown as RedisIoAdapter,
      { exitProcess: false, timeoutMs: 5000 },
    );

    await shutdown();

    expect(mockHttpServer.close).toHaveBeenCalledTimes(1);
    expect(mockHttpServer.closeIdleConnections).toHaveBeenCalledTimes(1);
    expect(mockApp.get).toHaveBeenCalledWith('MessengerGateway', { strict: false });
    expect(mockRedisIoAdapter.close).toHaveBeenCalledTimes(1);
    expect(mockApp.close).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate shutdown invocations', async () => {
    const shutdown = setupGracefulShutdown(
      mockApp as unknown as INestApplication,
      mockRedisIoAdapter as unknown as RedisIoAdapter,
      { exitProcess: false, timeoutMs: 5000 },
    );

    await Promise.all([shutdown(), shutdown()]);

    expect(mockApp.close).toHaveBeenCalledTimes(1);
  });

  it('handles errors in HTTP server or adapter without failing completely', async () => {
    mockHttpServer.close.mockImplementationOnce(() => {
      throw new Error('Server close error');
    });
    mockRedisIoAdapter.close.mockRejectedValueOnce(new Error('Redis adapter close error'));

    const shutdown = setupGracefulShutdown(
      mockApp as unknown as INestApplication,
      mockRedisIoAdapter as unknown as RedisIoAdapter,
      { exitProcess: false, timeoutMs: 5000 },
    );

    await expect(shutdown()).resolves.toBeUndefined();
    expect(mockApp.close).toHaveBeenCalledTimes(1);
  });
});
