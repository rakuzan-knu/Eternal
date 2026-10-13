import { execFile, execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

// Deliberately accepts no application connection string, .env, or existing container.
const run = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const id = randomBytes(6).toString('hex');
const container = `social-unread-projection-test-${id}`;
const database = `unread_projection_test_${id}`;
const image = process.env.UNREAD_TEST_IMAGE || 'postgres:16-alpine';
const directory = mkdtempSync(join(tmpdir(), 'unread-projection-'));
const fixtures = join(root, 'apps/backend/src/messenger/unread/__tests__');
const migration = join(
  root,
  'apps/backend/prisma/migrations/20261011120000_incremental_unread_projection/migration.sql',
);
let created = false;
const heldSessions = new Set();
function docker(...args) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}
async function sql(statement) {
  return (
    await run(
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
    )
  ).stdout.trim();
}
async function holdTransaction(statement) {
  const child = spawn('docker', [
    'exec',
    '-i',
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
  ]);
  heldSessions.add(child);
  let output = '';
  let errors = '';
  child.stderr.on('data', (chunk) => {
    errors += chunk;
  });
  const ready = new Promise((done, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Timed out acquiring fixture transaction lock')),
      30_000,
    );
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('UNREAD_LOCK_HELD')) {
        clearTimeout(timer);
        done();
      }
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (!output.includes('UNREAD_LOCK_HELD')) {
        clearTimeout(timer);
        reject(new Error(`Lock holder exited ${code}: ${errors}`));
      }
    });
  });
  const completed = new Promise((done, reject) => {
    child.on('close', (code) =>
      code === 0 ? done() : reject(new Error(`Lock holder exited ${code}: ${errors}`)),
    );
    child.on('error', reject);
  });
  completed.catch(() => {});
  child.stdin.write(`BEGIN;\n${statement};\n\\echo UNREAD_LOCK_HELD\n`);
  await ready;
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    child.stdin.end('COMMIT;\n\\q\n');
    await completed;
    heldSessions.delete(child);
  };
}
async function waitForLock(name) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (
      (await sql(
        `SELECT COUNT(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name='${name}' AND wait_event_type='Lock'`,
      )) === '1'
    )
      return;
    await new Promise((done) => setTimeout(done, 25));
  }
  throw new Error(`Timed out observing ${name} waiting for its database lock`);
}
async function runBlocked(name, heldStatement, blockedStatement) {
  const release = await holdTransaction(heldStatement);
  const blocked = sql(`SET application_name='${name}'; ${blockedStatement}`);
  try {
    await Promise.race([
      waitForLock(name),
      blocked.then(() => {
        throw new Error(`${name} unexpectedly bypassed the held database lock`);
      }),
    ]);
    await release();
    await blocked;
  } finally {
    await release();
  }
}
try {
  docker('image', 'inspect', image);
  docker(
    'run',
    '--detach',
    '--rm',
    '--name',
    container,
    '--network',
    'none',
    '--memory',
    '1g',
    '--cpus',
    '2',
    '--env',
    'POSTGRES_HOST_AUTH_METHOD=trust',
    '--env',
    `POSTGRES_DB=${database}`,
    image,
  );
  created = true;
  console.log(`Isolated PostgreSQL fixture: ${container}`);
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if (
        !docker('logs', container).includes('PostgreSQL init process complete; ready for start up.')
      )
        throw new Error('PostgreSQL is still using its temporary initialization server');
      docker('exec', container, 'pg_isready', '-U', 'postgres', '-d', database);
      break;
    } catch {
      await new Promise((done) => setTimeout(done, 500));
    }
  }
  const schema = readFileSync(join(fixtures, 'fixtures.sql'), 'utf8');
  // RED baseline provides the proposed columns/buckets but deliberately no increment trigger.
  let implementation = process.argv.includes('--baseline')
    ? `ALTER TABLE "ConversationParticipant" ADD COLUMN "unreadProjectionReady" boolean NOT NULL DEFAULT false;
       CREATE TABLE "UnreadSenderCount" ("participantId" text, "senderId" text, count bigint);
       CREATE FUNCTION unread_projection_reconcile(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;`
    : readFileSync(migration, 'utf8');
  if (process.argv.includes('--without-timestamp-refresh')) {
    const timestampAssignment =
      'NEW."createdAt" := GREATEST(clock_timestamp()::timestamp(3), latest_read + interval \'1 millisecond\');';
    if (!implementation.includes(timestampAssignment))
      throw new Error('Timestamp mutation target missing');
    implementation = implementation.replace(timestampAssignment, 'NULL;');
  }
  // Fixture helper functions resolve tables when created, so install migration before helpers.
  const helperStart = schema.indexOf('CREATE FUNCTION test_assert');
  writeFileSync(
    join(directory, 'test.sql'),
    `\\set ON_ERROR_STOP on\n${schema.slice(0, helperStart)}\n${implementation}\n${schema.slice(helperStart)}\n${readFileSync(join(fixtures, 'projection.sql'), 'utf8')}`,
  );
  docker('cp', join(directory, 'test.sql'), `${container}:/tmp/test.sql`);
  docker(
    'exec',
    container,
    'psql',
    '-X',
    '-qAt',
    '-U',
    'postgres',
    '-d',
    database,
    '-f',
    '/tmp/test.sql',
  );
  if (!process.argv.includes('--baseline')) {
    console.log(
      execFileSync(
        process.execPath,
        [
          '--import',
          pathToFileURL(join(root, 'apps/backend/node_modules/tsx/dist/loader.mjs')).href,
          join(root, 'scripts/unread-projection-integration.ts'),
          container,
          database,
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DATABASE_URL: 'memory://',
            DIRECT_URL: 'memory://',
            TSX_TSCONFIG_PATH: join(root, 'apps/backend/tsconfig.json'),
          },
        },
      ),
    );
    // A held read lock forces send to wait and observe the committed watermark.
    await runBlocked(
      'unread-race-send',
      `UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:09' WHERE id='p'`,
      `INSERT INTO "Message" (id,"conversationId","senderId","createdAt") VALUES ('race-before','c','sender','2026-01-01 00:00:09'), ('race-after','c','sender','2026-01-01 00:00:10');`,
    );
    await sql(
      `SELECT test_assert(test_bucket(),1,'read/send row lock preserves later unread'); SELECT test_assert(test_badge(),test_oracle(),'read/send oracle agreement');`,
    );
    // Reverse lock order: read sees a just-committed insert, then removes it exactly once.
    await runBlocked(
      'unread-race-read',
      `INSERT INTO "Message" (id,"conversationId","senderId","createdAt") VALUES ('race-send-first','c','other','2026-01-01 00:00:11')`,
      `UPDATE "ConversationParticipant" SET "lastReadAt" = '2026-01-01 00:00:11' WHERE id='p';`,
    );
    await sql(
      `SELECT test_assert(test_bucket(),0,'send/read order clears once'); SELECT test_assert(test_badge(),test_oracle(),'send/read oracle agreement');`,
    );
    // Transaction START precedes the read, but Message INSERT follows it. now()
    // alone would backdate the new message and silently swallow its unread badge.
    await sql(
      `UPDATE "ConversationParticipant" SET "joinedAt"='2026-01-01', "lastReadAt"=clock_timestamp() WHERE id='p';`,
    );
    const releaseDelayed = await holdTransaction('SELECT pg_advisory_xact_lock(876123)');
    const delayedSend = sql(
      `SET application_name='unread-delayed-send'; BEGIN; SELECT pg_advisory_xact_lock(876123); INSERT INTO "Message" (id,"conversationId","senderId") VALUES ('delayed-tx','c','sender'); COMMIT;`,
    );
    try {
      await Promise.race([
        waitForLock('unread-delayed-send'),
        delayedSend.then(() => {
          throw new Error('Delayed sender bypassed its transaction gate');
        }),
      ]);
      await sql(
        `UPDATE "ConversationParticipant" SET "lastReadAt"=clock_timestamp() WHERE id='p';`,
      );
      await releaseDelayed();
      await delayedSend;
    } finally {
      await releaseDelayed();
    }
    await sql(
      `SELECT test_assert(test_bucket(),1,'delayed transaction default timestamp follows committed read'); SELECT test_assert(test_badge(),test_oracle(),'delayed send oracle agreement');`,
    );
    await sql(
      `UPDATE "ConversationParticipant" SET "lastReadAt"=clock_timestamp()+interval '5 seconds' WHERE id='p'; INSERT INTO "Message" (id,"conversationId","senderId") VALUES ('clock-skew-send','c','sender'); SELECT test_assert(test_bucket(),1,'later default send follows read watermark even with equal-ms or app clock skew'); SELECT test_assert(test_badge(),test_oracle(),'clock skew oracle agreement');`,
    );
    await sql(
      `INSERT INTO "Message" (id,"conversationId","senderId","createdAt") VALUES ('global-restore-race','c','sender',clock_timestamp()+interval '10 seconds'); UPDATE "Message" SET "deletedForAll"=true WHERE id='global-restore-race';`,
    );
    await runBlocked(
      'unread-personal-delete',
      `UPDATE "Message" SET "deletedForAll"=false WHERE id='global-restore-race'`,
      `INSERT INTO "MessageDeletion" ("messageId","userId") VALUES ('global-restore-race','reader');`,
    );
    await sql(
      `SELECT test_assert(test_bucket(),1,'personal deletion observes a concurrent global restoration after membership lock'); SELECT test_assert(test_badge(),test_oracle(),'personal/global restoration oracle agreement'); BEGIN; INSERT INTO "Message" (id,"conversationId","senderId") VALUES ('rollback-send','c','sender'); ROLLBACK; SELECT test_assert(test_bucket(),1,'rolled back message rolls back counter');`,
    );
    console.log(
      execFileSync(
        process.execPath,
        [
          '--import',
          pathToFileURL(join(root, 'apps/backend/node_modules/tsx/dist/loader.mjs')).href,
          join(root, 'scripts/unread-projection-write-integration.ts'),
          container,
          database,
          ...(process.argv.includes('--only-lock-order') ? ['--only-lock-order'] : []),
          ...(process.argv.includes('--without-write-locks') ? ['--without-write-locks'] : []),
        ],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            NODE_ENV: 'test',
            DATABASE_URL: 'memory://',
            DIRECT_URL: 'memory://',
            TSX_TSCONFIG_PATH: join(root, 'apps/backend/tsconfig.json'),
          },
        },
      ),
    );
    console.log(
      'PASS: actual PostgreSQL triggers, deletion cascades, block directions, watermark and concurrent read/send',
    );
  }
} finally {
  for (const child of heldSessions) child.stdin.end('ROLLBACK;\n\\q\n');
  if (created) docker('rm', '--force', '--volumes', container);
  rmSync(directory, { recursive: true, force: true });
}
