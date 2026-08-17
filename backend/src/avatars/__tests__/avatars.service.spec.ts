import { Readable } from 'stream';
import { NotFoundException } from '@nestjs/common';
import type { S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import { AvatarsService } from '../avatars.service';
import type { RedisService } from '../../redis/redis.service';

describe('AvatarsService', () => {
  let service: AvatarsService;
  let mockS3: {
    send: jest.Mock;
  };
  let mockAvatarRepo: {
    findById: jest.Mock;
    updateAvatar: jest.Mock;
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

    mockAvatarRepo = {
      findById: jest.fn(),
      updateAvatar: jest.fn(),
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

    service = new AvatarsService(
      mockS3 as unknown as S3Client,
      mockAvatarRepo,
      mockConfigService as unknown as ConfigService,
      mockRedis as unknown as RedisService,
    );
  });

  describe('uploadAvatar', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'avatar.png',
      encoding: '7bit',
      mimetype: 'image/png',
      buffer: Buffer.from('fake-image-bytes'),
      size: 16,
      stream: new Readable(),
      destination: '',
      filename: '',
      path: '',
    };

    it('throws NotFoundException when user does not exist', async () => {
      mockAvatarRepo.findById.mockResolvedValueOnce(null);

      await expect(service.uploadAvatar('usr-1', mockFile)).rejects.toThrow(NotFoundException);
    });

    it('uploads avatar to S3 and updates user record and cache', async () => {
      mockAvatarRepo.findById.mockResolvedValueOnce({ id: 'usr-1', avatar: null });
      mockAvatarRepo.updateAvatar.mockResolvedValueOnce({
        id: 'usr-1',
        avatar: 'https://s3.example.com/avatars/avatars/usr-1.webp',
      });

      const result = await service.uploadAvatar('usr-1', mockFile);

      expect(mockAvatarRepo.updateAvatar).toHaveBeenCalledWith(
        'usr-1',
        expect.stringContaining('usr-1'),
      );
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(result.avatar).toContain('usr-1');
    });
  });

  describe('deleteAvatar', () => {
    it('throws NotFoundException when user does not exist', async () => {
      mockAvatarRepo.findById.mockResolvedValueOnce(null);

      await expect(service.deleteAvatar('usr-1')).rejects.toThrow(NotFoundException);
    });

    it('deletes existing avatar and sets avatar to null', async () => {
      mockAvatarRepo.findById.mockResolvedValueOnce({
        id: 'usr-1',
        avatar: 'https://s3.example.com/avatars/avatars/usr-1.webp',
      });
      mockAvatarRepo.updateAvatar.mockResolvedValueOnce({ id: 'usr-1', avatar: null });

      const result = await service.deleteAvatar('usr-1');

      expect(mockAvatarRepo.updateAvatar).toHaveBeenCalledWith('usr-1', null);
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(result.avatar).toBeNull();
    });
  });
});
