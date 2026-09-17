import {
  getInMemoryPgDb,
  createInMemoryPgPool,
  createInMemoryRedisClient,
  resetInMemoryTestState,
} from '../../test/in-memory-db';

describe('In-Memory Test Infrastructure (pg-mem & ioredis-mock)', () => {
  afterEach(async () => {
    await resetInMemoryTestState();
  });

  describe('1. In-Memory PostgreSQL (pg-mem)', () => {
    it('creates in-memory database and executes SQL queries', () => {
      const db = getInMemoryPgDb();
      expect(db).toBeDefined();

      const result = db.public.one('SELECT 1 + 1 AS sum') as { sum: number };
      expect(result).toEqual({ sum: 2 });
    });

    it('creates pg.Pool compatible instance and queries via pool', async () => {
      const pool = createInMemoryPgPool();
      expect(pool).toBeDefined();

      const client = await pool.connect();
      try {
        const res = await client.query<{ value: number }>('SELECT 42 AS value');
        expect(res.rows[0]?.value).toBe(42);
      } finally {
        client.release();
      }
    });

    it('generates random UUIDs using custom pg-mem registered function', () => {
      const db = getInMemoryPgDb();
      const res = db.public.one('SELECT gen_random_uuid() AS id') as { id: string };
      expect(res.id).toBeDefined();
      expect(typeof res.id).toBe('string');
      expect(res.id.length).toBeGreaterThan(10);
    });
  });

  describe('2. In-Memory Redis (ioredis-mock)', () => {
    it('instantiates RedisMock and supports basic key-value operations', async () => {
      const redis = createInMemoryRedisClient();
      expect(redis).toBeDefined();

      await redis.set('test:in-memory:key', 'hello-ram');
      const val = await redis.get('test:in-memory:key');
      expect(val).toBe('hello-ram');

      await redis.del('test:in-memory:key');
      const afterDel = await redis.get('test:in-memory:key');
      expect(afterDel).toBeNull();
    });

    it('supports set and list operations in RAM', async () => {
      const redis = createInMemoryRedisClient();
      await redis.sadd('test:set', 'member1', 'member2');
      const members = await redis.smembers('test:set');
      expect(members).toContain('member1');
      expect(members).toContain('member2');
    });
  });
});
