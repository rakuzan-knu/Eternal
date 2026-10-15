import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import type { Prisma } from '../apps/backend/node_modules/@prisma/client';
import type { PrismaService } from '../apps/backend/src/common/prisma/prisma.service';
import { UnreadProjectionService } from '../apps/backend/src/messenger/unread/unread-projection.service';
import { MessagesService } from '../apps/backend/src/messenger/messages/messages.service';
import { MessagesRepository } from '../apps/backend/src/messenger/repositories/messages.repository';
import type { IConversationsRepository } from '../apps/backend/src/messenger/interfaces/conversations-repository.interface';
import type { MessengerMapper } from '../apps/backend/src/messenger/messenger.mapper';
import type { ConfigService } from '../apps/backend/node_modules/@nestjs/config';
import { bridge as writeBridge } from './unread-projection-write-integration';

// This bridge only targets the runner-owned, no-network container. No URL/.env.
const [container, database] = process.argv.slice(2);
if (
  !/^social-unread-projection-test-[a-f0-9]{12}$/.test(container || '') ||
  !/^unread_projection_test_[a-f0-9]{12}$/.test(database || '')
) {
  throw new Error('Integration requires a dedicated runner-owned test container');
}
function bind(query: Prisma.Sql): string {
  return query.text.replace(/\$(\d+)/g, (_match, ordinal: string) => {
    const value: unknown = query.values[Number(ordinal) - 1];
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    throw new Error('Unexpected fixture binding type');
  });
}
function sql(statement: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      container,
      'psql',
      '-X',
      '-qAt',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      database,
      '-c',
      statement,
    ],
    { encoding: 'utf8' },
  ).trim();
}
function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
function firstRow(statement: string): unknown {
  return (
    (
      JSON.parse(
        sql(
          `SELECT COALESCE(json_agg(row_to_json(result)), '[]'::json) FROM (${statement}) result`,
        ),
      ) as unknown[]
    )[0] ?? null
  );
}
const databaseBridge = {
  async $queryRaw(query: Prisma.Sql) {
    return JSON.parse(
      sql(
        `SELECT COALESCE(json_agg(row_to_json(result)), '[]'::json) FROM (${bind(query)}) result;`,
      ),
    ) as unknown;
  },
  async $executeRaw(query: Prisma.Sql) {
    sql(bind(query));
    return 1;
  },
  message: {
    async findUnique(args: { where: { id: string } }) {
      return firstRow(
        `SELECT id,"conversationId","senderId" FROM "Message" WHERE id=${quote(args.where.id)}`,
      );
    },
    async findFirst(args: { where: { conversationId: string } }) {
      return firstRow(
        `SELECT id,"conversationId","senderId" FROM "Message" WHERE "conversationId"=${quote(args.where.conversationId)} ORDER BY "createdAt" DESC LIMIT 1`,
      );
    },
  },
  conversationParticipant: {
    async update(args: {
      where: { conversationId_userId: { conversationId: string; userId: string } };
      data: { lastReadAt: Date };
    }) {
      const key = args.where.conversationId_userId;
      sql(
        `UPDATE "ConversationParticipant" SET "lastReadAt"=${quote(args.data.lastReadAt.toISOString())}::timestamp WHERE "conversationId"=${quote(key.conversationId)} AND "userId"=${quote(key.userId)}`,
      );
    },
  },
};
const projection = new UnreadProjectionService(databaseBridge as unknown as PrismaService);
process.env.UNREAD_PROJECTION_MODE = 'off';
assert.equal(await projection.canUseProjection(), false);
assert.deepEqual(await projection.getUnreadCount('reader'), { count: 1 });
assert.deepEqual([...(await projection.getConversationCounts('reader', ['c']))], [['c', 1]]);
assert.deepEqual(await projection.getUnreadCount('stranger'), { count: 0 });
sql(`ALTER TABLE "UnreadSenderCount" RENAME TO "UnreadSenderCount_missing";`);
process.env.UNREAD_PROJECTION_MODE = 'on';
const beforeMigration = new UnreadProjectionService(databaseBridge as unknown as PrismaService);
assert.equal(await beforeMigration.canUseProjection(), false);
assert.deepEqual(
  await beforeMigration.getUnreadCount('reader'),
  { count: 1 },
  'opt-in before migration safely falls back',
);
sql(`ALTER TABLE "UnreadSenderCount_missing" RENAME TO "UnreadSenderCount";`);
await beforeMigration.resetRead('c', 'reader');
assert.deepEqual(
  await beforeMigration.getUnreadCount('reader'),
  { count: 4 },
  'mark unread refreshes a negative capability cache after migration',
);
sql(`UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:07' WHERE id='p';`);
process.env.UNREAD_PROJECTION_MODE = 'on';
assert.equal(await projection.canUseProjection(), true);
assert.deepEqual(await projection.getUnreadCount('reader'), { count: 1 });
assert.deepEqual([...(await projection.getConversationCounts('reader', ['c']))], [['c', 1]]);
sql(
  `UPDATE "ConversationParticipant" SET "unreadProjectionReady" = false WHERE id = 'p'; UPDATE "UnreadSenderCount" SET count = 999 WHERE "participantId" = 'p';`,
);
assert.deepEqual(
  await projection.getUnreadCount('reader'),
  { count: 1 },
  'unready membership uses oracle despite stale buckets',
);
sql(
  `SELECT unread_projection_reconcile('p'); UPDATE "UnreadSenderCount" SET count = 999 WHERE "participantId" = 'p';`,
);
process.env.UNREAD_PROJECTION_MODE = 'shadow';
assert.equal(await projection.canFilterUsingProjection(), false);
assert.deepEqual(
  await projection.getUnreadCount('reader'),
  { count: 1 },
  'shadow always returns oracle',
);
assert.equal(
  sql(`SELECT "unreadProjectionReady" FROM "ConversationParticipant" WHERE id='p'`),
  'f',
  'shadow drift disables member',
);
sql(`SELECT unread_projection_reconcile('p');`);
process.env.UNREAD_PROJECTION_MODE = 'on';
sql(`UPDATE "ConversationParticipant" SET "archivedAt" = now() WHERE id='p';`);
assert.deepEqual(await projection.getUnreadCount('reader'), { count: 0 });
assert.deepEqual(
  [...(await projection.getConversationCounts('reader', ['c']))],
  [['c', 1]],
  'archived page still shows its own unread',
);
sql(`UPDATE "ConversationParticipant" SET "archivedAt" = NULL WHERE id='p';`);
await projection.resetRead('c', 'reader');
assert.deepEqual(
  await projection.getUnreadCount('reader'),
  { count: 4 },
  'explicit reset works when migrated',
);
sql(`UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:07' WHERE id='p';`);
process.env.UNREAD_PROJECTION_MODE = 'off';
await projection.resetRead('c', 'reader');
assert.deepEqual(
  await projection.getUnreadCount('reader'),
  { count: 4 },
  'off still uses reset function after migration',
);
sql(`UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:07' WHERE id='p';`);
const messages = new MessagesService(
  {
    async findParticipant(conversationId: string, userId: string) {
      return firstRow(
        `SELECT * FROM "ConversationParticipant" WHERE "conversationId"=${quote(conversationId)} AND "userId"=${quote(userId)}`,
      );
    },
  } as unknown as IConversationsRepository,
  new MessagesRepository(writeBridge()),
  {} as MessengerMapper,
  databaseBridge as unknown as PrismaService,
  { get: () => undefined } as unknown as ConfigService,
);
try {
  sql(
    `INSERT INTO "Message" (id,"conversationId","senderId","createdAt") VALUES ('ack-own-last','c','reader','2026-01-01 00:00:09'), ('ack-foreign','foreign','sender','2026-01-01 00:00:10');`,
  );
  assert.deepEqual(await projection.getUnreadCount('reader'), { count: 1 });
  assert.equal(
    await messages.markRead('c', 'reader'),
    false,
    'own latest receipt remains suppressed',
  );
  assert.deepEqual(
    await projection.getUnreadCount('reader'),
    { count: 0 },
    'own latest still acknowledges actual PostgreSQL incoming backlog',
  );
  sql(`SELECT unread_projection_reset_read('p', timestamp '2026-01-01 00:00:07');`);
  assert.equal(await messages.markRead('c', 'reader', 'ack-own-last'), false);
  assert.deepEqual(
    await projection.getUnreadCount('reader'),
    { count: 0 },
    'own explicit target still acknowledges backlog',
  );
  const beforeForeign = sql(`SELECT "lastReadAt" FROM "ConversationParticipant" WHERE id='p'`);
  await assert.rejects(
    messages.markRead('c', 'reader', 'ack-foreign'),
    /Message not found in this conversation/,
  );
  assert.equal(
    sql(`SELECT "lastReadAt" FROM "ConversationParticipant" WHERE id='p'`),
    beforeForeign,
    'foreign target cannot move real watermark',
  );
  sql(`SELECT unread_projection_reset_read('p', timestamp '2026-01-01 00:00:07');`);
} finally {
  messages.onModuleDestroy();
}
console.log(
  'PASS: actual production query builders/service modes, page scope, fallback, shadow drift and explicit reset',
);
