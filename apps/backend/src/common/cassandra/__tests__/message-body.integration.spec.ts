import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client, policies, types } from 'cassandra-driver';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageBodyRepository } from '../message-body.repository';
import { MessageBodyService } from '../message-body.service';
import { OutboxRepository } from '../../outbox/repositories/outbox.repository';
import { Test } from '@nestjs/testing';
import { PublicSearchSyncService } from '../../public-search/public-search-sync.service';
import { PublicSearchService } from '../../public-search/public-search.service';
import { messageBodyOmit } from '../../../messenger/interfaces/types';

class LoopbackTranslator extends policies.addressResolution.EC2MultiRegionTranslator {
  override translate(_address: string, _port: number, callback: (endpoint: string) => void): void {
    callback('127.0.0.1:59042');
  }
}

// Opt-in local databases only; never load connection addresses from application .env for these tests.
describe.skipIf(process.env.MESSAGE_ARCHIVE_INTEGRATION !== 'true')(
  'message archive: PostgreSQL + Cassandra',
  () => {
    let prisma: PrismaService;
    let bodies: MessageBodyRepository;
    let history: MessageBodyService;
    let userId: string;
    let conversationId: string;
    const messageIds: string[] = [];

    beforeAll(async () => {
      const url = process.env.MESSAGE_ARCHIVE_TEST_DATABASE_URL ?? '';
      const parsed = new URL(url);
      if (
        parsed.hostname !== '127.0.0.1' ||
        parsed.port !== '55439' ||
        parsed.pathname !== '/migration_check'
      )
        throw new Error('Integration tests require the isolated loopback migration_check database');
      vi.stubEnv('DATABASE_URL', url);
      prisma = new PrismaService();
      await prisma.$connect();
      const options = {
        contactPoints: ['127.0.0.1:59042'],
        localDataCenter: 'datacenter1',
        queryOptions: {
          consistency: types.consistencies.localQuorum,
          prepare: true,
          readTimeout: 5000,
        },
        policies: { addressResolution: new LoopbackTranslator() },
      };
      const setup = new Client(options);
      await setup.execute(
        "CREATE KEYSPACE IF NOT EXISTS eternal_migration_check WITH replication = {'class':'SimpleStrategy','replication_factor':1}",
      );
      await setup.shutdown();
      bodies = new MessageBodyRepository(
        new ConfigService(),
        new Client({ ...options, keyspace: 'eternal_migration_check' }),
      );
      await bodies.initialize();
      history = new MessageBodyService(prisma, bodies);
      await prisma.$executeRaw`UPDATE public_search_control SET enabled = false WHERE id`;
      await prisma.outboxEvent.deleteMany({ where: { eventType: 'public_search.user.sync' } });
      await prisma.$executeRaw`UPDATE message_body_archive_config SET capture_enabled = true WHERE id`;
    }, 30_000);

    beforeEach(async () => {
      const suffix = randomUUID();
      const user = await prisma.user.create({
        data: {
          email: `${suffix}@example.invalid`,
          username: `test_${suffix}`,
          passwordHash: 'synthetic-only',
        },
      });
      userId = user.id;
      const conversation = await prisma.conversation.create({
        data: { type: 'DIRECT', participants: { create: { userId } } },
      });
      conversationId = conversation.id;
    });

    afterEach(async () => {
      vi.restoreAllMocks();
      await prisma.$executeRaw`UPDATE public_search_control SET enabled = false WHERE id`;
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.conversation.deleteMany({ where: { id: conversationId } });
      for (const id of messageIds.splice(0)) await history.processOne(`message-body:${id}`);
      await prisma.outboxEvent.deleteMany({
        where: { eventType: 'public_search.user.sync', aggregateId: userId },
      });
    });

    afterAll(async () => {
      if (prisma)
        await prisma.$executeRaw`UPDATE message_body_archive_config SET capture_enabled = false WHERE id`;
      await bodies?.onModuleDestroy();
      await prisma?.onModuleDestroy();
      vi.unstubAllEnvs();
    });

    async function send(body: string) {
      const message = await prisma.message.create({
        data: { conversationId, senderId: userId, body },
      });
      messageIds.push(message.id);
      return message;
    }

    it('copies byte-exact text, clears PG only after verification, and restores nested replies', async () => {
      const text = 'Привіт 👋\nこんにちは — exact bytes';
      const message = await send(text);
      await history.processOne(`message-body:${message.id}`);
      const archived = await prisma.message.findUniqueOrThrow({ where: { id: message.id } });
      expect(archived.body).toBeNull();
      expect(archived.bodyArchived).toBe(true);
      expect(archived.bodySearch).toBe(text);
      expect(archived.bodyDigest).toMatch(/^[0-9a-f]{64}$/);
      expect((await bodies.read(message.id))?.body).toBe(text);
      const result = { messages: [{ ...archived, replyTo: { ...archived } }] };
      await history.hydrate(result);
      expect(result.messages[0].body).toBe(text);
      expect(result.messages[0].replyTo.body).toBe(text);
      const payload = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
        omit: messageBodyOmit,
      });
      expect(payload).not.toHaveProperty('bodySearch');
      expect(payload).not.toHaveProperty('bodyDigest');
      await history.hydrate(payload);
      expect(payload.body).toBe(text);
      await expect(
        history.hydrate([
          { ...archived },
          { ...archived, bodyRevision: archived.bodyRevision - 1n },
        ]),
      ).rejects.toThrow('Message history changed');
      expect(
        await prisma.outboxEvent.findUnique({ where: { id: `message-body:${message.id}` } }),
      ).toBeNull();
    });

    it('never indexes an encrypted envelope in the private plaintext projection', async () => {
      const text = JSON.stringify({ e2ee: true, v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'ciphertext' });
      const message = await send(text);
      expect(message.bodySearch).toBeNull();
      await history.processOne(`message-body:${message.id}`);
      expect((await bodies.read(message.id))?.body).toBe(text);
    });

    it('retains the PG body and durable intent after an ambiguous remote write, then retries', async () => {
      const message = await send('retry me');
      const write = bodies.write.bind(bodies);
      vi.spyOn(bodies, 'write').mockImplementationOnce(async (...args) => {
        await write(...args);
        throw new Error('ambiguous timeout');
      });
      await expect(history.processOne(`message-body:${message.id}`)).rejects.toThrow('ambiguous');
      const retained = await prisma.message.findUniqueOrThrow({ where: { id: message.id } });
      expect(retained.body).toBe('retry me');
      expect(retained.bodyArchived).toBe(false);
      await prisma.outboxEvent.update({
        where: { id: `message-body:${message.id}` },
        data: { updatedAt: new Date(Date.now() - 16 * 60_000) },
      });
      await history.processOne(`message-body:${message.id}`);
      expect(
        (await prisma.message.findUniqueOrThrow({ where: { id: message.id } })).bodyArchived,
      ).toBe(true);
    });

    it('orders edits and cascade deletion ahead of stale write retries', async () => {
      const original = await send('old');
      await history.processOne(`message-body:${original.id}`);
      const edited = await prisma.message.update({
        where: { id: original.id },
        data: { body: 'new' },
      });
      expect(edited.bodyRevision).toBeGreaterThan(original.bodyRevision);
      await history.processOne(`message-body:${original.id}`);
      await bodies.write(original.id, original.bodyRevision, 'late old write');
      expect((await bodies.read(original.id))?.body).toBe('new');
      await prisma.user.delete({ where: { id: userId } });
      await history.processOne(`message-body:${original.id}`);
      await bodies.write(original.id, edited.bodyRevision, 'late deleted write');
      expect(await bodies.read(original.id)).toBeNull();
    });

    it('can archive again after restore without an equal-timestamp tombstone winning', async () => {
      const message = await send('restore and rearchive');
      await history.processOne(`message-body:${message.id}`);
      await history.restoreOne(message.id);
      const restored = await prisma.message.findUniqueOrThrow({ where: { id: message.id } });
      expect(restored.body).toBe('restore and rearchive');
      expect(restored.bodyArchived).toBe(false);
      expect(restored.bodyRevision).toBeGreaterThan(message.bodyRevision);
      await prisma.outboxEvent.create({
        data: {
          id: `message-body:${message.id}`,
          aggregateType: 'MESSAGE_BODY',
          aggregateId: message.id,
          eventType: 'MESSAGE_BODY_WRITE',
          payload: { revision: restored.bodyRevision.toString() },
        },
      });
      await history.processOne(`message-body:${message.id}`);
      expect(
        (await prisma.message.findUniqueOrThrow({ where: { id: message.id } })).bodyArchived,
      ).toBe(true);
      expect((await bodies.read(message.id))?.body).toBe('restore and rearchive');
    });

    it('serializes a deletion that starts while a remote archive write is in flight', async () => {
      const message = await send('concurrent deletion');
      const originalWrite = bodies.write.bind(bodies);
      let announceWrite = () => {};
      let releaseWrite = () => {};
      const started = new Promise<void>((resolve) => {
        announceWrite = resolve;
      });
      const release = new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
      vi.spyOn(bodies, 'write').mockImplementationOnce(async (...args) => {
        await originalWrite(...args);
        announceWrite();
        await release;
      });
      const archive = history.processOne(`message-body:${message.id}`);
      await started;
      const deletion = prisma.message.delete({ where: { id: message.id } });
      // Prisma promises are lazy: start the delete, then prove it is blocked on our row lock.
      const deleting = deletion.then(() => {});
      try {
        await vi.waitFor(async () => {
          const rows = await prisma.$queryRaw<Array<{ blocked: bigint }>>`
          SELECT COUNT(*)::bigint AS blocked FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE 'DELETE%Message%'
        `;
          expect(rows[0].blocked).toBeGreaterThan(0n);
        });
      } finally {
        releaseWrite();
      }
      await archive;
      await deleting;
      await history.processOne(`message-body:${message.id}`);
      await bodies.write(message.id, message.bodyRevision, 'late retry');
      expect(await bodies.read(message.id)).toBeNull();
    });

    it('scrubs a delivered view only after publication and keeps pending work out of generic delivery', async () => {
      const message = await send('pending body');
      const event = await prisma.outboxEvent.create({
        data: {
          aggregateType: 'MESSAGE',
          aggregateId: message.id,
          eventType: 'MESSAGE_SENT',
          payload: { messageId: message.id, messageView: { body: 'pending body' } },
        },
      });
      const outbox = new OutboxRepository(prisma);
      const claimed = await outbox.claimPendingEvents(100, 3);
      expect(claimed.some((item) => item.eventType === 'MESSAGE_BODY_WRITE')).toBe(false);
      await outbox.markAsPublished(event.id);
      const published = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(published.payload).toEqual({ messageId: message.id });
      await prisma.outboxEvent.delete({ where: { id: event.id } });
    });

    it('durably coalesces public identity updates and processes deletion using current PG state', async () => {
      const syncIdentity = vi.fn().mockResolvedValue(undefined);
      const module = await Test.createTestingModule({
        providers: [
          PublicSearchSyncService,
          { provide: ConfigService, useValue: new ConfigService() },
          {
            provide: PrismaService,
            useValue: {
              outboxEvent: prisma.outboxEvent,
              $transaction: prisma.$transaction.bind(prisma),
            },
          },
          { provide: PublicSearchService, useValue: { syncIdentity } },
        ],
      }).compile();
      const sync = module.get(PublicSearchSyncService);
      await prisma.$executeRaw`UPDATE public_search_control SET enabled = true WHERE id`;
      await prisma.user.update({ where: { id: userId }, data: { displayName: 'First' } });
      await prisma.user.update({ where: { id: userId }, data: { displayName: 'Latest' } });
      expect(await prisma.outboxEvent.count({ where: { id: `public-search:${userId}` } })).toBe(1);
      await sync.processOne();
      expect(syncIdentity).toHaveBeenLastCalledWith(
        userId,
        expect.objectContaining({ displayName: 'Latest' }),
      );
      await prisma.user.delete({ where: { id: userId } });
      await sync.processOne();
      expect(syncIdentity).toHaveBeenLastCalledWith(userId, null);
      expect(
        await prisma.outboxEvent.findUnique({ where: { id: `public-search:${userId}` } }),
      ).toBeNull();
      await module.close();
    });
  },
);
