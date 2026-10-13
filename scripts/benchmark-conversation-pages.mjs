import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConversationPageQuery } from '../apps/backend/src/messenger/conversations/conversation-page.query.ts';

// Isolated schema/real production activity migration. Never reads an app DB URL.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = randomBytes(6).toString('hex');
const container = `social-conversation-page-bench-${id}`;
const database = `conversation_bench_${id}`;
const temporary = mkdtempSync(join(tmpdir(), 'social-conversations-'));
const output = join(root, 'docs/performance/artifacts/data-window-2026-10-11/conversations');
const run = promisify(execFile);
let created = false;
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const command = (statement) => [
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
];
const sql = (statement) => docker(...command(statement));
const literal = (value) =>
  `'${(value instanceof Date ? value.toISOString() : String(value)).replaceAll("'", "''")}'`;
function pageSql(snapshot, extras = {}) {
  const options = {
    cutoff: snapshot,
    limit: 25,
    search: '',
    archive: 'active',
    filter: 'ALL',
    includeIds: [],
    excludeIds: [],
    forcedUnreadIds: [],
    locallyReadIds: [],
    ...extras,
  };
  const query = buildConversationPageQuery('viewer', options);
  return query.text.replace(/\$(\d+)/g, (_, index) => literal(query.values[Number(index) - 1]));
}
const rows = (query) =>
  JSON.parse(sql(`SELECT COALESCE(json_agg(q),'[]'::json) FROM (${query}) q`));
const snapshot = () =>
  sql(
    `BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('conversation-page:viewer',0)); SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'); COMMIT;`,
  )
    .split('\n')
    .filter(Boolean)
    .pop();
function load(first, last) {
  sql(`INSERT INTO "Conversation" SELECT 'c-'||lpad(i::text,6,'0'),CASE WHEN i%2=0 THEN 'GROUP'::"ConversationType" ELSE 'DIRECT'::"ConversationType" END,'Historic group '||i,timestamp '2026-01-01'+i*interval '1 second' FROM generate_series(${first},${last}) i;
    INSERT INTO "ConversationParticipant" SELECT 'p-'||lpad(i::text,6,'0'),'c-'||lpad(i::text,6,'0'),'viewer',NULL,NULL,NULL,timestamp '2026-01-01',timestamp '2026-01-01' FROM generate_series(${first},${last}) i;`);
}
try {
  docker('image', 'inspect', 'postgres:16-alpine');
  mkdirSync(output, { recursive: true });
  docker(
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--network',
    'none',
    '--memory',
    '2g',
    '--cpus',
    '2',
    '--env',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '--env',
    `POSTGRES_DB=${database}`,
    'postgres:16-alpine',
  );
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if (
        !docker('logs', container).includes('PostgreSQL init process complete; ready for start up.')
      )
        throw new Error('Initializing');
      docker('exec', container, 'pg_isready', '-U', 'postgres', '-d', database);
      ready = true;
      break;
    } catch {
      await new Promise((done) => setTimeout(done, 500));
    }
  }
  if (!ready) throw new Error('Final PostgreSQL server did not become ready');
  sql(`CREATE TYPE "ConversationType" AS ENUM('DIRECT','GROUP');
    CREATE TABLE "User"(id text PRIMARY KEY,username text,"displayName" text);
    INSERT INTO "User" VALUES('viewer','viewer','Viewer');
    CREATE TABLE "Conversation"(id text PRIMARY KEY,type "ConversationType",name text,"updatedAt" timestamp(3));
    CREATE TABLE "ConversationParticipant"(id text PRIMARY KEY,"conversationId" text,"userId" text,nickname text,"leftAt" timestamp(3),"archivedAt" timestamp(3),"joinedAt" timestamp(3),"lastReadAt" timestamp(3), UNIQUE("conversationId","userId"));
    CREATE INDEX ON "ConversationParticipant"("userId"); CREATE INDEX ON "ConversationParticipant"("conversationId");
    CREATE TABLE "Message"(id text PRIMARY KEY,"conversationId" text,"senderId" text,"createdAt" timestamp(3),"deletedAt" timestamp(3),"deletedForAll" boolean);
    CREATE INDEX ON "Message"("conversationId","createdAt");
    CREATE TABLE "MessageDeletion"("messageId" text,"userId" text,PRIMARY KEY("messageId","userId"));
    CREATE TABLE "UserBlock"("blockerId" text,"blockedId" text,PRIMARY KEY("blockerId","blockedId"));`);
  load(1, 1000);
  const migration = readFileSync(
    join(
      root,
      'apps/backend/prisma/migrations/20261011070000_conversation_activity_versions/migration.sql',
    ),
    'utf8',
  );
  writeFileSync(join(temporary, 'migration.sql'), migration);
  docker('cp', join(temporary, 'migration.sql'), `${container}:/tmp/migration.sql`);
  docker(
    'exec',
    container,
    'psql',
    '-X',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'postgres',
    '-d',
    database,
    '-f',
    '/tmp/migration.sql',
  );
  const results = [];
  for (const total of [1000, 10000, 100000]) {
    if (total > 1000) load(total === 10000 ? 1001 : 10001, total);
    for (const table of ['ConversationActivityVersion', 'ConversationParticipant', 'Conversation'])
      sql(`VACUUM (ANALYZE) "${table}"`);
    const fence = snapshot();
    for (const [name, extras] of [
      ['all', {}],
      ['groups', { filter: 'GROUPS' }],
      ['old-search', { search: 'Historic group 2' }],
      ['custom-old', { filter: 'CUSTOM', includeIds: ['c-000002'] }],
    ]) {
      const query = pageSql(fence, extras);
      const plans = Array.from(
        { length: 5 },
        () => JSON.parse(sql(`EXPLAIN (ANALYZE,BUFFERS,SETTINGS,FORMAT JSON) ${query}`))[0],
      );
      const data = rows(query);
      if (data.length > 26) throw new Error('Page exceeded limit+1');
      if (name === 'custom-old' && data[0]?.id !== 'c-000002')
        throw new Error('Old custom chat unreachable');
      results.push({
        total,
        name,
        rows: data.length,
        selectorPayloadBytes: Buffer.byteLength(JSON.stringify(data)),
        executionMs: plans.map((plan) => plan['Execution Time']),
      });
      writeFileSync(join(output, `${total}-${name}.json`), JSON.stringify(plans, null, 2));
    }
    console.log(`Measured ${total} dialogs`);
  }
  // Page-boundary realtime move: a row not yet seen becomes newest after the fence.
  const fence = snapshot();
  const first = rows(pageSql(fence)).slice(0, 25);
  const boundary = first.at(-1);
  const secondBefore = rows(
    pageSql(fence, { before: { id: boundary.id, createdAt: new Date(boundary.createdAt) } }),
  ).slice(0, 25);
  const moved = secondBefore[0].id;
  sql(`UPDATE "Conversation" SET "updatedAt"=clock_timestamp() WHERE id=${literal(moved)};`);
  const secondAfter = rows(
    pageSql(fence, { before: { id: boundary.id, createdAt: new Date(boundary.createdAt) } }),
  ).slice(0, 25);
  if (JSON.stringify(secondBefore) !== JSON.stringify(secondAfter))
    throw new Error('Realtime activity changed snapshot continuation');
  if (rows(pageSql(snapshot()))[0].id !== moved)
    throw new Error('Fresh snapshot did not promote old active chat');
  // A held update must commit before the snapshot is fenced; user-scoped shared locks prove it.
  const update = run(
    'docker',
    command(
      `SET application_name='conversation-held-update'; BEGIN; UPDATE "Conversation" SET "updatedAt"=clock_timestamp() WHERE id='c-000002'; SELECT pg_sleep(20); COMMIT;`,
    ),
    { encoding: 'utf8' },
  );
  let held = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    if (
      Number(
        sql(
          "SELECT count(*) FROM pg_stat_activity WHERE application_name='conversation-held-update' AND wait_event='PgSleep'",
        ),
      ) === 1
    ) {
      held = true;
      break;
    }
    await new Promise((done) => setTimeout(done, 100));
  }
  if (!held)
    throw new Error('Could not observe the held update lock; concurrency proof unavailable');
  const fenced = snapshot();
  await update;
  if (rows(pageSql(fenced))[0].id !== 'c-000002')
    throw new Error('Late commit crossed snapshot fence');
  const result = {
    network: 'none',
    database,
    limits: { page: 25, selected: 26 },
    results,
    realtimeMove: true,
    freshOrder: true,
    lateCommitFence: true,
    migrationSha256: createHash('sha256').update(migration).digest('hex'),
    note: 'Selector payload only; controller DTO hydration has separate 50-row/64-participant bounds. Five repetitions per selector are diagnostic, not p99. Short substring search can be less selective than the measured indexed search.',
  };
  writeFileSync(join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (created) docker('rm', '--force', '--volumes', container);
  rmSync(temporary, { recursive: true, force: true });
}
