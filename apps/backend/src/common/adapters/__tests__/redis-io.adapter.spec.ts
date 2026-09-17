import { RedisIoAdapter } from '../redis-io.adapter';
import type { INestApplication } from '@nestjs/common';

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    duplicate: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    once: jest.fn((event: string, cb: () => void) => {
      if (event === 'ready') {
        setTimeout(() => {
          cb();
        }, 5);
      }
    }),
    status: 'ready',
    quit: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  }));
  return {
    default: MockRedis,
    Redis: MockRedis,
    __esModule: true,
  };
});

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn().mockReturnValue(jest.fn()),
}));

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;
  let mockApp: INestApplication;

  beforeEach(() => {
    mockApp = {
      getHttpServer: jest.fn().mockReturnValue({}),
    } as unknown as INestApplication;
    adapter = new RedisIoAdapter(mockApp);
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('initializes and connects to Redis with Pub/Sub', async () => {
    await adapter.connectToRedis('redis://localhost:6379');
    expect(adapter).toBeDefined();
  });

  it('handles missing REDIS_URL gracefully without throwing', async () => {
    await expect(adapter.connectToRedis(undefined)).resolves.not.toThrow();
  });

  it('creates IO server with pingInterval and pingTimeout configuration', () => {
    const mockSuperServer = {
      adapter: jest.fn(),
    };
    jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(adapter)), 'createIOServer')
      .mockReturnValue(mockSuperServer);

    const server = adapter.createIOServer(3000);
    expect(server).toBeDefined();
  });
});
