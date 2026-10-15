import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../apps/backend/node_modules/@prisma/client';
import type { PrismaService } from '../apps/backend/src/common/prisma/prisma.service';
import { MessagesRepository } from '../apps/backend/src/messenger/repositories/messages.repository';
import { MessagesService } from '../apps/backend/src/messenger/messages/messages.service';
import { AutoDeleteService } from '../apps/backend/src/messenger/auto-delete/auto-delete.service';
import type { IConversationsRepository } from '../apps/backend/src/messenger/interfaces/conversations-repository.interface';
import type { MessengerMapper } from '../apps/backend/src/messenger/messenger.mapper';
import type { MessengerGateway } from '../apps/backend/src/messenger/gateway/messenger.gateway';
import type { ConfigService } from '../apps/backend/node_modules/@nestjs/config';
import type { S3Client } from '../apps/backend/node_modules/@aws-sdk/client-s3';

const [container, database] = process.argv.slice(2);
if (
  !/^social-unread-projection-test-[a-f0-9]{12}$/.test(container || '') ||
  !/^unread_projection_test_[a-f0-9]{12}$/.test(database || '')
)
  throw new Error('Writes require the dedicated runner-owned container');
function quote(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (value instanceof Date) return quote(value.toISOString());
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}
function bind(query: Prisma.Sql): string {
  return query.text.replace(/\$(\d+)/g, (_, ordinal: string) =>
    quote(query.values[Number(ordinal) - 1]),
  );
}
const sessions = new Set<Session>();
class Session {
  private child = spawn('docker', [
    'exec',
    '-i',
    container,
    'psql',
    '-X',
    '-qAt',
    '-v',
    'ON_ERROR_STOP=1',
    '-v',
    'VERBOSITY=verbose',
    '-U',
    'postgres',
    '-d',
    database,
  ]);
  private output = '';
  private errors = '';
  private sequence = 0;
  private pending?: {
    marker: string;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  };
  constructor() {
    sessions.add(this);
    this.child.stdout.on('data', (chunk) => {
      this.output += chunk;
      if (this.pending && this.output.includes(this.pending.marker)) {
        const value = this.output.slice(0, this.output.indexOf(this.pending.marker)).trim();
        const pending = this.pending;
        this.pending = undefined;
        this.output = '';
        pending.resolve(value);
      }
    });
    this.child.stderr.on('data', (chunk) => {
      this.errors += chunk;
    });
    this.child.on('error', (error) => this.pending?.reject(error));
    this.child.on('close', (code) => {
      sessions.delete(this);
      if (code !== 0) {
        const error = this.errors.includes('40P01:')
          ? new Prisma.PrismaClientKnownRequestError(this.errors, {
              code: 'P2034',
              clientVersion: 'isolated-postgres-fixture',
            })
          : Object.assign(new Error(this.errors || `psql exited ${code}`), {
              code: 'POSTGRES_ERROR',
            });
        this.pending?.reject(error);
        this.pending = undefined;
      }
    });
  }
  async command(statement: string): Promise<string> {
    assert.equal(this.pending, undefined, 'one command per PostgreSQL session');
    const marker = `UNREAD_QUERY_${++this.sequence}`;
    return new Promise((resolve, reject) => {
      this.pending = { marker, resolve, reject };
      this.child.stdin.write(`${statement};\n\\echo ${marker}\n`);
    });
  }
  async rows(statement: string): Promise<any[]> {
    const split = statement.startsWith('WITH ') ? statement.lastIndexOf(') SELECT') + 1 : 0;
    const prefix = split ? statement.slice(0, split) : '';
    const selected = split ? statement.slice(split) : statement;
    return JSON.parse(
      await this.command(
        `${prefix} SELECT COALESCE(json_agg(row_to_json(result)), '[]'::json) FROM (${selected}) result`,
      ),
    );
  }
  close() {
    if (!this.child.stdin.writableEnded && !this.child.stdin.destroyed)
      this.child.stdin.end('ROLLBACK;\n\\q\n');
  }
}
async function standalone<T>(run: (session: Session) => Promise<T>): Promise<T> {
  const session = new Session();
  try {
    return await run(session);
  } finally {
    session.close();
  }
}
const sql = (statement: string) => standalone((session) => session.command(statement));
const rows = (statement: string) => standalone((session) => session.rows(statement));
function whereMessage(where: any): string {
  const terms: string[] = [];
  if (where.id?.in) terms.push(`id IN (${where.id.in.map(quote).join(',')})`);
  else if (where.id) terms.push(`id=${quote(where.id)}`);
  if (where.conversationId) terms.push(`"conversationId"=${quote(where.conversationId)}`);
  if (where.senderId) terms.push(`"senderId"=${quote(where.senderId)}`);
  if (where.createdAt?.lt) terms.push(`"createdAt"<${quote(where.createdAt.lt)}`);
  if (where.deletedForAll !== undefined)
    terms.push(`"deletedForAll"=${quote(where.deletedForAll)}`);
  if (where.deletedAt === null) terms.push('"deletedAt" IS NULL');
  if (where.deletedFor?.none)
    terms.push(
      `NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId"=m.id AND d."userId"=${quote(where.deletedFor.none.userId)})`,
    );
  return terms.join(' AND ') || 'true';
}
export function bridge(session?: Session, name = ''): PrismaService {
  const run = <T>(fn: (current: Session) => Promise<T>): Promise<T> =>
    session
      ? fn(session)
      : standalone(async (current) => {
          if (name) await current.command(`SET application_name=${quote(name)}`);
          return fn(current);
        });
  return {
    $queryRaw: (query: Prisma.Sql) =>
      run((current) =>
        current.rows(
          process.argv.includes('--without-write-locks') &&
            query.text.includes('ORDER BY id FOR UPDATE')
            ? bind(query).replace('FOR UPDATE', '')
            : bind(query),
        ),
      ),
    $executeRaw: (query: Prisma.Sql) =>
      run(async (current) => {
        await current.command(bind(query));
        return 1;
      }),
    $transaction: async (fn: (tx: PrismaService) => Promise<unknown>) =>
      standalone(async (current) => {
        await current.command(`BEGIN; SET application_name=${quote(name)}`);
        try {
          const result = await fn(bridge(current, name));
          await current.command('COMMIT');
          return result;
        } catch (error) {
          throw error;
        }
      }),
    message: {
      findMany: (args: any) =>
        run((current) =>
          current.rows(
            `SELECT m.*, '[]'::json AS attachments FROM "Message" m WHERE ${whereMessage(args.where)} ORDER BY "createdAt" ASC, id ASC LIMIT ${args.take ?? 1000}`,
          ),
        ),
      findUnique: (args: any) =>
        run(
          async (current) =>
            (
              await current.rows(`SELECT * FROM "Message" m WHERE ${whereMessage(args.where)}`)
            )[0] ?? null,
        ),
      findFirst: (args: any) =>
        run(
          async (current) =>
            (
              await current.rows(
                `SELECT * FROM "Message" m WHERE ${whereMessage(args.where)} ORDER BY "createdAt" DESC, id DESC LIMIT 1`,
              )
            )[0] ?? null,
        ),
      create: (args: any) =>
        run(
          async (current) =>
            (
              await current.rows(
                `WITH inserted AS (INSERT INTO "Message" (id,"conversationId","senderId","messageType") VALUES (${quote(args.data.id ?? randomUUID())},${quote(args.data.conversationId)},${quote(args.data.senderId)},${quote(args.data.messageType ?? 'TEXT')}) RETURNING *) SELECT * FROM inserted`,
              )
            )[0],
        ),
      update: (args: any) =>
        run(async (current) => {
          const changed = (
            await current.rows(
              `WITH changed AS (UPDATE "Message" m SET ${Object.entries(args.data)
                .filter(([key]) => ['deletedForAll', 'deletedAt', 'messageType'].includes(key))
                .map(([key, value]) => `"${key}"=${quote(value)}`)
                .join(',')} WHERE ${whereMessage(args.where)} RETURNING *) SELECT * FROM changed`,
            )
          )[0];
          if (!changed)
            throw Object.assign(new Error('Message was deleted before update'), { code: 'P2025' });
          return changed;
        }),
      updateMany: (args: any) =>
        run(
          async (current) =>
            (
              await current.rows(
                `WITH changed AS (UPDATE "Message" m SET ${Object.entries(args.data)
                  .filter(([key]) => ['deletedForAll', 'deletedAt', 'messageType'].includes(key))
                  .map(([key, value]) => `"${key}"=${quote(value)}`)
                  .join(
                    ',',
                  )} WHERE ${whereMessage(args.where)} RETURNING id) SELECT COUNT(*)::int AS count FROM changed`,
              )
            )[0],
        ),
      deleteMany: (args: any) =>
        run(
          async (current) =>
            (
              await current.rows(
                `WITH removed AS (DELETE FROM "Message" m WHERE ${whereMessage(args.where)} RETURNING id) SELECT COUNT(*)::int AS count FROM removed`,
              )
            )[0],
        ),
    },
    messageDeletion: {
      upsert: (args: any) =>
        run((current) =>
          current.command(
            `INSERT INTO "MessageDeletion" ("messageId","userId") VALUES (${quote(args.create.messageId)},${quote(args.create.userId)}) ON CONFLICT ("messageId","userId") DO UPDATE SET "deletedAt"=clock_timestamp()`,
          ),
        ),
      createMany: (args: any) =>
        run((current) =>
          current.command(
            `INSERT INTO "MessageDeletion" ("messageId","userId") VALUES ${args.data.map((item: any) => `(${quote(item.messageId)},${quote(item.userId)})`).join(',')} ON CONFLICT DO NOTHING`,
          ),
        ),
    },
    conversationParticipant: {
      update: (args: any) =>
        run((current) =>
          current.command(
            `UPDATE "ConversationParticipant" SET "lastReadAt"=${quote(args.data.lastReadAt)} WHERE "conversationId"=${quote(args.where.conversationId_userId.conversationId)} AND "userId"=${quote(args.where.conversationId_userId.userId)}`,
          ),
        ),
    },
  } as unknown as PrismaService;
}
async function waitForLock(name: string): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (
      (
        await rows(
          `SELECT pid FROM pg_stat_activity WHERE application_name=${quote(name)} AND wait_event_type='Lock'`,
        )
      ).length
    )
      return;
    await new Promise((done) => setTimeout(done, 25));
  }
  throw new Error(`Did not observe database lock wait for ${name}`);
}
if (process.argv[1]?.endsWith('unread-projection-write-integration.ts')) {
  const config = {
    get: (_key: string, fallback?: unknown) => fallback,
  } as unknown as ConfigService;
  const emitted: string[] = [];
  const autoDelete = new AutoDeleteService(
    bridge(undefined, 'unread-auto-delete'),
    {
      emitMessageDeleted: (_conversationId: string, id: string) => {
        emitted.push(id);
      },
    } as unknown as MessengerGateway,
    config,
    {} as S3Client,
  );
  const repository = new MessagesRepository(bridge(undefined, 'unread-global-update'));
  const messages = new MessagesService(
    {
      async findParticipant(conversationId: string, userId: string) {
        return (
          await rows(
            `SELECT * FROM "ConversationParticipant" WHERE "conversationId"=${quote(conversationId)} AND "userId"=${quote(userId)}`,
          )
        )[0];
      },
      async findOneForUser(conversationId: string) {
        return {
          id: conversationId,
          type: 'DIRECT',
          participants: await rows(
            `SELECT * FROM "ConversationParticipant" WHERE "conversationId"=${quote(conversationId)}`,
          ),
        };
      },
    } as unknown as IConversationsRepository,
    repository,
    {} as MessengerMapper,
    bridge(),
    config,
  );
  try {
    if (!process.argv.includes('--only-lock-order')) {
      // This catches acknowledgement based only on the app clock: default sends are
      // deliberately advanced beyond a future watermark by the real insert trigger.
      await sql(
        `UPDATE "ConversationParticipant" SET "lastReadAt"=clock_timestamp()+interval '5 seconds', "updatedAt"='2026-01-01' WHERE id='p'; INSERT INTO "Message" (id,"conversationId","senderId") VALUES ('ack-future','c','sender')`,
      );
      assert.equal(await sql('SELECT test_bucket()'), '1');
      await messages.markRead('c', 'reader', 'ack-future');
      assert.equal(
        await sql('SELECT test_bucket()'),
        '0',
        'actual service acknowledges a future timestamp message',
      );
      assert.equal(await sql('SELECT test_badge()=test_oracle()'), 't');
      assert.equal(
        await sql(
          `SELECT "updatedAt">timestamp '2026-01-01' FROM "ConversationParticipant" WHERE id='p'`,
        ),
        't',
        'read acknowledgement preserves membership updatedAt maintenance',
      );
      await repository.create({
        id: 'ack-future-no-target',
        conversationId: 'c',
        senderId: 'sender',
      });
      await messages.markRead('c', 'reader');
      assert.equal(
        await sql('SELECT test_bucket()'),
        '0',
        'no-target acknowledgement covers future latest timestamp',
      );
      const heldSend = new Session();
      await heldSend.command(
        `BEGIN; INSERT INTO "Message" (id,"conversationId","senderId") VALUES ('ack-held-send','c','sender')`,
      );
      const waitingRead = messages.markRead('c', 'reader');
      waitingRead.catch(() => {});
      await waitForLock('unread-global-update');
      await heldSend.command('COMMIT');
      heldSend.close();
      await waitingRead;
      assert.equal(
        await sql('SELECT test_bucket()'),
        '0',
        'actual acknowledgement sees sender committed while membership lock waited',
      );
    }

    await sql(
      `INSERT INTO "ConversationParticipant" (id,"conversationId","userId","joinedAt","lastReadAt") VALUES ('lock-p','lock-c','lock-reader','2026-01-01','2026-01-01'),('lock-s','lock-c','lock-sender','2026-01-01','2026-01-01'); SELECT unread_projection_reconcile('lock-p'); SELECT unread_projection_reconcile('lock-s'); INSERT INTO "Message" (id,"conversationId","senderId","createdAt") VALUES ('lock-m1','lock-c','lock-sender','2026-01-01 00:00:01'),('lock-m2','lock-c','lock-sender','2026-01-01 00:00:02')`,
    );
    // A fixture-only gate pauses the actual DELETE after the first row's unread
    // trigger locked memberships, before the executor can lock the second row.
    // Both waits are observed from PostgreSQL; Docker timing cannot order the race.
    await sql(
      `CREATE FUNCTION test_delete_gate() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.id='lock-m1' THEN PERFORM pg_advisory_xact_lock(819371); END IF; RETURN OLD; END $$; CREATE TRIGGER z_test_delete_gate BEFORE DELETE ON "Message" FOR EACH ROW EXECUTE FUNCTION test_delete_gate()`,
    );
    const gate = new Session();
    await gate.command('BEGIN; SELECT pg_advisory_xact_lock(819371)');
    const purge = (
      autoDelete as unknown as { purgeUserMessages(userId: string, cutoff: Date): Promise<void> }
    ).purgeUserMessages('lock-sender', new Date('2026-01-02'));
    purge.catch(() => {});
    await waitForLock('unread-auto-delete');
    const updating = repository.deleteForAll('lock-m2');
    updating.catch(() => {});
    await waitForLock('unread-global-update');
    // A waiting application update must not own the later Message row. This
    // independent NOWAIT probe catches reversed ordering even if retry would
    // eventually conceal a deadlock from the user-visible result.
    const probe = await rows(`SELECT id FROM "Message" WHERE id='lock-m2' FOR UPDATE NOWAIT`).then(
      (available) => ({ available, error: undefined }),
      (error: Error) => ({ available: [], error }),
    );
    assert.equal(
      probe.available.length,
      1,
      `global update must wait for memberships before taking its message lock: ${probe.error?.message ?? ''}`,
    );
    await gate.command('COMMIT');
    gate.close();
    const outcomes = await Promise.allSettled([purge, updating]);
    assert.equal(
      outcomes[0].status,
      'fulfilled',
      `multi-message auto-delete must not deadlock: ${JSON.stringify(outcomes)}`,
    );
    // The physical deletion wins this ordering. Prisma's normal missing-record
    // result is expected; an aborted transaction/deadlock is not.
    assert.equal(outcomes[1].status, 'rejected');
    assert.equal(
      (outcomes[1] as PromiseRejectedResult).reason.code,
      'P2025',
      `concurrent update must report the deleted record rather than deadlock: ${JSON.stringify(outcomes)}`,
    );
    assert.deepEqual(emitted.sort(), ['lock-m1', 'lock-m2']);
    assert.equal(await sql(`SELECT COUNT(*) FROM "Message" WHERE "conversationId"='lock-c'`), '0');
    assert.equal(
      await sql(
        `SELECT COALESCE(SUM(count),0) FROM "UnreadSenderCount" WHERE "participantId"='lock-p'`,
      ),
      '0',
    );
    await sql('DROP TRIGGER z_test_delete_gate ON "Message"; DROP FUNCTION test_delete_gate()');
    const lockBucket = () =>
      sql(`SELECT COALESCE(SUM(count),0) FROM "UnreadSenderCount" WHERE "participantId"='lock-p'`);
    await repository.create({
      id: 'write-send-one',
      conversationId: 'lock-c',
      senderId: 'lock-sender',
    });
    await repository.create({
      id: 'write-send-two',
      conversationId: 'lock-c',
      senderId: 'lock-sender',
    });
    assert.equal(await lockBucket(), '2', 'actual send entries update buckets once');
    await repository.deleteForMe('write-send-one', 'lock-reader');
    await repository.deleteForMe('write-send-one', 'lock-reader');
    assert.equal(await lockBucket(), '1', 'actual personal deletion remains idempotent');
    await messages.batchDelete('lock-c', 'lock-reader', {
      messageIds: ['write-send-one', 'write-send-two'],
      forAll: true,
    });
    assert.equal(
      await lockBucket(),
      '0',
      'actual batch deletion clears remaining visible messages',
    );
    await repository.create({
      id: 'write-read-send',
      conversationId: 'lock-c',
      senderId: 'lock-sender',
    });
    assert.equal(await lockBucket(), '1');
    await messages.markRead('lock-c', 'lock-reader', 'write-read-send');
    assert.equal(await lockBucket(), '0', 'actual service read clears a committed actual send');
    await repository.create({
      id: 'write-after-read',
      conversationId: 'lock-c',
      senderId: 'lock-sender',
    });
    assert.equal(await lockBucket(), '1', 'actual send after service acknowledgement stays unread');
    // Reject after the real unread trigger applied its delta. The transaction must
    // roll back message data, buckets, personal-deletion state and readiness.
    await sql(
      `CREATE FUNCTION test_reject_message_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='write-after-read' THEN RAISE EXCEPTION 'fixture rejects after unread adjustment'; END IF; RETURN NEW; END $$; CREATE TRIGGER z_test_reject_message_change AFTER UPDATE ON "Message" FOR EACH ROW EXECUTE FUNCTION test_reject_message_change()`,
    );
    await assert.rejects(
      repository.deleteForAll('write-after-read'),
      /fixture rejects after unread adjustment/,
    );
    assert.equal(await lockBucket(), '1', 'failed actual write rolls back bucket adjustment');
    assert.equal(
      await sql(`SELECT "deletedForAll" FROM "Message" WHERE id='write-after-read'`),
      'f',
    );
    assert.equal(
      await sql(`SELECT "unreadProjectionReady" FROM "ConversationParticipant" WHERE id='lock-p'`),
      't',
    );
    assert.equal(
      await sql(
        `SELECT COALESCE(SUM(count),0) FROM "UnreadSenderCount" WHERE "participantId"='lock-p'`,
      ),
      await sql(
        `SELECT COUNT(*) FROM "Message" m JOIN "ConversationParticipant" p ON p."conversationId"=m."conversationId" WHERE p.id='lock-p' AND m."senderId"<>p."userId" AND m."createdAt">p."lastReadAt" AND m."createdAt">=p."joinedAt" AND m."deletedAt" IS NULL AND NOT m."deletedForAll" AND NOT EXISTS (SELECT 1 FROM "MessageDeletion" d WHERE d."messageId"=m.id AND d."userId"=p."userId")`,
      ),
      'actual operations agree with independent raw oracle',
    );
    await sql(
      'DROP TRIGGER z_test_reject_message_change ON "Message"; DROP FUNCTION test_reject_message_change()',
    );
    await repository.create({
      id: 'write-retry',
      conversationId: 'lock-c',
      senderId: 'lock-sender',
    });
    assert.equal(await lockBucket(), '2');
    // PostgreSQL sequences are intentionally not rolled back. A first-attempt
    // SQLSTATE40P01 lets the real transaction retry path prove that its earlier
    // unread adjustment rolls back and is applied only once by the successful tx.
    await sql(
      `CREATE SEQUENCE test_unread_retry_attempt; CREATE FUNCTION test_retry_message_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='write-retry' AND nextval('test_unread_retry_attempt')=1 THEN RAISE EXCEPTION 'fixture retry after unread adjustment' USING ERRCODE='40P01'; END IF; RETURN NEW; END $$; CREATE TRIGGER z_test_retry_message_change AFTER UPDATE ON "Message" FOR EACH ROW EXECUTE FUNCTION test_retry_message_change()`,
    );
    await repository.deleteForAll('write-retry');
    assert.equal(
      await sql('SELECT last_value FROM test_unread_retry_attempt'),
      '2',
      'actual write retries the aborted transaction',
    );
    assert.equal(await lockBucket(), '1', 'retry applies exactly one committed delta');
    console.log(
      'PASS: actual service future acknowledgement, held-send read, multi-message auto-delete/global-update, personal/batch deletion, rollback and transaction retry',
    );
  } finally {
    messages.onModuleDestroy();
    for (const session of sessions) session.close();
  }
}
