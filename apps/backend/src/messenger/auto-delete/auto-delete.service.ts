import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AutoDeletePeriod } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '@common/prisma';
import { MessengerGateway } from '../gateway/messenger.gateway';
import { AUTO_DELETE_S3_CLIENT } from './s3-provider';
import { cutoffFor } from './auto-delete.util';

import { TraceContext } from '../../common/tracing/trace-context';
import { chunkQuery } from '../../common/utils/batch-stream.util';
import { randomUUID } from 'node:crypto';
import { deleteFromStorage } from '../../common/media/image-processor';

const PAGE_SIZE = 200;
const USER_BATCH_SIZE = 500;

@Injectable()
export class AutoDeleteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoDeleteService.name);
  private readonly bucket: string;
  private readonly publicUrl: string;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: MessengerGateway,
    private readonly configService: ConfigService,
    @Inject(AUTO_DELETE_S3_CLIENT) private readonly s3: S3Client,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'avatars');
    this.publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL', '');
  }

  /** Hourly sweep: per-message TTL delete of each user's own messages past their chosen period. */
  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    if (this.running) {
      this.logger.warn('Auto-delete sweep already running; skipping this tick.');
      return;
    }
    this.running = true;
    const now = Date.now();
    const traceId = `cron-autodelete-${randomUUID()}`;

    await TraceContext.runIsolated(
      {
        traceId,
        correlationId: traceId,
        reqMethod: 'CRON',
        reqUrl: 'AutoDeleteService.sweep',
        startTime: now,
      },
      async () => {
        try {
          await chunkQuery({
            chunkSize: USER_BATCH_SIZE,
            fetcher: (skip, take) =>
              this.prisma.user.findMany({
                where: { autoDeletePeriod: { not: AutoDeletePeriod.OFF } },
                select: { id: true, autoDeletePeriod: true },
                skip,
                take,
                orderBy: { id: 'asc' },
              }),
            handler: async (users) => {
              for (const user of users) {
                const cutoff = cutoffFor(user.autoDeletePeriod, now);
                if (!cutoff) continue;
                await this.purgeUserMessages(user.id, cutoff).catch((e) =>
                  this.logger.error(`Auto-delete failed for user ${user.id}: ${String(e)}`),
                );
              }
            },
          });
        } finally {
          this.running = false;
        }
      },
    );
  }

  private async purgeUserMessages(userId: string, cutoff: Date): Promise<void> {
    while (true) {
      const messages = await this.prisma.message.findMany({
        where: { senderId: userId, createdAt: { lt: cutoff } },
        select: {
          id: true,
          conversationId: true,
          attachments: { select: { url: true } },
        },
        take: PAGE_SIZE,
        orderBy: { createdAt: 'asc' },
      });

      if (messages.length === 0) break;

      for (const message of messages) {
        for (const attachment of message.attachments) {
          await this.deleteObjectByUrl(attachment.url).catch((e) =>
            this.logger.warn(`Failed to delete S3 object ${attachment.url}: ${String(e)}`),
          );
        }
      }

      const ids = messages.map((m) => m.id);
      await this.prisma.message.deleteMany({ where: { id: { in: ids } } });

      for (const message of messages) {
        this.gateway.emitMessageDeleted(message.conversationId, message.id, true);
      }

      if (messages.length < PAGE_SIZE) break;
    }
  }

  private async deleteObjectByUrl(url: string): Promise<void> {
    await deleteFromStorage(this.s3, {
      url,
      bucket: this.bucket,
      publicUrl: this.publicUrl,
    });
  }

  onModuleInit(): void {
    this.logger.log('AutoDeleteService initialized');
  }

  onModuleDestroy(): void {
    this.running = false;
  }
}
