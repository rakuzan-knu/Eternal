import { runsBackground } from '../config/service-role';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { StoriesRepository } from './stories.repository';
import { deleteFromStorage } from '../common/media/image-processor';
import { isR2Endpoint } from '../common/storage/storage-url.util';
import { storyMediaAssets } from './story-media-assets';

@Injectable()
export class StoriesRetentionService implements OnModuleDestroy {
  private readonly logger = new Logger(StoriesRetentionService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private running = false;

  onModuleDestroy(): void {
    this.s3.destroy();
  }

  private readonly publicUrl: string;

  constructor(
    private readonly storiesRepo: StoriesRepository,
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'stories');
    this.publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';

    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const endpoint =
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined) ??
      this.configService.get<string>('R2_ENDPOINT') ??
      this.configService.get<string>('MINIO_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      'http://localhost:9000';

    const isR2 = Boolean(accountId) || isR2Endpoint(endpoint);

    this.s3 = new S3Client({
      endpoint,
      region: isR2 ? 'auto' : 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('R2_ACCESS_KEY_ID') ??
          this.configService.get<string>('MINIO_ACCESS_KEY') ??
          this.configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          this.configService.get<string>('R2_SECRET_ACCESS_KEY') ??
          this.configService.get<string>('MINIO_SECRET_KEY') ??
          this.configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: !isR2,
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredStories(): Promise<void> {
    if (!runsBackground('core') || this.running) return;
    this.running = true;
    this.logger.log('Starting bounded expired stories cleanup job...');

    try {
      const expired = await this.storiesRepo.findExpiredStories(100);
      if (expired.length === 0) {
        this.logger.log('No expired stories to clean up.');
        return;
      }

      this.logger.log(
        `Found ${expired.length} expired stories. Purging files and database records...`,
      );

      let deletedCount = 0;
      for (const story of expired) {
        let cleaned = true;
        for (const url of storyMediaAssets(story)) {
          try {
            if (await this.storiesRepo.isMediaReferenced(url, [story.id])) continue;
            await deleteFromStorage(this.s3, {
              url,
              bucket: this.bucket,
              publicUrl: this.publicUrl,
              strict: true,
            });
          } catch (err) {
            cleaned = false;
            this.logger.warn(
              `Failed to delete storage object for expired story ${story.id}: ${String(err)}`,
            );
          }
        }
        // Remove each successful reference before checking the next story. Otherwise
        // two expired stories sharing a URL can both skip its deletion forever.
        if (cleaned) deletedCount += await this.storiesRepo.deleteExpiredStories([story.id]);
      }

      this.logger.log(`Successfully purged ${deletedCount} expired story records from database.`);
    } catch (e) {
      this.logger.error(`Error during expired stories cleanup job: ${String(e)}`);
    } finally {
      this.running = false;
    }
  }
}
