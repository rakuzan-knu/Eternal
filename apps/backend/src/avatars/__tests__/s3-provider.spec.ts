import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { S3_CLIENT, s3Provider } from '../s3-provider';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    config,
    _isS3Mock: true,
  })),
}));

describe('avatars s3Provider', () => {
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
    expect(S3_CLIENT).toBe('S3_CLIENT');
    expect(s3Provider.provide).toBe(S3_CLIENT);
    expect(s3Provider.inject).toEqual([ConfigService]);
  });

  it('initializes S3Client with MINIO environment variables when present', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        MINIO_ENDPOINT: 'http://custom-minio:9000',
        MINIO_ACCESS_KEY: 'minio-user',
        MINIO_SECRET_KEY: 'minio-pass',
      };
      return map[key];
    });

    s3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://custom-minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'minio-user',
        secretAccessKey: 'minio-pass',
      },
      forcePathStyle: true,
      maxAttempts: 1,
    });
  });

  it('initializes S3Client with S3 fallback environment variables when MINIO is missing', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        S3_ENDPOINT: 'https://s3.amazonaws.com',
        S3_ACCESS_KEY: 's3-key',
        S3_SECRET_KEY: 's3-secret',
      };
      return map[key];
    });

    s3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'https://s3.amazonaws.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 's3-key',
        secretAccessKey: 's3-secret',
      },
      forcePathStyle: true,
      maxAttempts: 1,
    });
  });

  it('initializes S3Client with default credentials when no env variables are present', () => {
    mockConfigService.get.mockReturnValue(undefined);

    s3Provider.useFactory(mockConfigService as unknown as ConfigService);

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
