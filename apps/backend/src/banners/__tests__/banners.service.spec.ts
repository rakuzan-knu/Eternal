import { pngImage, gifImage } from '../../common/media/__tests__/upload-fixtures';
import { Readable } from 'stream';
import { NotFoundException } from '@nestjs/common';
import type { S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import { BannersService } from '../banners.service';
import type { RedisService } from '../../redis/redis.service';

describe('BannersService', () => {
  let service: BannersService;
  let mockS3: {
    send: jest.Mock;
  };
  let mockBannerRepo: {
    findById: jest.Mock;
    updateBanner: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockRedis: {
    del: jest.Mock;
  };

  beforeEach(() => {
    mockS3 = {
      send: jest.fn().mockResolvedValue({}),
    };

    mockBannerRepo = {
      findById: jest.fn(),
      updateBanner: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, def?: string) => {
        if (key === 'MINIO_BUCKET') return 'avatars';
        if (key === 'MINIO_PUBLIC_URL') return 'https://s3.example.com';
        return def ?? '';
      }),
    };

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    };

    service = new BannersService(
      mockS3 as unknown as S3Client,
      mockBannerRepo,
      mockConfigService as unknown as ConfigService,
      mockRedis as unknown as RedisService,
    );
    Object.assign(service, {
      directUploads: {
        assertLegacyAllowed: jest.fn(),
        assertOwnedUrl: jest.fn().mockResolvedValue(undefined),
        resolve: jest.fn().mockResolvedValue({
          uploadId: 'completed-id',
          url: 'https://example.com/source.mp4',
          contentType: 'video/mp4',
          sizeBytes: 100,
          kind: 'VIDEO',
          duration: 5,
          width: 640,
          height: 360,
        }),
      },
    });
  });

  describe('uploadBanner', () => {
    it('keeps the existing banner and storage object when an invalid image is uploaded', async () => {
      mockBannerRepo.findById.mockResolvedValue({
        id: 'usr-1',
        banner: 'https://s3.example.com/avatars/old.webp',
      });
      await expect(
        service.uploadBanner('usr-1', {
          buffer: Buffer.from('MZ bad.exe'),
          mimetype: 'image/png',
        } as Express.Multer.File),
      ).rejects.toThrow();
      expect(mockBannerRepo.updateBanner).not.toHaveBeenCalled();
      expect(mockS3.send).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
    it('uploads to a new key before updating the record and deleting the old image', async () => {
      mockBannerRepo.findById.mockResolvedValue({
        id: 'usr-1',
        banner: 'https://s3.example.com/avatars/old.webp',
      });
      mockBannerRepo.updateBanner.mockResolvedValue({ id: 'usr-1', banner: 'new.webp' });
      await service.uploadBanner('usr-1', {
        buffer: pngImage,
        mimetype: 'image/png',
      } as Express.Multer.File);
      const calls = mockS3.send.mock.calls as [{ input: { Key: string } }][];
      expect(calls[0][0].input.Key).toMatch(/banners\/usr-1\/.+\.webp$/);
      expect(mockS3.send.mock.invocationCallOrder[0]).toBeLessThan(
        mockBannerRepo.updateBanner.mock.invocationCallOrder[0],
      );
      expect(mockBannerRepo.updateBanner.mock.invocationCallOrder[0]).toBeLessThan(
        mockS3.send.mock.invocationCallOrder[1],
      );
    });
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'banner.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: pngImage,
      size: 16,
      stream: new Readable(),
      destination: '',
      filename: '',
      path: '',
    };

    it('throws NotFoundException when user does not exist', async () => {
      mockBannerRepo.findById.mockResolvedValueOnce(null);

      await expect(service.uploadBanner('usr-1', mockFile)).rejects.toThrow(NotFoundException);
    });

    it('uploads banner to S3 and updates user record and cache', async () => {
      mockBannerRepo.findById.mockResolvedValueOnce({ id: 'usr-1', banner: null });
      mockBannerRepo.updateBanner.mockResolvedValueOnce({
        id: 'usr-1',
        banner: 'https://s3.example.com/avatars/banners/usr-1.webp',
        bannerPosition: 50,
      });

      const result = await service.uploadBanner('usr-1', mockFile, 50);

      expect(mockBannerRepo.updateBanner).toHaveBeenCalledWith(
        'usr-1',
        expect.stringContaining('usr-1'),
        50,
      );
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(result.banner).toContain('usr-1');
    });

    it('handles animated GIF banner upload preserving gif extension', async () => {
      const mockGifFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'animated-banner.gif',
        mimetype: 'image/gif',
        buffer: gifImage,
      };

      mockBannerRepo.findById.mockResolvedValueOnce({ id: 'usr-1', banner: null });
      mockBannerRepo.updateBanner.mockResolvedValueOnce({
        id: 'usr-1',
        banner: 'https://s3.example.com/avatars/banners/usr-1.gif',
        bannerPosition: 60,
      });

      const result = await service.uploadBanner('usr-1', mockGifFile, 60);
      expect(mockBannerRepo.updateBanner).toHaveBeenCalledWith(
        'usr-1',
        expect.stringMatching(/usr-1\/.+\.gif$/),
        60,
      );
      expect(result.banner).toContain('usr-1.gif');
    });
  });

  describe('deleteBanner', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockBannerRepo.findById.mockResolvedValueOnce(null);

      await expect(service.deleteBanner('usr-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes existing banner and sets banner to null', async () => {
      mockBannerRepo.findById.mockResolvedValueOnce({
        id: 'usr-1',
        banner: 'https://s3.example.com/avatars/banners/usr-1.webp',
      });
      mockBannerRepo.updateBanner.mockResolvedValueOnce({ id: 'usr-1', banner: null });

      const result = await service.deleteBanner('usr-1');

      expect(mockBannerRepo.updateBanner).toHaveBeenCalledWith('usr-1', null);
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(result.banner).toBeNull();
    });
  });
});
