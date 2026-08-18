import {
  optimizeAvatar,
  optimizeBanner,
  optimizePostImage,
  optimizeGroupAvatar,
  uploadToStorageWithFallback,
  deleteFromStorage,
} from '../image-processor';
import type { S3Client } from '@aws-sdk/client-s3';

describe('image-processor', () => {
  const dummyBuffer = Buffer.from('test-image-content');

  describe('optimizations', () => {
    it('optimizes avatar and handles fallback gracefully', async () => {
      const result = await optimizeAvatar(dummyBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.contentType).toBeDefined();
      expect(result.ext).toBeDefined();
    });

    it('optimizes banner and handles fallback gracefully', async () => {
      const result = await optimizeBanner(dummyBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.contentType).toBeDefined();
    });

    it('optimizes post image and handles fallback gracefully', async () => {
      const result = await optimizePostImage(dummyBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.contentType).toBeDefined();
    });

    it('optimizes group avatar and handles fallback gracefully', async () => {
      const result = await optimizeGroupAvatar(dummyBuffer);
      expect(result).toBeDefined();
      expect(result.buffer).toBeDefined();
      expect(result.contentType).toBeDefined();
    });
  });

  describe('uploadToStorageWithFallback', () => {
    it('uploads to S3 successfully', async () => {
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
