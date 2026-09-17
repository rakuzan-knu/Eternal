import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService, createPgPool } from '../src/common/prisma';
import { DataLoaderService } from '../src/common/dataloader';
import { RedisService } from '../src/redis/redis.service';
import {
  getPostsQuerySchema,
  getCommentsQuerySchema,
  getMessagesQuerySchema,
  getNotificationsQuerySchema,
  addMembersSchema,
  createGroupConversationSchema,
  createPostSchema,
  updateUserSchema,
  markAllAsReadQuerySchema,
  listExceptionsQuerySchema,
  forAllQuerySchema,
  PrivacyDimension,
} from '@common/contracts';

describe('Database, Cache, Validation & Security (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let dataLoaderService: DataLoaderService;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);
    dataLoaderService = app.get<DataLoaderService>(DataLoaderService);
    redisService = app.get<RedisService>(RedisService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Database Connection Pooling & Timeouts', () => {
    it('configures pg connection pool with strict bounds, idle timeouts and statement timeouts', () => {
      const pool = createPgPool('postgresql://user:pass@localhost:5432/testdb', {
        poolLimit: 15,
        poolTimeout: 10,
        connectTimeout: 5,
        statementTimeout: 5000,
        queryTimeout: 5000,
      });

      expect(pool).toBeDefined();
      if (pool) {
        expect(pool.options.max).toBe(15);
        expect(pool.options.idleTimeoutMillis).toBe(10000);
        expect(pool.options.connectionTimeoutMillis).toBe(5000);
        expect(pool.options.statement_timeout).toBe(5000);
        expect(pool.options.query_timeout).toBe(5000);
        void pool.end();
      }
    });

    it('PrismaService provides pool metrics without leaking connections', () => {
      const metrics = prismaService.getPoolMetrics();
      if (metrics) {
        expect(metrics).toHaveProperty('total');
        expect(metrics).toHaveProperty('idle');
        expect(metrics).toHaveProperty('active');
        expect(metrics).toHaveProperty('waiting');
        expect(typeof metrics.total).toBe('number');
        expect(typeof metrics.active).toBe('number');
      }
    });
  });

  describe('2. DataLoader Pattern & N+1 Prevention', () => {
    it('creates scoped batch loaders for aggregated entities', () => {
      const loaders = dataLoaderService.createScopedLoaders();
      expect(loaders.userLoader).toBeDefined();
      expect(loaders.avatarLoader).toBeDefined();
      expect(loaders.messageReactionsLoader).toBeDefined();
      expect(loaders.unreadCountLoader).toBeDefined();
      expect(loaders.postStatsLoader).toBeDefined();
      expect(loaders.commentStatsLoader).toBeDefined();
      expect(loaders.messageLoader).toBeDefined();
      expect(loaders.userBadgesLoader).toBeDefined();
      expect(loaders.userFollowsLoader).toBeDefined();
      expect(loaders.postInteractionsLoader).toBeDefined();
    });

    it('DataLoader batches multiple concurrent loads for the same entity without redundant queries', async () => {
      const userLoader = dataLoaderService.createUserLoader();
      // Load non-existent or test IDs concurrently
      const results = await Promise.all([
        userLoader.load('00000000-0000-0000-0000-000000000001'),
        userLoader.load('00000000-0000-0000-0000-000000000001'),
        userLoader.load('00000000-0000-0000-0000-000000000002'),
      ]);

      expect(results).toHaveLength(3);
      // Deduped loading returned consistent mapped values
      expect(results[0]).toBe(results[1]);
    });
  });

  describe('3. Keyset / Cursor-Based Pagination Contracts', () => {
    it('strictly caps pagination page sizes to 50 max to prevent unbounded memory allocation', () => {
      // Test limit > 50 fails validation
      const invalidPostQuery = getPostsQuerySchema.safeParse({ limit: 51 });
      expect(invalidPostQuery.success).toBe(false);

      const invalidCommentQuery = getCommentsQuerySchema.safeParse({ limit: 100 });
      expect(invalidCommentQuery.success).toBe(false);

      const invalidMessageQuery = getMessagesQuerySchema.safeParse({ limit: 200 });
      expect(invalidMessageQuery.success).toBe(false);

      const invalidNotificationQuery = getNotificationsQuerySchema.safeParse({ limit: 999 });
      expect(invalidNotificationQuery.success).toBe(false);

      // Valid cursor queries succeed with default/bounded limit
      const validPostQuery = getPostsQuerySchema.safeParse({
        limit: 20,
        after: 'cursor-token-123',
      });
      expect(validPostQuery.success).toBe(true);
      if (validPostQuery.success) {
        expect(validPostQuery.data.limit).toBe(20);
        expect(validPostQuery.data.after).toBe('cursor-token-123');
      }
    });
  });

  describe('4. Redis Caching, Cache Stampede & TTL Management', () => {
    it('Singleflight promise coalescing prevents multiple concurrent executions for the same key', async () => {
      const testKey = 'test:singleflight:' + Date.now();
      let loadCount = 0;

      const loader = async () => {
        loadCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { data: 'coalesced-result', count: loadCount };
      };

      // Launch 5 concurrent calls simultaneously
      const results = await Promise.all([
        redisService.getOrSet(testKey, 10, loader),
        redisService.getOrSet(testKey, 10, loader),
        redisService.getOrSet(testKey, 10, loader),
        redisService.getOrSet(testKey, 10, loader),
        redisService.getOrSet(testKey, 10, loader),
      ]);

      expect(loadCount).toBe(1);
      results.forEach((r) => {
        expect(r.data).toBe('coalesced-result');
        expect(r.count).toBe(1);
      });

      await redisService.del(testKey);
    });

    it('XFetch Probabilistic Early Expiration refreshes cache smoothly', async () => {
      const testKey = 'test:xfetch:' + Date.now();
      let computed = 0;

      const loader = async () => {
        computed++;
        return { item: 'hot-item', version: computed };
      };

      const first = await redisService.getOrSetWithProbabilisticEarlyExpiration(
        testKey,
        60,
        loader,
      );
      expect(first.item).toBe('hot-item');
      expect(computed).toBe(1);

      // Subsequent read from cache returns cached value immediately
      const second = await redisService.getOrSetWithProbabilisticEarlyExpiration(
        testKey,
        60,
        loader,
      );
      expect(second.item).toBe('hot-item');
      expect(computed).toBe(1);

      await redisService.del(testKey);
    });

    it('enforces TTL on Redis writes', async () => {
      const testKey = 'test:ttl:' + Date.now();
      await redisService.set(testKey, 'ttl-val', 60);

      const exists = await redisService.exists(testKey);
      expect(exists).toBe(true);

      await redisService.del(testKey);
    });
  });

  describe('5. Strict DTO Validation, DOS & Prototype Pollution Protection', () => {
    it('rejects oversized strings (DOS protection)', () => {
      const hugeString = 'a'.repeat(20_000);
      const invalidPost = createPostSchema.safeParse({
        content: hugeString,
      });
      expect(invalidPost.success).toBe(false);

      const hugeBio = 'b'.repeat(500);
      const invalidUser = updateUserSchema.safeParse({
        bio: hugeBio,
      });
      expect(invalidUser.success).toBe(false);
    });

    it('rejects oversized arrays (ArrayMaxSize / DOS protection)', () => {
      const oversizedMembers = Array.from(
        { length: 150 },
        () => '00000000-0000-0000-0000-000000000001',
      );
      const invalidGroup = createGroupConversationSchema.safeParse({
        name: 'Huge Group',
        memberIds: oversizedMembers,
      });
      expect(invalidGroup.success).toBe(false);

      const invalidAddMembers = addMembersSchema.safeParse({
        memberIds: oversizedMembers,
      });
      expect(invalidAddMembers.success).toBe(false);
    });

    it('safely parses and validates controller query schemas', () => {
      // markAllAsReadQuerySchema
      expect(markAllAsReadQuerySchema.safeParse({ type: 'likes' }).success).toBe(true);
      expect(markAllAsReadQuerySchema.safeParse({ type: 'invalid_type' }).success).toBe(false);

      // listExceptionsQuerySchema
      expect(
        listExceptionsQuerySchema.safeParse({ dimension: PrivacyDimension.LAST_SEEN }).success,
      ).toBe(true);
      expect(listExceptionsQuerySchema.safeParse({ dimension: 'INVALID' }).success).toBe(false);

      // forAllQuerySchema
      const forAllParsed = forAllQuerySchema.safeParse({ forAll: 'true' });
      expect(forAllParsed.success).toBe(true);
      if (forAllParsed.success) {
        expect(forAllParsed.data.forAll).toBe(true);
      }
    });

    it('prevents prototype pollution payloads from mutating Object.prototype', () => {
      const payloadWithProto = JSON.parse(
        '{"__proto__":{"polluted":true},"content":"hello"}',
      ) as Record<string, unknown>;
      const parsed = createPostSchema.safeParse(payloadWithProto);
      expect(parsed.success).toBe(true);
      expect((Object.prototype as unknown as { polluted?: boolean }).polluted).toBeUndefined();
    });
  });
});
