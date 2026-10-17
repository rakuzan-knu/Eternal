import 'dotenv/config';
import { isDeepStrictEqual } from 'node:util';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { TelemetrySyncRepository } from '../src/common/cassandra/telemetry-sync.repository';
import { CassandraTelemetryRepository } from '../src/common/cassandra/cassandra-telemetry.repository';
import { createTelemetryClient, TELEMETRY_SCHEMA } from '../src/common/cassandra/telemetry-client';

async function main(): Promise<void> {
  const action = process.argv[2];
  if (!['init', 'backfill', 'verify', 'check'].includes(action ?? '')) {
    throw new Error('Usage: cassandra-telemetry.ts init|backfill|verify|check');
  }
  const bundlePath = process.env.CASSANDRA_SECURE_CONNECT_BUNDLE;
  const token = process.env.CASSANDRA_APPLICATION_TOKEN;
  const keyspace = process.env.CASSANDRA_KEYSPACE;
  if (!bundlePath || !token || !keyspace) throw new Error('Cassandra configuration is incomplete');
  const client = createTelemetryClient({ bundlePath, token, keyspace });
  try {
    if (action === 'init') {
      for (const query of TELEMETRY_SCHEMA) await client.execute(query, [], { prepare: false });
      console.log('Cassandra telemetry tables initialized. No PostgreSQL records changed.');
      return;
    }
    await client.execute('SELECT user_id FROM call_telemetry_by_user WHERE user_id = ? LIMIT 1', [
      'connection-check',
    ]);
    await client.execute('SELECT call_id FROM call_telemetry_by_call WHERE call_id = ? LIMIT 1', [
      'connection-check',
    ]);
    if (action === 'check') {
      console.log('Connected to both Cassandra telemetry tables.');
      return;
    }
    if (process.env.CALL_TELEMETRY_STORAGE === 'cassandra') {
      throw new Error('Backfill and verification require PostgreSQL to remain the write source');
    }
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
    const prisma = new PrismaService();
    const store = new CassandraTelemetryRepository(new ConfigService(process.env));
    const sync = new TelemetrySyncRepository(prisma, store);
    let cursor: string | undefined;
    let count = 0;
    try {
      for (;;) {
        const records = await prisma.callTelemetry.findMany({
          orderBy: { id: 'asc' },
          take: 50,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (records.length === 0) break;
        for (const candidate of records) {
          const record = await prisma.callTelemetry.findUnique({ where: { id: candidate.id } });
          if (!record) continue;
          if (action === 'backfill') await sync.write(record);
          const result = await client.execute(
            'SELECT payload FROM call_telemetry_by_user WHERE user_id = ? AND created_at = ? AND id = ?',
            [record.userId, record.createdAt, record.id],
          );
          const payload: unknown = result.first()?.get('payload');
          const expected: unknown = JSON.parse(JSON.stringify(record));
          if (typeof payload !== 'string' || !isDeepStrictEqual(JSON.parse(payload), expected)) {
            throw new Error('Cassandra telemetry content verification failed');
          }
          const reverse = await client.execute(
            'SELECT id FROM call_telemetry_by_call WHERE call_id = ? AND user_id = ? AND created_at = ? AND id = ?',
            [record.callId, record.userId, record.createdAt, record.id],
          );
          if (!reverse.first())
            throw new Error('Cassandra telemetry deletion index verification failed');
          count++;
        }
        cursor = records[records.length - 1]?.id;
        console.log(`Verified ${count} PostgreSQL telemetry records in Cassandra.`);
      }
      console.log(`Completed ${action}: ${count} records verified. No PostgreSQL records deleted.`);
    } finally {
      await store.onModuleDestroy();
      await prisma.$disconnect();
      await prisma.pool?.end();
    }
  } finally {
    await client.shutdown();
  }
}

void main().catch((error: unknown) => {
  // Driver errors may contain connection metadata; never print credentials or bundles.
  console.error(
    'Cassandra operation failed:',
    error instanceof Error ? error.name : 'UnknownError',
  );
  process.exitCode = 1;
});
