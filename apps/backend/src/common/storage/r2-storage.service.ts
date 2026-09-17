import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { IStorageService, UploadFileOptions } from './storage.interface';
import { isR2Endpoint, isCloudflareStorageDomain } from './storage-url.util';

@Injectable()
export class R2StorageService implements IStorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly s3Client: S3Client;
  private readonly defaultBucket: string;
  private readonly publicUrl: string;
  private readonly isDirectDomain: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const endpoint =
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined) ??
      this.configService.get<string>('R2_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      this.configService.get<string>('MINIO_ENDPOINT') ??
      'http://minio:9000';

    const accessKeyId =
      this.configService.get<string>('R2_ACCESS_KEY_ID') ??
      this.configService.get<string>('S3_ACCESS_KEY') ??
      this.configService.get<string>('MINIO_ACCESS_KEY') ??
      'rootuser';

    const secretAccessKey =
      this.configService.get<string>('R2_SECRET_ACCESS_KEY') ??
      this.configService.get<string>('S3_SECRET_KEY') ??
      this.configService.get<string>('MINIO_SECRET_KEY') ??
      'rootpassword';

    this.defaultBucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('S3_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET') ??
      'social-network';

    const rawPublicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      'http://localhost:9000';

    this.publicUrl = rawPublicUrl.replace(/\/+$/, '');

    const isR2 =
      Boolean(accountId) || isR2Endpoint(endpoint) || isCloudflareStorageDomain(this.publicUrl);

    this.isDirectDomain =
      isR2 ||
      isCloudflareStorageDomain(this.publicUrl) ||
      this.publicUrl.endsWith(`/${this.defaultBucket}`) ||
      this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'false';

    const forcePathStyle =
      !isR2 && this.configService.get<string>('S3_FORCE_PATH_STYLE') !== 'false';

    this.s3Client = new S3Client({
      endpoint,
      region: isR2 ? 'auto' : 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle,
      maxAttempts: 3,
    });

    this.logger.log(
      `Cloudflare R2/S3 Storage initialized. Endpoint: ${endpoint}, Bucket: ${this.defaultBucket}, PublicUrl: ${this.publicUrl}`,
    );
  }

  getS3Client(): S3Client {
    return this.s3Client;
  }

  getDefaultBucket(): string {
    return this.defaultBucket;
  }

  getPublicUrl(key: string, bucket?: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    const targetBucket = bucket || this.defaultBucket;

    if (this.isDirectDomain) {
      return `${this.publicUrl}/${cleanKey}`;
    }
    return `${this.publicUrl}/${targetBucket}/${cleanKey}`;
  }

  async upload(options: UploadFileOptions): Promise<string> {
    const cleanKey = options.key.replace(/^\/+/, '');
    const bucket = options.bucket || this.defaultBucket;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: cleanKey,
          Body: options.buffer,
          ContentType: options.contentType,
          CacheControl: options.cacheControl ?? 'public, max-age=31536000, immutable',
        }),
      );

      return this.getPublicUrl(cleanKey, bucket);
    } catch (err) {
      this.logger.error(
        `Failed to upload ${cleanKey} to Cloudflare R2 bucket ${bucket}: ${String(err)}`,
      );
      throw err;
    }
  }

  async delete(url: string, bucket?: string): Promise<void> {
    if (!url || url.startsWith('data:')) return;

    const targetBucket = bucket || this.defaultBucket;
    let key = '';

    if (url.startsWith(this.publicUrl)) {
      const remaining = url.slice(this.publicUrl.length).replace(/^\/+/, '');
      if (remaining.startsWith(`${targetBucket}/`)) {
        key = remaining.slice(`${targetBucket}/`.length);
      } else {
        key = remaining;
      }
    } else {
      // Fallback: extract last segment or path after bucket
      const parts = url.split('/');
      const bucketIdx = parts.indexOf(targetBucket);
      if (bucketIdx !== -1 && bucketIdx < parts.length - 1) {
        key = parts.slice(bucketIdx + 1).join('/');
      } else {
        key = parts[parts.length - 1] || '';
      }
    }

    if (!key) return;

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: targetBucket,
          Key: key,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to delete ${key} from Cloudflare R2 bucket ${targetBucket}: ${String(err)}`,
      );
    }
  }
}
