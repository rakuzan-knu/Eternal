import { MediaPreviewProcessor } from '../media-preview.processor';
import type { ConfigService } from '@nestjs/config';
import type { Job } from 'bullmq';
import { MediaJobType } from '../../queue.constants';

jest.mock('sharp', () => {
  const mockSharp = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('optimized')),
  };
  return {
    default: jest.fn(() => mockSharp),
    __esModule: true,
  };
});

jest.mock('bullmq', () => {
  return {
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

jest.mock('ioredis', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      on: jest.fn().mockReturnThis(),
      status: 'ready',
      quit: jest.fn().mockResolvedValue('OK'),
      disconnect: jest.fn(),
    })),
    __esModule: true,
  };
});

describe('MediaPreviewProcessor', () => {
  let processor: MediaPreviewProcessor;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    };
    processor = new MediaPreviewProcessor(mockConfigService as unknown as ConfigService);
  });

  afterEach(async () => {
    await processor.onModuleDestroy();
  });

  it('processes image optimize jobs', async () => {
    const job = {
      name: MediaJobType.IMAGE_OPTIMIZE,
      data: {
        bufferBase64: Buffer.from('test-image').toString('base64'),
        width: 400,
      },
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();
  });

  it('processes link preview jobs', async () => {
    const job = {
      name: MediaJobType.LINK_PREVIEW,
      data: {
        url: 'https://example.com',
      },
    } as unknown as Job;

    await expect(processor.processJob(job)).resolves.not.toThrow();
  });
});
