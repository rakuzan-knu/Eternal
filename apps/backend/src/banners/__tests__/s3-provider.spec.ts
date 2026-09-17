import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { BANNER_S3_CLIENT, bannerS3Provider } from '../s3-provider';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    config,
    _isBannerS3Mock: true,
  })),
}));

describe('banners bannerS3Provider', () => {
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
    expect(BANNER_S3_CLIENT).toBe('BANNER_S3_CLIENT');
    expect(bannerS3Provider.provide).toBe(BANNER_S3_CLIENT);
    expect(bannerS3Provider.inject).toEqual([ConfigService]);
  });

  it('initializes S3Client with MINIO configuration', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        MINIO_ENDPOINT: 'http://custom-minio:9000',
        MINIO_ACCESS_KEY: 'banner-minio-user',
        MINIO_SECRET_KEY: 'banner-minio-pass',
      };
      return map[key];
    });

    bannerS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://custom-minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'banner-minio-user',
        secretAccessKey: 'banner-minio-pass',
      },
      forcePathStyle: true,
      maxAttempts: 1,
    });
  });

  it('initializes S3Client with S3 fallback configuration', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        S3_ENDPOINT: 'https://s3.eu-west-1.amazonaws.com',
        S3_ACCESS_KEY: 'banner-s3-key',
        S3_SECRET_KEY: 'banner-s3-secret',
      };
      return map[key];
    });

    bannerS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'https://s3.eu-west-1.amazonaws.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'banner-s3-key',
        secretAccessKey: 'banner-s3-secret',
      },
      forcePathStyle: true,
      maxAttempts: 1,
    });
  });

  it('initializes S3Client with default credentials when env variables are absent', () => {
    mockConfigService.get.mockReturnValue(undefined);

    bannerS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'rootuser',
        secretAccessKey: 'rootpassword',
      },
      forcePathStyle: true,
      maxAttempts: 1,
    });
  });
});
