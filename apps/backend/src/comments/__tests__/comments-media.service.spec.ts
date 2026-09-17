import { BadRequestException } from '@nestjs/common';
import { CommentsMediaService } from '../comments-media.service';
import type { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';

jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation(() => ({
    rotate: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    gif: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('sanitized-image-data')),
  }));
  return {
    default: mockSharp,
    __esModule: true,
  };
});

describe('CommentsMediaService', () => {
  let service: CommentsMediaService;
  let mockS3: {
    send: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    mockS3 = {
      send: jest.fn().mockResolvedValue({}),
    };
    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, def?: string) => def ?? 'http://localhost:9000'),
    };

    service = new CommentsMediaService(
      mockS3 as unknown as S3Client,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('validateMagicBytes', () => {
    it('detects JPEG magic bytes (FF D8 FF)', () => {
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      const res = service.validateMagicBytes(jpegBuf);
      expect(res.mime).toBe('image/jpeg');
      expect(res.ext).toBe('jpg');
    });

    it('detects PNG magic bytes', () => {
      const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = service.validateMagicBytes(pngBuf);
      expect(res.mime).toBe('image/png');
      expect(res.ext).toBe('png');
    });

    it('detects WEBP magic bytes', () => {
      const webpBuf = Buffer.alloc(16);
      webpBuf.write('RIFF', 0, 'ascii');
      webpBuf.write('WEBP', 8, 'ascii');
      const res = service.validateMagicBytes(webpBuf);
      expect(res.mime).toBe('image/webp');
      expect(res.ext).toBe('webp');
    });

    it('detects GIF magic bytes (GIF87a and GIF89a)', () => {
      const gif89Buf = Buffer.from('GIF89a...', 'ascii');
      const res89 = service.validateMagicBytes(gif89Buf);
      expect(res89.mime).toBe('image/gif');
      expect(res89.isGif).toBe(true);

      const gif87Buf = Buffer.from('GIF87a...', 'ascii');
      const res87 = service.validateMagicBytes(gif87Buf);
      expect(res87.isGif).toBe(true);
    });

    it('rejects short (< 4 bytes) buffers or unsupported payloads', () => {
      expect(() => service.validateMagicBytes(Buffer.from([0x01]))).toThrow(BadRequestException);
      const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf-8');
      expect(() => service.validateMagicBytes(svgBuf)).toThrow(BadRequestException);
    });
  });

  describe('processCommentImage', () => {
    it('throws BadRequestException if no buffer provided', async () => {
      await expect(
        service.processCommentImage(null as unknown as Express.Multer.File),
      ).rejects.toThrow(new BadRequestException('No image file provided'));
    });

    it('throws BadRequestException if file exceeds 5MB', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024);
      const mockFile = {
        buffer: bigBuffer,
        originalname: 'huge.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      await expect(service.processCommentImage(mockFile)).rejects.toThrow(
        new BadRequestException('Image size exceeds maximum allowed limit of 5MB'),
      );
    });

    it('sanitizes and uploads JPEG/PNG/WEBP to S3', async () => {
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      const mockFile = {
        buffer: jpegBuf,
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const res = await service.processCommentImage(mockFile);
      expect(res.mimetype).toBe('image/webp');
      expect(res.url).toContain('/comments/');
      expect(mockS3.send).toHaveBeenCalled();
    });

    it('sanitizes GIF while preserving animated flag', async () => {
      const gifBuf = Buffer.from('GIF89a...', 'ascii');
      const mockFile = {
        buffer: gifBuf,
        originalname: 'anim.gif',
        mimetype: 'image/gif',
      } as Express.Multer.File;

      const res = await service.processCommentImage(mockFile);
      expect(res.mimetype).toBe('image/gif');
      expect(res.url).toContain('.gif');
    });

    it('falls back to base64 data URI when S3 upload fails or S3 is not available', async () => {
      mockS3.send.mockRejectedValueOnce(new Error('S3 offline'));
      const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      const mockFile = {
        buffer: jpegBuf,
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const res = await service.processCommentImage(mockFile);
      expect(res.url).toContain('data:image/webp;base64,');
    });
  });
});
