import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageBodyRepository } from './message-body.repository';
import { createHash } from 'node:crypto';

export const MESSAGE_BODY_EVENTS = ['MESSAGE_BODY_WRITE', 'MESSAGE_BODY_PURGE'];

type BodyNode = { target: object; id: string; revision: bigint };

/** Only hydrates rows already selected by an authorized caller. Does not grant visibility. */
@Injectable()
export class MessageBodyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bodies: MessageBodyRepository,
  ) {}

  async hydrate<T>(value: T): Promise<T> {
    const nodes: BodyNode[] = [];
    const seen = new Set<object>();
    const visit = (item: unknown): void => {
      if (!item || typeof item !== 'object' || item instanceof Date || seen.has(item)) return;
      seen.add(item);
      if (
        'id' in item &&
        typeof item.id === 'string' &&
        'body' in item &&
        item.body === null &&
        'bodyArchived' in item &&
        item.bodyArchived === true &&
        'bodyRevision' in item &&
        typeof item.bodyRevision === 'bigint'
      )
        nodes.push({ target: item, id: item.id, revision: item.bodyRevision });
      for (const child of Object.values(item)) visit(child);
    };
    visit(value);
    const unique = new Map<string, bigint>();
    for (const node of nodes) {
      const previous = unique.get(node.id);
      if (previous !== undefined && previous !== node.revision)
        throw new ServiceUnavailableException('Message history changed; retry the request');
      unique.set(node.id, node.revision);
    }
    const found = new Map<string, string>();
    // Bounded parallelism, no unbounded IN across Cassandra partitions.
    const entries = [...unique];
    for (let offset = 0; offset < entries.length; offset += 8) {
      await Promise.all(
        entries.slice(offset, offset + 8).map(async ([id, revision]) => {
          const body = await this.bodies.read(id);
          if (!body || body.revision !== revision)
            throw new ServiceUnavailableException('Message history changed; retry the request');
          found.set(id, body.body);
        }),
      );
    }
    for (const node of nodes) {
      const body = found.get(node.id);
      if (body !== undefined) Object.assign(node.target, { body });
    }
    return value;
  }

  async processOne(id?: string): Promise<boolean> {
    await this.bodies.connect();
    const event = await this.prisma.outboxEvent.findFirst({
      where: {
        ...(id ? { id } : {}),
        eventType: { in: MESSAGE_BODY_EVENTS },
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
          await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '25s'`;
          // Same lock order as writes/cascades: Message first, then its outbox intent.
          const messages = await tx.$queryRaw<
            Array<{
              id: string;
              body: string | null;
              body_revision: bigint;
              body_archived: boolean;
              deletedForAll: boolean;
              deletedAt: Date | null;
            }>
          >`SELECT id, body, body_revision, body_archived, "deletedForAll", "deletedAt"
            FROM "Message" WHERE id = ${event.aggregateId} FOR UPDATE`;
          const events = await tx.$queryRaw<Array<{ payload: unknown; event_type: string }>>`
          SELECT payload, event_type FROM outbox_events WHERE id = ${event.id} FOR UPDATE SKIP LOCKED
        `;
          const intent = events[0];
          if (!intent) return false;
          const payload = intent.payload;
          if (
            !payload ||
            typeof payload !== 'object' ||
            !('revision' in payload) ||
            typeof payload.revision !== 'string' ||
            !/^\d+$/.test(payload.revision)
          )
            throw new Error('Invalid message history intent');
          const revision = BigInt(payload.revision);
          const message = messages[0];
          if (intent.event_type === 'MESSAGE_BODY_PURGE') {
            await this.bodies.purge(event.aggregateId, revision);
          } else if (intent.event_type === 'MESSAGE_BODY_WRITE') {
            if (!message || message.body_revision !== revision) return false;
            if (message.body_archived) {
              const stored = await this.bodies.read(message.id);
              if (!stored || stored.revision !== revision)
                throw new Error('Archived body is missing');
            } else if (message.body !== null && !message.deletedForAll && !message.deletedAt) {
              await this.bodies.write(message.id, revision, message.body);
              const stored = await this.bodies.read(message.id);
              if (!stored || stored.revision !== revision || stored.body !== message.body)
                throw new Error('Message body verification failed');
              await tx.message.update({
                where: { id: message.id },
                data: {
                  body: null,
                  bodyArchived: true,
                  bodyDigest: createHash('sha256').update(message.body).digest('hex'),
                },
              });
            } else {
              await this.bodies.purge(message.id, revision);
            }
          } else throw new Error('Unexpected message history intent');
          await tx.outboxEvent.delete({ where: { id: event.id } });
          return true;
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      // A concurrent edit/delete may already have replaced this event; never mark its new version failed.
      await this.prisma.outboxEvent.updateMany({
        where: { id: event.id, updatedAt: event.updatedAt },
        data: {
          status: 'FAILED',
          retryCount: { increment: 1 },
          lastError: 'Message history unavailable',
        },
      });
      throw error;
    }
  }

  /** Stop submissions and the archive worker before rollback. Capture must remain enabled. */
  async restoreOne(id: string): Promise<void> {
    await this.bodies.connect();
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL idle_in_transaction_session_timeout = '25s'`;
        const rows = await tx.$queryRaw<
          Array<{ body_revision: bigint; body_archived: boolean; body_digest: string | null }>
        >`
        SELECT body_revision, body_archived, body_digest FROM "Message" WHERE id = ${id} FOR UPDATE
      `;
        const row = rows[0];
        if (!row?.body_archived) return;
        const stored = await this.bodies.read(id);
        if (
          !stored ||
          stored.revision !== row.body_revision ||
          createHash('sha256').update(stored.body).digest('hex') !== row.body_digest
        )
          throw new Error('Cannot restore an unverified message body');
        await tx.message.update({
          where: { id },
          data: { body: stored.body, bodyArchived: false },
        });
        // Delete only the old archive revision: the restored row has a NEW revision and can be archived again.
        await tx.outboxEvent.update({
          where: { id: `message-body:${id}` },
          data: {
            eventType: 'MESSAGE_BODY_PURGE',
            payload: { revision: row.body_revision.toString() },
          },
        });
      },
      { timeout: 20_000 },
    );
    await this.processOne(`message-body:${id}`);
  }
}
