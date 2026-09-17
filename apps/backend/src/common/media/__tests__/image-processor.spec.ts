import {
  optimizeAvatar,
  optimizeBanner,
  optimizePostImage,
  optimizeGroupAvatar,
  uploadToStorageWithFallback,
  deleteFromStorage,
} from '../image-processor';
import type { S3Client } from '@aws-sdk/client-s3';

jest.mock('sharp', () => {
  const mockSharpInstance = {
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    gif: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('optimized-image')),
  };
  const sharpFn = Object.assign(
    jest.fn(() => mockSharpInstance),
    {
      concurrency: jest.fn(),
      cache: jest.fn(),
      simd: jest.fn(),
    },
  );
  return {
    __esModule: true,
    default: sharpFn,
  };
});

describe('image-processor', () => {
  const dummyBuffer = Buffer.from('test-image-content');
  const gifBuffer = Buffer.from('GIF89a-test-image-content');

  describe('optimizations', () => {
    it('optimizes avatar with WebP and GIF', async () => {
      const resWebp = await optimizeAvatar(dummyBuffer);
      expect(resWebp.contentType).toBe('image/webp');
      expect(resWebp.ext).toBe('webp');

      const resGif = await optimizeAvatar(gifBuffer);
      expect(resGif.contentType).toBe('image/gif');
      expect(resGif.ext).toBe('gif');
    });

    it('optimizes banner with WebP and GIF', async () => {
      const resWebp = await optimizeBanner(dummyBuffer);
      expect(resWebp.contentType).toBe('image/webp');
      expect(resWebp.ext).toBe('webp');

      const resGif = await optimizeBanner(gifBuffer);
      expect(resGif.contentType).toBe('image/gif');
      expect(resGif.ext).toBe('gif');
    });

    it('optimizes post image with WebP and GIF', async () => {
      const resWebp = await optimizePostImage(dummyBuffer);
      expect(resWebp.contentType).toBe('image/webp');
      expect(resWebp.ext).toBe('webp');

      const resGif = await optimizePostImage(gifBuffer);
      expect(resGif.contentType).toBe('image/gif');
      expect(resGif.ext).toBe('gif');
    });

    it('optimizes group avatar with WebP and GIF', async () => {
      const resWebp = await optimizeGroupAvatar(dummyBuffer);
      expect(resWebp.contentType).toBe('image/webp');
      expect(resWebp.ext).toBe('webp');

      const resGif = await optimizeGroupAvatar(gifBuffer);
      expect(resGif.contentType).toBe('image/gif');
      expect(resGif.ext).toBe('gif');
    });
  });

  describe('uploadToStorageWithFallback', () => {
    it('uploads to S3 standard path style', async () => {
      const mockS3 = {
        send: jest.fn().mockResolvedValue({}),
      };

      const url = await uploadToStorageWithFallback(mockS3 as unknown as S3Client, {
        bucket: 'test-bucket',
        key: 'test.webp',
        buffer: dummyBuffer,
        contentType: 'image/webp',
        publicUrl: 'https://cdn.example.com',
      });

      expect(mockS3.send).toHaveBeenCalled();
      expect(url).toBe('https://cdn.example.com/test-bucket/test.webp');
    });

    it('uploads to direct bucket domain (e.g. Cloudflare R2)', async () => {
      const mockS3 = {
        send: jest.fn().mockResolvedValue({}),
      };

      const url = await uploadToStorageWithFallback(mockS3 as unknown as S3Client, {
        bucket: 'test-bucket',
        key: 'test.webp',
        buffer: dummyBuffer,
        contentType: 'image/webp',
        publicUrl: 'https://pub-123.r2.dev',
      });

      expect(url).toBe('https://pub-123.r2.dev/test.webp');
    });

    it('falls back to base64 data URI when S3 is unreachable', async () => {
      const mockS3 = {
        send: jest.fn().mockRejectedValue(new Error('S3 connection refused')),
      };

      const url = await uploadToStorageWithFallback(mockS3 as unknown as S3Client, {
        bucket: 'test-bucket',
        key: 'test.webp',
        buffer: dummyBuffer,
        contentType: 'image/webp',
        publicUrl: 'https://cdn.example.com',
      });

      expect(mockS3.send).toHaveBeenCalled();
      expect(url).toBe(`data:image/webp;base64,${dummyBuffer.toString('base64')}`);
    });
  });

  describe('deleteFromStorage', () => {
    it('deletes S3 object when URL matches publicUrl', async () => {
      const mockS3 = {
        send: jest.fn().mockResolvedValue({}),
      };

      await deleteFromStorage(mockS3 as unknown as S3Client, {
        url: 'https://cdn.example.com/test-bucket/avatars/user-1.webp',
        bucket: 'test-bucket',
        publicUrl: 'https://cdn.example.com',
      });

      expect(mockS3.send).toHaveBeenCalled();
    });

    it('skips deletion for data URI or foreign URLs', async () => {
      const mockS3 = {
        send: jest.fn().mockResolvedValue({}),
      };

      await deleteFromStorage(mockS3 as unknown as S3Client, {
        url: 'data:image/webp;base64,xyz',
        bucket: 'test-bucket',
        publicUrl: 'https://cdn.example.com',
      });

      await deleteFromStorage(mockS3 as unknown as S3Client, {
        url: 'https://foreign.com/img.jpg',
        bucket: 'test-bucket',
        publicUrl: 'https://cdn.example.com',
      });

      expect(mockS3.send).not.toHaveBeenCalled();
    });
  });
});
