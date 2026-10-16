import {
  optimizeAvatar,
  optimizeBanner,
  optimizePostImage,
  optimizeGroupAvatar,
  uploadToStorageWithFallback,
  deleteFromStorage,
} from '../image-processor';
import type { S3Client } from '@aws-sdk/client-s3';

import { pngImage, gifImage } from './upload-fixtures';

describe('image-processor', () => {
  const dummyBuffer = pngImage;
  const gifBuffer = gifImage;

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

    it('prevents path traversal when attempting local storage write', async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        delete (process.env as any).NODE_ENV;
        delete (process.env as any).JEST_WORKER_ID;
        const mockS3 = {
          send: jest.fn().mockRejectedValue(new Error('S3 offline')),
        };

        const result = await uploadToStorageWithFallback(mockS3 as unknown as S3Client, {
          bucket: 'test-bucket',
          key: '../../etc/passwd',
          buffer: dummyBuffer,
          contentType: 'image/webp',
          publicUrl: 'https://cdn.example.com',
        });

        // Traversal is blocked safely without writing outside uploads directory
        expect(result).toBe(`data:image/webp;base64,${dummyBuffer.toString('base64')}`);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  describe('deleteFromStorage', () => {
    it('propagates failures when retention requires a retry', async () => {
      const error = new Error('R2 unavailable');
      const mockS3 = { send: jest.fn().mockRejectedValue(error) };
      await expect(
        deleteFromStorage(mockS3 as unknown as S3Client, {
          url: 'https://cdn.example.com/test-bucket/story.webp',
          bucket: 'test-bucket',
          publicUrl: 'https://cdn.example.com',
          strict: true,
        }),
      ).rejects.toBe(error);
    });

    it('never deletes objects through a lookalike public hostname', async () => {
      const mockS3 = { send: jest.fn() };
      await deleteFromStorage(mockS3 as unknown as S3Client, {
        url: 'https://cdn.example.com.evil.test/test-bucket/story.webp',
        bucket: 'test-bucket',
        publicUrl: 'https://cdn.example.com',
        strict: true,
      });
      expect(mockS3.send).not.toHaveBeenCalled();
    });
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
