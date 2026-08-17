import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { MediaType } from '@prisma/client';
import { PostsMediaService } from '../posts-media.service';

jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest
      .fn()
      .mockResolvedValue(
        Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
      ),
  }));
});

describe('PostsMediaService', () => {
  let service: PostsMediaService;
  let mockS3: {
    send: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const gifHeader = Buffer.from('GIF89a');
  const mp4Header = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);

  beforeEach(() => {
    mockS3 = {
      send: jest.fn().mockResolvedValue({}),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultVal?: string) => {
        if (key === 'MINIO_BUCKET') return 'posts';
        if (key === 'MINIO_PUBLIC_URL') return 'http://localhost:9000';
        return defaultVal;
      }),
    };

    service = new PostsMediaService(
      mockS3 as unknown as S3Client,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('processUploadedFile & processUploadedFiles', () => {
    it('throws BadRequestException for invalid file buffer', async () => {
      const badFile = { mimetype: 'image/png' } as Express.Multer.File;
      await expect(service.processUploadedFile(badFile, 0)).rejects.toThrow(
        new BadRequestException('Invalid media file'),
      );
    });

    it('throws BadRequestException for unsupported file format', async () => {
      const unsupportedFile = {
        buffer: Buffer.from('Random unsupported text data'),
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(service.processUploadedFile(unsupportedFile, 0)).rejects.toThrow(
        new BadRequestException('Unsupported or invalid file format'),
      );
    });

    it('processes PNG, JPEG, GIF, WEBP images and converts to webp', async () => {
      const pngFile = {
        buffer: pngHeader,
        mimetype: 'image/png',
        originalname: 'test.png',
      } as Express.Multer.File;

      const result = await service.processUploadedFile(pngFile, 0);

      expect(result.type).toBe(MediaType.IMAGE);
      expect(result.url).toContain('http://localhost:9000/posts/posts/');
      expect(result.order).toBe(0);
      expect(mockS3.send).toHaveBeenCalledTimes(1);
    });

    it('processes MP4 and WEBM video formats', async () => {
      const mp4File = {
        buffer: mp4Header,
        mimetype: 'video/mp4',
        originalname: 'clip.mp4',
      } as Express.Multer.File;

      const result = await service.processUploadedFile(mp4File, 1);

      expect(result.type).toBe(MediaType.VIDEO);
      expect(result.url).toContain('.mp4');
      expect(result.order).toBe(1);
    });

    it('enforces 10MB image limit and 100MB video limit', async () => {
      const oversizedImage = {
        buffer: Buffer.concat([jpegHeader, Buffer.alloc(11 * 1024 * 1024)]),
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      await expect(service.processUploadedFile(oversizedImage, 0)).rejects.toThrow(
        new BadRequestException('Image size exceeds 10MB limit'),
      );

      const oversizedVideo = {
        buffer: Buffer.concat([mp4Header, Buffer.alloc(101 * 1024 * 1024)]),
        mimetype: 'video/mp4',
      } as Express.Multer.File;

      await expect(service.processUploadedFile(oversizedVideo, 0)).rejects.toThrow(
        new BadRequestException('Video size exceeds 100MB limit'),
      );
    });

    it('processUploadedFiles rejects if files count exceeds 5', async () => {
      const sixFiles = Array.from({ length: 6 }, () => ({
        buffer: pngHeader,
        mimetype: 'image/png',
      })) as Express.Multer.File[];

      await expect(service.processUploadedFiles(sixFiles)).rejects.toThrow(
        new BadRequestException('Maximum 5 media files allowed per post'),
      );
    });

    it('processUploadedFiles processes an array of valid files', async () => {
      const files = [
        { buffer: pngHeader, mimetype: 'image/png' },
        { buffer: gifHeader, mimetype: 'image/gif' },
      ] as Express.Multer.File[];

      const results = await service.processUploadedFiles(files);
      expect(results).toHaveLength(2);
      expect(results[0].order).toBe(0);
      expect(results[1].order).toBe(1);
    });

    it('falls back to base64 data url when S3 upload fails for image', async () => {
      mockS3.send.mockRejectedValueOnce(new Error('S3 offline'));

      const pngFile = {
        buffer: pngHeader,
        mimetype: 'image/png',
      } as Express.Multer.File;

      const result = await service.processUploadedFile(pngFile, 0);
      expect(result.url).toContain('data:image/webp;base64,');
    });
  });

  describe('Chunked upload and status', () => {
    it('stores chunks and assembles complete file when all chunks arrive', async () => {
      const uploadId = 'session-upload-123';
      const chunk0 = {
        buffer: pngHeader.subarray(0, 4),
        mimetype: 'image/png',
        originalname: 'assembled.png',
      } as Express.Multer.File;

      const chunk1 = {
        buffer: pngHeader.subarray(4),
        mimetype: 'image/png',
        originalname: 'assembled.png',
      } as Express.Multer.File;

      const step1 = await service.uploadChunk(uploadId, 0, 2, chunk0);
      expect(step1.complete).toBe(false);
      expect(step1.uploadedChunks).toEqual([0]);

      const status = service.getChunkStatus(uploadId);
      expect(status.uploadedChunks).toEqual([0]);
      expect(status.totalChunks).toBe(2);

      const step2 = await service.uploadChunk(uploadId, 1, 2, chunk1);
      expect(step2.complete).toBe(true);
      expect(step2.media).toBeDefined();
      expect(step2.media?.type).toBe(MediaType.IMAGE);
    });

    it('returns empty chunk status for unknown uploadId', () => {
      expect(service.getChunkStatus('nonexistent')).toEqual({
        uploadedChunks: [],
        totalChunks: 0,
      });
    });
  });
});
