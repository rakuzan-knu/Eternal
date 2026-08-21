import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { AUTO_DELETE_S3_CLIENT, autoDeleteS3Provider } from '../s3-provider';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation((config: Record<string, unknown>) => ({
    config,
    _isAutoDeleteS3Mock: true,
  })),
}));

describe('messenger auto-delete autoDeleteS3Provider', () => {
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
    expect(AUTO_DELETE_S3_CLIENT).toBe('AUTO_DELETE_S3_CLIENT');
    expect(autoDeleteS3Provider.provide).toBe(AUTO_DELETE_S3_CLIENT);
    expect(autoDeleteS3Provider.inject).toEqual([ConfigService]);
  });

  it('initializes S3Client with MINIO configuration', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        MINIO_ENDPOINT: 'http://custom-minio:9000',
        MINIO_ACCESS_KEY: 'msg-key',
        MINIO_SECRET_KEY: 'msg-secret',
      };
      return map[key];
    });

    autoDeleteS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'http://custom-minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'msg-key',
        secretAccessKey: 'msg-secret',
      },
      forcePathStyle: true,
    });
  });

  it('initializes S3Client with S3 fallback configuration', () => {
    mockConfigService.get.mockImplementation((key: string) => {
      const map: Record<string, string> = {
        S3_ENDPOINT: 'https://s3.ap-southeast-1.amazonaws.com',
        S3_ACCESS_KEY: 'aws-access-key',
        S3_SECRET_KEY: 'aws-secret-key',
      };
      return map[key];
    });

    autoDeleteS3Provider.useFactory(mockConfigService as unknown as ConfigService);

    expect(S3Client).toHaveBeenCalledWith({
      endpoint: 'https://s3.ap-southeast-1.amazonaws.com',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'aws-access-key',
        secretAccessKey: 'aws-secret-key',
      },
      forcePathStyle: true,
    });
  });

  it('initializes S3Client with default credentials when env variables are absent', () => {
    mockConfigService.get.mockReturnValue(undefined);

    autoDeleteS3Provider.useFactory(mockConfigService as unknown as ConfigService);

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
