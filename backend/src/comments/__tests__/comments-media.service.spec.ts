import { BadRequestException } from '@nestjs/common';
import { CommentsMediaService } from '../comments-media.service';
import type { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';

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

    it('detects GIF magic bytes', () => {
      const gifBuf = Buffer.from('GIF89a...', 'ascii');
      const res = service.validateMagicBytes(gifBuf);
      expect(res.mime).toBe('image/gif');
      expect(res.isGif).toBe(true);
    });

    it('rejects SVG / executable / invalid payloads', () => {
      const svgBuf = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf-8');
      expect(() => service.validateMagicBytes(svgBuf)).toThrow(BadRequestException);
    });
  });

  describe('processCommentImage', () => {
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
  });
});
