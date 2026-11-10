import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe } from 'vitest';
import { OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TELEMETRY_EVENTS } from '../../cassandra/telemetry-sync.repository';
import { MESSAGE_BODY_EVENTS } from '../../cassandra/message-body.service';
import { OutboxRepository } from '../repositories/outbox.repository';

const connection = process.env.PRIVATE_ORPHAN_TEST_DATABASE_URL;
const ordinary = ['COMMUNITY_CHANGED', 'POST_CREATED', 'MESSAGE_SENT', 'NOTIFICATION_CREATED'];
const specialized = [...TELEMETRY_EVENTS, ...MESSAGE_BODY_EVENTS, 'public_search.user.sync'];

// Shares only the disposable loopback database with private-media tests. Its
// enum/table are distinct; neither suite reads production payloads or credentials.
describe.skipIf(!connection)('outbox terminal publication on PostgreSQL', () => {
  let prisma: PrismaService;
  let repository: OutboxRepository;
  let sequence = 0;
  beforeAll(async () => {
    if (!connection) throw new Error('Explicit fixture connection required');
    const url = new URL(connection);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/private_orphan_test' ||
      url.username !== 'private_orphan_fixture'
    )
      throw new Error('Use only the disposable private orphan fixture');
    vi.stubEnv('DATABASE_URL', connection);
    prisma = new PrismaService();
    await prisma.$connect();
    await prisma.$executeRawUnsafe(
      `CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED')`,
    );
    await prisma.$executeRawUnsafe(`CREATE TABLE outbox_events (
      id text PRIMARY KEY, aggregate_type text NOT NULL, aggregate_id text NOT NULL,
      event_type text NOT NULL, payload jsonb NOT NULL, headers jsonb,
      status "OutboxStatus" NOT NULL DEFAULT 'PENDING', retry_count integer NOT NULL DEFAULT 0,
      last_error text, processed_at timestamp, created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now())`);
    const migration = await readFile(
      resolve(
        __dirname,
        '../../../../prisma/migrations/20261110020000_outbox_published_terminal/migration.sql',
      ),
      'utf8',
    );
    if (!prisma.pool) throw new Error('Fixture PostgreSQL pool unavailable');
    await prisma.pool.query(migration);
    repository = new OutboxRepository(prisma);
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE outbox_events');
    sequence = 0;
  });
  afterAll(async () => {
    if (prisma) await prisma.onModuleDestroy();
    vi.unstubAllEnvs();
  });
  const fixture = (
    eventType: string,
    status: OutboxStatus = OutboxStatus.PROCESSING,
    retryCount = 0,
  ) => {
    const id = randomUUID();
    return prisma.outboxEvent.create({
      data: {
        id,
        aggregateType: 'SYNTHETIC',
        aggregateId: `aggregate-${id}`,
        eventType,
        status,
        retryCount,
        payload: { content: 'synthetic content only', messageView: { body: 'synthetic message' } },
        headers: { traceId: 'synthetic-trace', context: 'synthetic-only' },
        lastError: 'earlier synthetic failure',
        createdAt: new Date(++sequence * 1000),
        updatedAt: new Date(0),
      },
    });
  };
  const stored = (id: string) => prisma.outboxEvent.findUniqueOrThrow({ where: { id } });

  it.each(ordinary)(
    'scrubs %s content only after successful processing and retains event identity',
    async (type) => {
      const event = await fixture(type, OutboxStatus.PROCESSING, 2);
      await repository.markAsPublished(event.id);
      const published = await stored(event.id);
      expect(published).toMatchObject({
        id: event.id,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: type,
        status: OutboxStatus.PUBLISHED,
        payload: {},
        headers: null,
        lastError: null,
        retryCount: 2,
        createdAt: event.createdAt,
      });
      expect(published.processedAt).toBeInstanceOf(Date);
      expect(published.updatedAt.getTime()).toBeGreaterThan(event.updatedAt.getTime());
    },
  );

  it('retains failed content for retry and cannot resurrect or re-ack a published event', async () => {
    const event = await fixture('MESSAGE_SENT');
    await repository.markAsFailed(event.id, 'x'.repeat(2100));
    expect(await stored(event.id)).toMatchObject({
      status: OutboxStatus.FAILED,
      retryCount: 1,
      payload: event.payload,
      headers: event.headers,
      lastError: 'x'.repeat(2000),
    });
    expect(await repository.claimPendingEvents(1, 5)).toMatchObject([
      { id: event.id, payload: event.payload, headers: event.headers },
    ]);
    await repository.markAsPublished(event.id);
    const published = await stored(event.id);
    await repository.markAsFailed(event.id, 'late failure');
    await repository.markAsPublished(event.id);
    expect(await stored(event.id)).toEqual(published);
  });

  it('keeps retry eligibility, oldest-first ordering and all specialized exclusions', async () => {
    await fixture('MESSAGE_SENT', OutboxStatus.FAILED, 5);
    const pending = await fixture('POST_CREATED', OutboxStatus.PENDING);
    const retry = await fixture('COMMUNITY_CHANGED', OutboxStatus.FAILED, 4);
    await fixture('MESSAGE_SENT', OutboxStatus.PROCESSING);
    await fixture('MESSAGE_SENT', OutboxStatus.PUBLISHED);
    const excluded = [];
    for (const type of specialized) excluded.push(await fixture(type, OutboxStatus.PENDING));
    expect((await repository.claimPendingEvents(1, 5)).map((e) => e.id)).toEqual([pending.id]);
    expect((await repository.claimPendingEvents(10, 5)).map((e) => e.id)).toEqual([retry.id]);
    for (const event of excluded) expect(await stored(event.id)).toEqual(event);
  });

  it.each([...specialized, 'FUTURE_EVENT', 'POST_UPDATED'])(
    'preserves %s payload and its separate legacy state machine',
    async (type) => {
      const event = await fixture(type);
      await repository.markAsPublished(event.id);
      expect(await stored(event.id)).toMatchObject({
        status: OutboxStatus.PUBLISHED,
        payload: event.payload,
        headers: event.headers,
      });
      await prisma.$executeRaw`UPDATE outbox_events SET status = 'PENDING' WHERE id = ${event.id}`;
      expect((await stored(event.id)).status).toBe(OutboxStatus.PENDING);
    },
  );

  it('does not scrub pending, failed or already-published historical payloads', async () => {
    for (const status of [OutboxStatus.PENDING, OutboxStatus.FAILED, OutboxStatus.PUBLISHED]) {
      const event = await fixture('POST_CREATED', status);
      await repository.markAsPublished(event.id);
      await repository.markAsFailed(event.id, 'not processing');
      expect(await stored(event.id)).toEqual(event);
    }
    await expect(repository.markAsFailed('missing', 'absent')).resolves.toBeUndefined();
    await expect(repository.markAsPublished('missing')).resolves.toBeUndefined();
  });

  it('skips a locked oldest row and gives concurrent workers disjoint claim batches', async () => {
    const oldest = await fixture('MESSAGE_SENT', OutboxStatus.PENDING);
    const next = await fixture('POST_CREATED', OutboxStatus.PENDING);
    const last = await fixture('NOTIFICATION_CREATED', OutboxStatus.PENDING);
    if (!prisma.pool) throw new Error('Fixture PostgreSQL pool unavailable');
    const blocker = await prisma.pool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT id FROM outbox_events WHERE id = $1 FOR UPDATE', [oldest.id]);
      const batches = await Promise.all([
        repository.claimPendingEvents(1, 5),
        repository.claimPendingEvents(1, 5),
      ]);
      const ids = batches.flat().map((e) => e.id);
      expect(new Set(ids)).toEqual(new Set([next.id, last.id]));
      expect(ids).toHaveLength(2);
      expect((await stored(oldest.id)).status).toBe(OutboxStatus.PENDING);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
    expect((await repository.claimPendingEvents(1, 5)).map((e) => e.id)).toEqual([oldest.id]);
  });

  it.each(ordinary)(
    'blocks legacy stale raw transitions away from published %s during rollout',
    async (type) => {
      const event = await fixture(type);
      if (!prisma.pool) throw new Error('Fixture PostgreSQL pool unavailable');
      const legacy = await prisma.pool.connect();
      try {
        await legacy.query('BEGIN');
        // An old writer has read a full event before another worker publishes it.
        await legacy.query('SELECT payload FROM outbox_events WHERE id = $1', [event.id]);
        await repository.markAsPublished(event.id);
        const published = await stored(event.id);
        for (const status of ['PROCESSING', 'FAILED', 'PENDING']) {
          await legacy.query(
            `UPDATE outbox_events SET status = $2::"OutboxStatus",
          retry_count = retry_count + 1, last_error = 'legacy stale write', updated_at = now()
          WHERE id = $1`,
            [event.id, status],
          );
          await legacy.query('COMMIT');
          expect(await stored(event.id)).toEqual(published);
          await legacy.query('BEGIN');
        }
      } finally {
        await legacy.query('ROLLBACK');
        legacy.release();
      }
    },
  );
});
