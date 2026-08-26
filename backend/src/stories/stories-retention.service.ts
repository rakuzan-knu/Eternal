import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { StoriesRepository } from './stories.repository';

@Injectable()
export class StoriesRetentionService {
  private readonly logger = new Logger(StoriesRetentionService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly storiesRepo: StoriesRepository,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'stories');
    this.s3 = new S3Client({
      endpoint:
        this.configService.get<string>('MINIO_ENDPOINT') ??
        this.configService.get<string>('S3_ENDPOINT') ??
        'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') ??
          this.configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ??
          this.configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: true,
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredStories(): Promise<void> {
    this.logger.log('Starting daily expired stories cleanup job...');

    try {
      const expired = await this.storiesRepo.findExpiredStories();
      if (expired.length === 0) {
        this.logger.log('No expired stories to clean up.');
        return;
      }

      this.logger.log(
        `Found ${expired.length} expired stories. Purging files and database records...`,
      );

      for (const story of expired) {
        if (
          story.mediaUrl &&
          !story.mediaUrl.startsWith('color:') &&
          !story.mediaUrl.startsWith('data:')
        ) {
          try {
            const urlParts = story.mediaUrl.split('/');
            const key = `stories/${urlParts[urlParts.length - 1]}`;
            await this.s3.send(
              new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
              }),
            );
          } catch (err) {
            this.logger.warn(
              `Failed to delete S3 object for expired story ${story.id}: ${String(err)}`,
            );
          }
        }
      }

      const deletedCount = await this.storiesRepo.deleteExpiredStories(
        expired.map((s: any) => s.id),
      );
      this.logger.log(`Successfully purged ${deletedCount} expired story records from database.`);
    } catch (e) {
      this.logger.error(`Error during expired stories cleanup job: ${String(e)}`);
    }
  }
}
