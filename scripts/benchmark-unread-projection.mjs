import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildUnreadOracleQuery,
  buildUnreadTotalQuery,
} from '../apps/backend/src/messenger/unread/unread-projection.queries.ts';

// Run: pnpm --dir apps/backend exec tsx ../../scripts/benchmark-unread-projection.mjs
// No application URL, .env, existing container, volume or published port is accepted.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const token = randomBytes(6).toString('hex');
const container = `social-unread-projection-bench-${token}`;
const database = `unread_bench_${token}`;
const image = 'postgres:16-alpine';
const temporary = mkdtempSync(join(tmpdir(), 'social-unread-bench-'));
const output = join(root, 'docs/performance/artifacts/data-window-2026-10-11/unread');
const userId = '10000000-0000-0000-0000-000000000001';
const run = promisify(execFile);
let created = false;
const docker = (...args) =>
  execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).trim();
const sql = (statement) =>
  docker(
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
  );
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const boundSql = (query) =>
  query.text.replace(/\$(\d+)/g, (_, index) => literal(query.values[Number(index) - 1]));
const oracle = boundSql(buildUnreadOracleQuery(userId));
const projection = boundSql(buildUnreadTotalQuery(userId, { useProjection: true }));
const querySource = readFileSync(
  join(root, 'apps/backend/src/messenger/unread/unread-projection.queries.ts'),
);
function install(name, content) {
  writeFileSync(join(temporary, name), content);
  docker('cp', join(temporary, name), `${container}:/tmp/${name}`);
  return `/tmp/${name}`;
}
function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}
async function measure(stage, readSql, writeOnly = false) {
  const read = install(`${stage}-read.sql`, `${readSql};\n`);
  const prelock = stage.startsWith('projection')
    ? `SELECT id FROM "ConversationParticipant" WHERE "conversationId"=md5('conversation-' || :dialog)::uuid::text ORDER BY id FOR UPDATE;\n`
    : '';
  const write = install(
    `${stage}-write.sql`,
    `\\set dialog random(1,1000)\nBEGIN;\n${prelock}INSERT INTO "Message" (id,"conversationId","senderId",body,"createdAt") VALUES (md5(random()::text || clock_timestamp()::text)::uuid::text, md5('conversation-' || :dialog)::uuid::text, md5('sender-3')::uuid::text,repeat('benchmark text. ',10),clock_timestamp());\nINSERT INTO benchmark_outbox (id,payload) VALUES (md5(random()::text),'{"event":"message.sent"}');\nCOMMIT;\n`,
  );
  // Equal total operations and client concurrency; reads and writes are interleaved.
  const scripts = writeOnly ? ['-f', write] : ['-f', `${read}@9`, '-f', `${write}@1`];
  const { stdout, stderr } = await run(
    'docker',
    [
      'exec',
      '-w',
      '/tmp',
      container,
      'pgbench',
      '-n',
      '-U',
      'postgres',
      '-c',
      '4',
      '-j',
      '2',
      '-t',
      '100',
      ...scripts,
      '-l',
      '--log-prefix',
      `/tmp/${stage}`,
      '--max-tries',
      '3',
      database,
    ],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
  );
  writeFileSync(join(output, `${stage}-pgbench.txt`), stdout + stderr);
  const listing = docker(
    'exec',
    container,
    'find',
    '/tmp',
    '-maxdepth',
    '1',
    '-name',
    `${stage}.*`,
  );
  const samples = { read: [], write: [] };
  for (const file of listing.split('\n').filter(Boolean)) {
    const log = docker('exec', container, 'cat', file);
    writeFileSync(join(output, file.split('/').pop()), log);
    for (const line of log.split('\n')) {
      const fields = line.trim().split(/\s+/);
      if (fields.length < 6 || !/^\d+$/.test(fields[2])) continue;
      samples[writeOnly || fields[3] !== '0' ? 'write' : 'read'].push(Number(fields[2]) / 1000);
    }
  }
  return Object.fromEntries(
    Object.entries(samples)
      .filter(([, values]) => values.length)
      .map(([kind, values]) => [
        kind,
        {
          samples: values.length,
          p50Ms: percentile(values, 0.5),
          p95Ms: percentile(values, 0.95),
          p99Ms: percentile(values, 0.99),
          meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
        },
      ]),
  );
}
async function benchmark() {
  try {
    const imageId = docker('image', 'inspect', image, '--format', '{{.Id}}');
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
      '--shm-size',
      '256m',
      '--env',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      '--env',
      `POSTGRES_DB=${database}`,
      image,
    );
    created = true;
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if (
          !docker('logs', container).includes(
            'PostgreSQL init process complete; ready for start up.',
          )
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
    // Reuse the existing deterministic million-row fixture and its production indexes.
    const legacyFixture = readFileSync(join(root, 'scripts/benchmark-unread.sql'), 'utf8');
    const prefix = legacyFixture.slice(0, legacyFixture.indexOf('CREATE TABLE benchmark_results'));
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
      install('fixture.sql', prefix),
    );
    sql(
      `ALTER DATABASE ${database} SET search_path TO unread_benchmark,pg_catalog; CREATE TABLE unread_benchmark.benchmark_outbox(id text PRIMARY KEY,payload jsonb NOT NULL);`,
    );
    const before = Number(sql(oracle));
    console.log(
      `Loaded million messages; backlog oracle=${before}; measuring aggregate mixed workload`,
    );
    const plansOnly = process.argv.includes('--plans-only');
    const aggregate = plansOnly ? undefined : await measure('aggregate', oracle);
    const aggregateWriteOnly = plansOnly
      ? undefined
      : await measure('aggregate-write-only', oracle, true);
    const migrationPath = join(
      root,
      'apps/backend/prisma/migrations/20261011120000_incremental_unread_projection/migration.sql',
    );
    const migration = readFileSync(migrationPath, 'utf8');
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
      install('projection-migration.sql', migration),
    );
    sql(
      `SELECT unread_projection_reconcile(id) FROM "ConversationParticipant" WHERE "userId"=${literal(userId)}; ANALYZE "UnreadSenderCount";`,
    );
    const authoritative = Number(sql(oracle));
    const actual = Number(sql(`SELECT count FROM (${projection}) q`));
    if (authoritative !== actual)
      throw new Error(`Projection mismatch after backfill: ${actual} != ${authoritative}`);
    writeFileSync(
      join(output, 'aggregate-plan.json'),
      sql(`EXPLAIN (ANALYZE,BUFFERS,SETTINGS,FORMAT JSON) ${oracle}`),
    );
    writeFileSync(
      join(output, 'projection-plan.json'),
      sql(`EXPLAIN (ANALYZE,BUFFERS,SETTINGS,FORMAT JSON) ${projection}`),
    );
    if (plansOnly) {
      const plan = JSON.parse(readFileSync(join(output, 'projection-plan.json'), 'utf8'))[0];
      const result = {
        oracle: authoritative,
        projection: actual,
        executionMs: plan['Execution Time'],
        totalCost: plan.Plan['Total Cost'],
        jit: plan.JIT,
      };
      writeFileSync(join(output, 'plan-probe.json'), JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    console.log('Projection agrees with oracle; measuring projection mixed workload');
    const projected = await measure('projection', projection);
    const projectedWriteOnly = await measure('projection-write-only', projection, true);
    const finalOracle = Number(sql(oracle));
    const finalProjection = Number(sql(`SELECT count FROM (${projection}) q`));
    if (finalOracle !== finalProjection)
      throw new Error(
        `Projection mismatch after concurrent writes: ${finalProjection} != ${finalOracle}`,
      );
    // A corruption/recovery cycle verifies that reconciliation uses authoritative data.
    sql(
      `UPDATE "UnreadSenderCount" SET count=count+10 WHERE "participantId" IN (SELECT id FROM "ConversationParticipant" WHERE "userId"=${literal(userId)} ORDER BY id LIMIT 1); SELECT unread_projection_reconcile(id) FROM "ConversationParticipant" WHERE "userId"=${literal(userId)} ORDER BY id LIMIT 1;`,
    );
    if (Number(sql(`SELECT count FROM (${projection}) q`)) !== Number(sql(oracle)))
      throw new Error('Recovery failed');
    const result = {
      imageId,
      database,
      container,
      network: 'none',
      publishedPorts: [],
      memoryLimitBytes: 2 * 1024 ** 3,
      cpus: 2,
      fixtureSha256: createHash('sha256').update(prefix).digest('hex'),
      migrationSha256: createHash('sha256').update(migration).digest('hex'),
      queriesSha256: createHash('sha256').update(querySource).digest('hex'),
      oracleSqlSha256: createHash('sha256').update(oracle).digest('hex'),
      projectionSqlSha256: createHash('sha256').update(projection).digest('hex'),
      messages: Number(sql('SELECT count(*) FROM "Message"')),
      memberships: Number(sql('SELECT count(*) FROM "ConversationParticipant"')),
      readyMemberships: Number(
        sql('SELECT count(*) FROM "ConversationParticipant" WHERE "unreadProjectionReady"'),
      ),
      oracle: finalOracle,
      projection: finalProjection,
      recovery: true,
      aggregate,
      projected,
      aggregateWriteOnly,
      projectedWriteOnly,
      note: 'Four concurrent clients, mixed 9:1 reads/writes, 400 transactions per stage. Write samples are diagnostic (smaller than read sample count). No claim of lower standalone write cost; trigger write amplification is reported.',
    };
    writeFileSync(join(output, 'result.json'), JSON.stringify(result, null, 2));
    writeFileSync(
      join(output, 'measured-queries.sql'),
      `-- aggregate\n${oracle};\n-- projection\n${projection};\n`,
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    if (created) docker('rm', '--force', '--volumes', container);
    // Only the mkdtemp directory created by this script is removed.
    rmSync(temporary, { recursive: true, force: true });
  }
}
await benchmark();
