import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const S3_CLIENT = 'S3_CLIENT';

export const s3Provider = {
  provide: S3_CLIENT,
  useFactory: (configService: ConfigService) => {
    return new S3Client({
      endpoint: configService.getOrThrow<string>('MINIO_ENDPOINT'),
      region: 'us-east-1',
      credentials: {
        accessKeyId: configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: configService.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
  },
  inject: [ConfigService],
};
