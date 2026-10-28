import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { runsBackground } from '../../config/service-role';
import { StorageService } from '../storage/storage.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { PendingMediaRepository } from './pending-media.repository';

@Injectable()
export class PendingMediaCleanupService {
  private readonly logger = new Logger(PendingMediaCleanupService.name);
  private running = false;

  constructor(
    private readonly pending: PendingMediaRepository,
    private readonly storage: StorageService,
    private readonly r2: R2StorageService,
    private readonly config: ConfigService,
  ) {}

  @Cron('20 * * * *')
  async cleanup(): Promise<void> {
    if (
      this.running ||
      !runsBackground('core') ||
      this.storage.isLocal() ||
      this.config.get<string>('MEDIA_PENDING_TRACKING_ENABLED') !== 'true' ||
      this.config.get<string>('MEDIA_ORPHAN_CLEANUP_ENABLED') !== 'true'
    )
      return;
    this.running = true;
    const before = new Date(Date.now() - 2 * 86400_000);
    const deadline = Date.now() + 45_000;
    try {
      await this.pending.pruneDeleted(new Date(Date.now() - 30 * 86400_000));
      for (const { key, bucket } of await this.pending.candidates(before)) {
        if (Date.now() >= deadline) break;
        try {
          if (!(await this.pending.claimDeletion(key, before))) continue;
          await this.storage
            .getS3Client()
            .send(
              new DeleteObjectCommand({ Bucket: bucket ?? this.r2.getDefaultBucket(), Key: key }),
              {
                abortSignal: AbortSignal.timeout(10_000),
              },
            );
          await this.pending.deleted(key);
        } catch {
          // DELETING stays durable and excludes publication until a later retry succeeds.
          this.logger.warn('Pending media cleanup will retry an object');
        }
      }
    } catch {
      this.logger.warn('Pending media cleanup unavailable');
    } finally {
      this.running = false;
    }
  }
}
