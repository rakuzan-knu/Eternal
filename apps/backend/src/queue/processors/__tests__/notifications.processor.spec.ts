import { NotificationsProcessor } from '../notifications.processor';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '@common/prisma';
import type { MessengerGateway } from '../../../messenger/gateway/messenger.gateway';
import type { Job } from 'bullmq';
import { NotificationJobType } from '../../queue.constants';

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation((name, processor: unknown) => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      process: processor,
    })),
  };
});

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn().mockReturnThis(),
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

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let mockConfigService: { get: jest.Mock };
  let mockPrisma: PrismaService;
  let mockGateway: { emitToUser: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };
    mockPrisma = {} as PrismaService;
    mockGateway = {
      emitToUser: jest.fn(),
    };

    processor = new NotificationsProcessor(
      mockConfigService as unknown as ConfigService,
      mockPrisma,
      mockGateway as unknown as MessengerGateway,
    );
  });

  afterEach(async () => {
    await processor.onModuleDestroy();
  });

  it('initializes worker when REDIS_URL is present', () => {
    processor.onModuleInit();
    expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_URL');
  });

  it('processes push notification job and emits to gateway', async () => {
    const job = {
      name: NotificationJobType.PUSH,
      data: {
        userId: 'usr-1',
        type: 'LIKE',
        payload: { postId: 'post-1' },
      },
    } as unknown as Job;

    await processor.processJob(job);
    expect(mockGateway.emitToUser).toHaveBeenCalledWith(
      'usr-1',
      'notification:new',
      expect.any(Object),
    );
  });

  it('handles unknown job types gracefully', async () => {
    const job = {
      name: 'unknown_type',
      data: {},
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();
  });
});
