import 'reflect-metadata';
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { MessageBodyRepository } from '../src/common/cassandra/message-body.repository';
import {
  MessageBodyService,
  MESSAGE_BODY_EVENTS,
} from '../src/common/cassandra/message-body.service';

const prisma = new PrismaService();
const bodies = new MessageBodyRepository(new ConfigService(process.env));
const history = new MessageBodyService(prisma, bodies);

async function requireCompatibleDeployment(): Promise<void> {
  if (!process.argv.includes('--compatible-readers-deployed'))
    throw new Error('Deploy compatible readers and outbox publisher before enabling capture');
  await bodies.check();
}

async function main(): Promise<void> {
  const action = process.argv[2];
  if (action === 'init') {
    await bodies.initialize();
    console.log('Message body table initialized.');
    return;
  }
  if (action === 'check') {
    await bodies.check();
    console.log('Connected to the message body table.');
    return;
  }
  await prisma.$connect();
  if (action === 'stats') {
    const rows = await prisma.$queryRaw<
      Array<{
        messages: bigint;
        archived: bigint;
        inline_bytes: bigint;
        search_bytes: bigint;
        total_relation_bytes: bigint;
      }>
    >`
      SELECT COUNT(*)::bigint AS messages, COUNT(*) FILTER (WHERE body_archived)::bigint AS archived,
        COALESCE(SUM(octet_length(body)), 0)::bigint AS inline_bytes,
        COALESCE(SUM(octet_length(body_search)), 0)::bigint AS search_bytes,
        pg_total_relation_size('"Message"') AS total_relation_bytes FROM "Message"
    `;
    console.log(
      JSON.stringify(rows, (_key, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
    return;
  }
  if (action === 'capture-on') {
    await requireCompatibleDeployment();
    await prisma.$executeRaw`UPDATE message_body_archive_config SET capture_enabled = true WHERE id`;
    console.log('Durable capture enabled. PostgreSQL bodies remain until verified copies finish.');
    return;
  }
  if (action === 'capture-off') {
    // This is the final rollback step, never the first. Producers must already be stopped.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "Message" IN SHARE ROW EXCLUSIVE MODE`;
      if (
        (await tx.message.count({ where: { bodyArchived: true } })) ||
        (await tx.outboxEvent.count({ where: { eventType: { in: MESSAGE_BODY_EVENTS } } }))
      )
        throw new Error('Restore archived bodies and drain intents before disabling capture');
      await tx.$executeRaw`UPDATE message_body_archive_config SET capture_enabled = false WHERE id`;
    });
    console.log('Capture disabled; PostgreSQL is complete.');
    return;
  }
  if (action === 'backfill') {
    await requireCompatibleDeployment();
    const config = await prisma.$queryRaw<Array<{ capture_enabled: boolean }>>`
      SELECT capture_enabled FROM message_body_archive_config WHERE id
    `;
    if (!config[0]?.capture_enabled) throw new Error('Enable durable capture first');
    let cursor: string | undefined;
    let copied = 0;
    while (true) {
      const ids = await prisma.message.findMany({
        where: {
          ...(cursor ? { id: { gt: cursor } } : {}),
          body: { not: null },
          bodyArchived: false,
        },
        orderBy: { id: 'asc' },
        take: 25,
        select: { id: true },
      });
      if (!ids.length) break;
      for (const { id } of ids) {
        await prisma.$transaction(async (tx) => {
          const rows = await tx.$queryRaw<
            Array<{ body_revision: bigint; body_archived: boolean; body: string | null }>
          >`
            SELECT body_revision, body_archived, body FROM "Message" WHERE id = ${id} FOR UPDATE
          `;
          const row = rows[0];
          if (!row || row.body_archived || row.body === null) return;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(771683522)`;
          if ((await tx.outboxEvent.count({ where: { eventType: 'MESSAGE_BODY_WRITE' } })) >= 1000)
            throw new Error('Drain the message body backlog before continuing');
          await tx.outboxEvent.upsert({
            where: { id: `message-body:${id}` },
            update: {},
            create: {
              id: `message-body:${id}`,
              aggregateType: 'MESSAGE_BODY',
              aggregateId: id,
              eventType: 'MESSAGE_BODY_WRITE',
              payload: { revision: row.body_revision.toString() },
            },
          });
        });
        await history.processOne(`message-body:${id}`);
        copied++;
      }
      cursor = ids[ids.length - 1].id;
    }
    console.log(`Backfill processed ${copied} records. Run verify with submissions stopped.`);
    return;
  }
  if (action === 'verify') {
    let cursor: string | undefined;
    let checked = 0;
    while (true) {
      const rows = await prisma.message.findMany({
        where: { ...(cursor ? { id: { gt: cursor } } : {}), bodyArchived: true },
        orderBy: { id: 'asc' },
        take: 50,
        select: { id: true, body: true, bodyRevision: true, bodyDigest: true },
      });
      if (!rows.length) break;
      for (const row of rows) {
        const stored = await bodies.read(row.id);
        if (
          row.body !== null ||
          !stored ||
          stored.revision !== row.bodyRevision ||
          createHash('sha256').update(stored.body).digest('hex') !== row.bodyDigest
        )
          throw new Error('Message body verification failed');
        checked++;
      }
      cursor = rows[rows.length - 1].id;
    }
    const inline = await prisma.message.count({
      where: { body: { not: null }, bodyArchived: false, deletedForAll: false, deletedAt: null },
    });
    const pending = await prisma.outboxEvent.count({
      where: { eventType: { in: MESSAGE_BODY_EVENTS } },
    });
    if (inline || pending)
      throw new Error('Message body backfill or synchronization is incomplete');
    console.log(
      `Verified ${checked} archived bodies, their revisions and SHA-256 digests; no pending work.`,
    );
    return;
  }
  if (action === 'restore') {
    // Stop the archive worker and submissions first. Triggers durably record restored writes.
    while (true) {
      const rows = await prisma.message.findMany({
        where: { bodyArchived: true },
        take: 25,
        select: { id: true },
      });
      if (!rows.length) break;
      for (const { id } of rows) {
        await history.restoreOne(id);
      }
    }
    console.log('Archived bodies restored. Drain remaining deletion intents before capture-off.');
    return;
  }
  if (action === 'drain') {
    for (let count = 0; count < 1000; count++) if (!(await history.processOne())) break;
    console.log('Drain complete or deferred work remains. Check outbox before rollback.');
    return;
  }
  if (action === 'compact-outbox') {
    let compacted = 0;
    while (true) {
      const changed = await prisma.$executeRaw`
        WITH batch AS (SELECT id FROM outbox_events WHERE status = 'PUBLISHED'
          AND event_type = 'MESSAGE_SENT' AND payload ? 'messageView' LIMIT 100 FOR UPDATE SKIP LOCKED)
        UPDATE outbox_events SET payload = payload - 'messageView', updated_at = NOW()
        WHERE id IN (SELECT id FROM batch)
      `;
      compacted += changed;
      if (!changed) break;
    }
    console.log(`Removed delivered message snapshots from ${compacted} published events.`);
    return;
  }
  throw new Error(
    'Use init, check, stats, capture-on, backfill, verify, restore, drain, compact-outbox or capture-off',
  );
}

main()
  .catch(() => {
    console.error(
      'Message history operation failed; check configuration and rollout prerequisites. No credentials or message bodies logged.',
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await bodies.onModuleDestroy();
    await prisma.onModuleDestroy();
  });
