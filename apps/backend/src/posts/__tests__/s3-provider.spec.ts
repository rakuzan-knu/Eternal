import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { POSTS_S3_CLIENT, postsS3Provider } from '../s3-provider';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    config,
    _isPostsS3Mock: true,
  })),
}));

describe('posts postsS3Provider', () => {
  let mockConfigService: {
    get: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService = {
      get: jest.fn(),
    };
  });

  it('exports correct provider token and injects ConfigService', () => {
    expect(POSTS_S3_CLIENT).toBe('POSTS_S3_CLIENT');
    expect(postsS3Provider.provide).toBe(POSTS_S3_CLIENT);
    expect(postsS3Provider.inject).toEqual([ConfigService]);
  });

  it('initializes S3Client with MINIO configuration', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        MINIO_ENDPOINT: 'http://custom-minio:9000',
        MINIO_ACCESS_KEY: 'posts-minio-key',
        MINIO_SECRET_KEY: 'posts-minio-secret',
      };
      return map[key];
    });

    postsS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://custom-minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'posts-minio-key',
        secretAccessKey: 'posts-minio-secret',
      },
      forcePathStyle: true,
    });
  });

  it('initializes S3Client with S3 fallback configuration', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        S3_ENDPOINT: 'https://s3.us-west-2.amazonaws.com',
        S3_ACCESS_KEY: 'posts-s3-key',
        S3_SECRET_KEY: 'posts-s3-secret',
      };
      return map[key];
    });

    postsS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'https://s3.us-west-2.amazonaws.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'posts-s3-key',
        secretAccessKey: 'posts-s3-secret',
      },
      forcePathStyle: true,
    });
  });

  it('initializes S3Client with default credentials when env variables are absent', () => {
    mockConfigService.get.mockReturnValue(undefined);

    postsS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'rootuser',
        secretAccessKey: 'rootpassword',
      },
      forcePathStyle: true,
    });
  });
});
