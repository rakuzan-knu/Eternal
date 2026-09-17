import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { isR2Endpoint } from '../common/storage/storage-url.util';

export const REELS_S3_CLIENT = 'REELS_S3_CLIENT';

export const reelsS3Provider = {
  provide: REELS_S3_CLIENT,
  useFactory: (configService: ConfigService) => {
    const accountId = configService.get<string>('R2_ACCOUNT_ID');
    const endpoint =
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined) ??
      configService.get<string>('R2_ENDPOINT') ??
      configService.get<string>('MINIO_ENDPOINT') ??
      configService.get<string>('S3_ENDPOINT') ??
      'http://minio:9000';

    const isR2 = Boolean(accountId) || isR2Endpoint(endpoint);

    return new S3Client({
      endpoint,
      region: isR2 ? 'auto' : 'us-east-1',
      credentials: {
        accessKeyId:
          configService.get<string>('R2_ACCESS_KEY_ID') ??
          configService.get<string>('MINIO_ACCESS_KEY') ??
          configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          configService.get<string>('R2_SECRET_ACCESS_KEY') ??
          configService.get<string>('MINIO_SECRET_KEY') ??
          configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: !isR2,
    });
  },
  inject: [ConfigService],
};
