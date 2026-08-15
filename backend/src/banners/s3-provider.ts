import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const BANNER_S3_CLIENT = 'BANNER_S3_CLIENT';

export const bannerS3Provider = {
  provide: BANNER_S3_CLIENT,
  useFactory: (configService: ConfigService) => {
    return new S3Client({
      endpoint:
        configService.get<string>('MINIO_ENDPOINT') ??
        configService.get<string>('S3_ENDPOINT') ??
        'http://minio:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId:
          configService.get<string>('MINIO_ACCESS_KEY') ??
          configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          configService.get<string>('MINIO_SECRET_KEY') ??
          configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: true,
      maxAttempts: 1,
    });
  },
  inject: [ConfigService],
};
