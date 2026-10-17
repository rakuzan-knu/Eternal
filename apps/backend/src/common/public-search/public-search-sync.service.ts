import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma';
import { PublicSearchService } from './public-search.service';
import { PUBLIC_SEARCH_USER_SYNC } from './public-search.events';
import { runsBackground } from '../../config/service-role';
import { RESERVED_USERNAMES } from '@common/contracts';

@Injectable()
export class PublicSearchSyncService {
  private running = false;
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly provider: PublicSearchService,
  ) {}

  @Cron('*/30 * * * * *')
  async reconcile(): Promise<void> {
    if (
      !runsBackground('core') ||
      this.config.get<string>('PUBLIC_SEARCH_PROVIDER') !== 'algolia' ||
      this.running
    )
      return;
    this.running = true;
    try {
      for (let count = 0; count < 5; count++) {
        if (!(await this.processOne())) break;
      }
    } catch {
      // Durable intent is retained. No provider bodies, queries or keys enter logs.
    } finally {
      this.running = false;
    }
  }

  async processOne(): Promise<boolean> {
    const event = await this.prisma.outboxEvent.findFirst({
      where: {
        eventType: PUBLIC_SEARCH_USER_SYNC,
        OR: [
          { status: 'PENDING' },
          { status: 'FAILED', updatedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (!event) return false;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '50s'`;
          // Same order as User writes: row, identity advisory lock, then outbox row.
          const users = await tx.$queryRaw<
            { id: string; username: string; displayName: string | null }[]
          >`
          SELECT id, username, "displayName" FROM "User" WHERE id = ${event.aggregateId} FOR SHARE`;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'public-search:' + event.aggregateId}, 0))`;
          const intents = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM outbox_events WHERE id = ${event.id} AND event_type = ${PUBLIC_SEARCH_USER_SYNC}
          FOR UPDATE SKIP LOCKED`;
          if (!intents.length) return false;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('public-search-index', 0))`;
          const user = users[0];
          await this.provider.syncIdentity(
            event.aggregateId,
            user && !RESERVED_USERNAMES.some((name) => name === user.username) ? user : null,
          );
          await tx.outboxEvent.delete({ where: { id: event.id } });
          return true;
        },
        { timeout: 45_000 },
      );
    } catch (error) {
      await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, updatedAt: event.updatedAt },
        data: {
          status: 'FAILED',
          retryCount: { increment: 1 },
          lastError: 'Public identity sync unavailable',
        },
      });
      throw error;
    }
  }
}
