import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { CallTelemetry, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CassandraTelemetryRepository, telemetrySchema } from './cassandra-telemetry.repository';

export const TELEMETRY_EVENTS = [
  'CALL_TELEMETRY_WRITE',
  'CALL_TELEMETRY_PURGE_USER',
  'CALL_TELEMETRY_PURGE_CALL',
];
const ACTIVATION_ID = 'cassandra-telemetry-activated';

@Injectable()
export class TelemetrySyncRepository {
  private migrationChecked = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly cassandra: CassandraTelemetryRepository,
  ) {}

  private async lockParents(tx: Prisma.TransactionClient, record: CallTelemetry): Promise<boolean> {
    const users = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE id = ${record.userId} FOR KEY SHARE
    `;
    const calls = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM calls WHERE id = ${record.callId} FOR KEY SHARE
    `;
    return users.length > 0 && calls.length > 0;
  }

  async write(record: CallTelemetry): Promise<void> {
    if (!this.migrationChecked) {
      const triggers = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM pg_trigger
        WHERE tgname IN ('cassandra_telemetry_user_deleted', 'cassandra_telemetry_call_deleted')
          AND tgenabled <> 'D' AND NOT tgisinternal
      `;
      if (triggers[0]?.count !== 2n) {
        throw new ServiceUnavailableException('Apply Cassandra telemetry deletion migration first');
      }
      this.migrationChecked = true;
    }
    const id = `cassandra-telemetry-write:${record.id}`;
    await this.prisma.$transaction(async (tx) => {
      // Bound retained payloads during free-quota exhaustion; serialize only the short enqueue phase.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(771683521)`;
      const existing = await tx.outboxEvent.findUnique({ where: { id }, select: { id: true } });
      if (
        !existing &&
        (await tx.outboxEvent.count({ where: { eventType: 'CALL_TELEMETRY_WRITE' } })) >= 1000
      ) {
        throw new ServiceUnavailableException('Telemetry backlog is full');
      }
      if (!(await this.lockParents(tx, record)))
        throw new NotFoundException('Call or user no longer exists');
      await tx.outboxEvent.upsert({
        where: { id: ACTIVATION_ID },
        update: {},
        create: {
          id: ACTIVATION_ID,
          aggregateType: 'CALL_TELEMETRY',
          aggregateId: ACTIVATION_ID,
          eventType: 'CASSANDRA_TELEMETRY_ACTIVATED',
          payload: {},
          status: 'PUBLISHED',
        },
      });
      await tx.outboxEvent.upsert({
        where: { id },
        update: {},
        create: {
          id,
          aggregateType: 'CALL_TELEMETRY',
          aggregateId: record.callId,
          eventType: 'CALL_TELEMETRY_WRITE',
          payload: { ...record, createdAt: record.createdAt.toISOString() },
        },
      });
    });
    // The intent is durable before contacting Cassandra. An ambiguous timeout must never lose its keys.
    await this.processOne(id);
  }

  async processOne(id?: string): Promise<boolean> {
    // TLS/bootstrap must not consume the parent-lock transaction's time budget.
    await this.cassandra.connect();
    let claimedId: string | undefined;
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '25s'`;
          const rows = id
            ? await tx.$queryRaw<{ id: string }[]>`
              SELECT id FROM outbox_events WHERE id = ${id} FOR UPDATE
            `
            : await tx.$queryRaw<{ id: string }[]>`
              SELECT id FROM outbox_events
              WHERE event_type IN ('CALL_TELEMETRY_WRITE', 'CALL_TELEMETRY_PURGE_USER', 'CALL_TELEMETRY_PURGE_CALL')
                AND (status = 'PENDING' OR (status = 'FAILED' AND updated_at < NOW() - INTERVAL '15 minutes'))
              ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
            `;
          claimedId = rows[0]?.id;
          if (!claimedId) return false;
          const event = await tx.outboxEvent.findUniqueOrThrow({ where: { id: claimedId } });
          let complete = true;
          if (event.eventType === 'CALL_TELEMETRY_WRITE') {
            const record = telemetrySchema.parse(event.payload);
            if (await this.lockParents(tx, record)) await this.cassandra.write(record);
            else await this.cassandra.purgeRecord(record);
          } else if (
            event.eventType === 'CALL_TELEMETRY_PURGE_USER' ||
            event.eventType === 'CALL_TELEMETRY_PURGE_CALL'
          ) {
            complete = await this.cassandra.purgeBatch(
              event.eventType === 'CALL_TELEMETRY_PURGE_USER' ? 'user' : 'call',
              event.aggregateId,
            );
          } else throw new Error('Unexpected telemetry outbox event');
          if (complete) await tx.outboxEvent.delete({ where: { id: claimedId } });
          return true;
        },
        { timeout: 20000 },
      );
    } catch (error) {
      if (claimedId) {
        await this.prisma.outboxEvent.updateMany({
          where: { id: claimedId },
          data: {
            status: 'FAILED',
            retryCount: { increment: 1 },
            lastError: 'Cassandra synchronization unavailable',
          },
        });
      }
      throw error;
    }
  }
}
