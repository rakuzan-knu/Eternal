import { AutoDeletePeriod } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import type { MessengerGateway } from '../../gateway/messenger.gateway';
import type { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { AutoDeleteService } from '../auto-delete.service';

describe('AutoDeleteService', () => {
  let service: AutoDeleteService;
  let mockPrisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    user: {
      findMany: jest.Mock;
    };
    message: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let mockGateway: {
    emitMessageDeleted: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockS3: {
    send: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      user: {
        findMany: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockGateway = {
      emitMessageDeleted: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'MINIO_BUCKET') return 'test-bucket';
        if (key === 'MINIO_PUBLIC_URL') return 'https://s3.example.com';
        return defaultVal;
      }),
    };

    mockS3 = {
      send: jest.fn().mockResolvedValue({}),
    };

    service = new AutoDeleteService(
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as MessengerGateway,
      mockConfigService as unknown as ConfigService,
      mockS3 as unknown as S3Client,
    );
  });

  it('sweep purges expired messages and deletes attachments from S3', async () => {
    mockPrisma.user.findMany.mockResolvedValueOnce([
      { id: 'usr-1', autoDeletePeriod: AutoDeletePeriod.WEEK },
      { id: 'usr-2', autoDeletePeriod: AutoDeletePeriod.OFF },
    ]);

    mockPrisma.message.findMany
      .mockResolvedValueOnce([
        {
          id: 'msg-old-1',
          conversationId: 'conv-1',
          attachments: [{ url: 'https://s3.example.com/test-bucket/attachments/pic.jpg' }],
        },
      ])
      .mockResolvedValueOnce([]); // empty next page

    await service.sweep();

    expect(mockPrisma.user.findMany).toHaveBeenCalled();
    expect(mockS3.send).toHaveBeenCalledTimes(1);
    expect(mockPrisma.message.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['msg-old-1'] } },
    });
    expect(mockGateway.emitMessageDeleted).toHaveBeenCalledWith('conv-1', 'msg-old-1', true);
  });

  it('retains messages after storage failure and retries on the next sweep', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'usr-1', autoDeletePeriod: AutoDeletePeriod.DAY },
    ]);

    mockS3.send.mockRejectedValueOnce(new Error('S3 error'));

    mockPrisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-old-1',
        conversationId: 'conv-1',
        attachments: [{ url: 'https://s3.example.com/test-bucket/attachments/pic.jpg' }],
      },
    ]);

    await service.sweep();
    expect(mockPrisma.message.deleteMany).not.toHaveBeenCalled();
    expect(mockGateway.emitMessageDeleted).not.toHaveBeenCalled();

    await service.sweep();
    expect(mockS3.send).toHaveBeenCalledTimes(2);
    expect(mockPrisma.message.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['msg-old-1'] } },
    });
    expect(mockGateway.emitMessageDeleted).toHaveBeenCalledWith('conv-1', 'msg-old-1', true);
  });

  it('continues with other users when one user has a storage failure', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'usr-1', autoDeletePeriod: AutoDeletePeriod.DAY },
      { id: 'usr-2', autoDeletePeriod: AutoDeletePeriod.WEEK },
    ]);
    mockS3.send.mockRejectedValueOnce(new Error('Storage unavailable'));
    mockPrisma.message.findMany
      .mockResolvedValueOnce([
        {
          id: 'failed',
          conversationId: 'conv-1',
          attachments: [{ url: 'https://s3.example.com/test-bucket/attachments/pic.jpg' }],
        },
      ])
      .mockResolvedValueOnce([{ id: 'deleted', conversationId: 'conv-2', attachments: [] }]);

    await service.sweep();

    expect(mockPrisma.message.deleteMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.message.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['deleted'] } },
    });
    expect(mockGateway.emitMessageDeleted).toHaveBeenCalledTimes(1);
    expect(mockGateway.emitMessageDeleted).toHaveBeenCalledWith('conv-2', 'deleted', true);
  });

  it('sweep skips tick if already running', async () => {
    Object.assign(service, { running: true });

    await service.sweep();

    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });
});
