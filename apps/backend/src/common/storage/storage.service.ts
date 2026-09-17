import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import type { IStorageService, StorageDriver, UploadFileOptions } from './storage.interface';
import { LocalDiskStorageService } from './local-disk-storage.service';
import { R2StorageService } from './r2-storage.service';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'r2' | 'local';

  constructor(
    private readonly configService: ConfigService,
    private readonly localDiskStorage: LocalDiskStorageService,
    private readonly r2Storage: R2StorageService,
  ) {
    const rawDriver = this.configService.get<StorageDriver>('STORAGE_DRIVER', 'auto');
    const isRender = Boolean(process.env.RENDER || process.env.RENDER_SERVICE_ID);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const hasR2Config = Boolean(
      this.configService.get<string>('R2_ACCOUNT_ID') ||
      this.configService.get<string>('R2_ENDPOINT') ||
      this.configService.get<string>('R2_ACCESS_KEY_ID'),
    );

    if (rawDriver === 'local') {
      this.driver = 'local';
    } else if (rawDriver === 'r2' || rawDriver === 's3' || rawDriver === 'minio') {
      this.driver = 'r2';
    } else {
      // Auto mode:
      // On Render or Production -> ALWAYS Cloudflare R2 (0 bytes stored on server)
      if (isRender || isProduction || hasR2Config) {
        this.driver = 'r2';
      } else {
        // Localhost pnpm dev -> Local Disk storage
        this.driver = 'local';
      }
    }

    this.logger.log(
      `Active media storage driver: [${this.driver.toUpperCase()}] (isRender: ${isRender}, isProduction: ${isProduction})`,
    );
  }

  getDriver(): 'r2' | 'local' {
    return this.driver;
  }

  isLocal(): boolean {
    return this.driver === 'local';
  }

  isR2(): boolean {
    return this.driver === 'r2';
  }

  getS3Client(): S3Client {
    return this.r2Storage.getS3Client();
  }

  getPublicUrl(key: string, bucket?: string): string {
    if (this.driver === 'local') {
      return this.localDiskStorage.getPublicUrl(key);
    }
    return this.r2Storage.getPublicUrl(key, bucket);
  }

  async upload(options: UploadFileOptions): Promise<string> {
    if (this.driver === 'local') {
      return this.localDiskStorage.upload(options);
    }
    return this.r2Storage.upload(options);
  }

  async delete(url: string, bucket?: string): Promise<void> {
    if (!url) return;

    if (this.driver === 'local' || url.includes('/uploads/')) {
      await this.localDiskStorage.delete(url);
    }
    if (this.driver === 'r2' || !url.includes('/uploads/')) {
      await this.r2Storage.delete(url, bucket);
    }
  }
}
