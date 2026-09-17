import { newDb, type IMemoryDb } from 'pg-mem';
import type { Pool } from 'pg';
import { registerInMemoryPoolFactory } from '../src/common/prisma/prisma.service';
import RedisMock from 'ioredis-mock';
import type Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

let sharedMemDb: IMemoryDb | null = null;
let sharedPgPool: Pool | null = null;
let sharedRedisClient: Redis | null = null;

/**
 * Creates or retrieves a singleton in-memory PostgreSQL instance with schema loaded.
 */
export function getInMemoryPgDb(): IMemoryDb {
  if (sharedMemDb) return sharedMemDb;

  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  // Register common PostgreSQL functions
  db.public.registerFunction({
    name: 'gen_random_uuid',
    implementation: () => randomUUID(),
  });

  db.public.registerFunction({
    name: 'uuid_generate_v4',
    implementation: () => randomUUID(),
  });

  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16.0 (pg-mem in-memory)',
  });

  // Load migration DDLs if available
  try {
    const migrationsDir = path.resolve(__dirname, '../prisma/migrations');
    if (fs.existsSync(migrationsDir)) {
      const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
      const migrationFolders = entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();

      for (const folder of migrationFolders) {
        const sqlFile = path.join(migrationsDir, folder, 'migration.sql');
        if (fs.existsSync(sqlFile)) {
          let sql = fs.readFileSync(sqlFile, 'utf8');
          // Strip unsupported PL/pgSQL DO $$ blocks that hang pg-mem parser
          sql = sql.replace(/DO\s+\$\$[\s\S]*?END\s+\$\$;/gi, '');
          try {
            db.public.none(sql);
          } catch {
            const statements = sql
              .split(';')
              .map((s) => s.trim())
              .filter(Boolean);
            for (const stmt of statements) {
              if (/^DO\s+\$\$/i.test(stmt)) continue;
              try {
                db.public.none(stmt);
              } catch {
                // Ignore syntax discrepancies that pg-mem doesn't fully support
              }
            }
          }
        }
      }
    }
  } catch {
    // Fallback if migrations path is not reachable
  }

  sharedMemDb = db;
  return db;
}

/**
 * Returns a `pg.Pool` compatible interface backed by `pg-mem`.
 */
export function createInMemoryPgPool(): Pool {
  if (sharedPgPool && !sharedPgPool.ended && !sharedPgPool.ending) {
    return sharedPgPool;
  }
  const db = getInMemoryPgDb();
  const pgAdapter = db.adapters.createPg() as unknown as { Pool: new () => Pool };
  const pool: Pool = new pgAdapter.Pool();
  sharedPgPool = pool;
  return pool;
}

registerInMemoryPoolFactory(createInMemoryPgPool);

/**
 * Creates or returns an active in-memory Redis client backed by `ioredis-mock`.
 */
export function createInMemoryRedisClient(): Redis {
  if (
    sharedRedisClient &&
    sharedRedisClient.status !== 'end' &&
    sharedRedisClient.status !== 'close'
  ) {
    return sharedRedisClient;
  }
  const client = new RedisMock();
  sharedRedisClient = client;
  return client;
}

/**
 * Resets the in-memory database and cache state between test runs.
 */
export async function resetInMemoryTestState(): Promise<void> {
  if (sharedRedisClient) {
    try {
      await sharedRedisClient.flushall();
      sharedRedisClient.disconnect();
    } catch {
      // ignore
    }
    sharedRedisClient = null;
  }
  if (sharedPgPool) {
    try {
      await sharedPgPool.end();
    } catch {
      // ignore
    }
    sharedPgPool = null;
  }
  // Clear shared instances to re-seed clean state if needed
  sharedMemDb = null;
}
