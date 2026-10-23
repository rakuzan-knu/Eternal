import { z } from 'zod';

export const envSchema = z
  .object({
    SERVICE_ROLE: z.enum(['all', 'core', 'messenger', 'reels', 'music']).default('all'),
    BACKGROUND_ENABLED: z.enum(['true', 'false']).default('true'),
    MEDIA_ORPHAN_CLEANUP_ENABLED: z.enum(['true', 'false']).default('false'),
    MEDIA_PENDING_TRACKING_ENABLED: z.enum(['true', 'false']).default('false'),
    COMPUTE_WORKER_POOL_SIZE: z.coerce.number().int().min(1).max(4).optional(),
    SHARP_CONCURRENCY: z.coerce.number().int().min(1).max(8).optional(),
    SHARP_CACHE_MEMORY_MB: z.coerce.number().int().min(0).max(128).optional(),
    CORE_API_URL: z.string().url().optional(),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long'),
    JWT_ACCESS_TTL: z.string().min(1),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long'),
    JWT_REFRESH_TTL: z.string().min(1),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_POOL_LIMIT: z.coerce.number().int().min(1).max(100).default(20),
    DATABASE_POOL_TIMEOUT_SECONDS: z.coerce.number().int().min(1).max(60).default(10),
    DATABASE_CONNECT_TIMEOUT_SECONDS: z.coerce.number().int().min(1).max(60).default(10),
    DATABASE_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(10000),
    DATABASE_QUERY_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(10000),
    CALL_TELEMETRY_STORAGE: z.enum(['postgres', 'cassandra']).default('postgres'),
    MESSAGE_BODY_ARCHIVE_ENABLED: z.enum(['true', 'false']).default('false'),
    PUBLIC_SEARCH_PROVIDER: z.enum(['postgres', 'algolia']).default('postgres'),
    ALGOLIA_APPLICATION_ID: z
      .string()
      .regex(/^[A-Za-z0-9]+$/)
      .optional(),
    ALGOLIA_API_KEY: z.string().min(1).optional(),
    ALGOLIA_PUBLIC_USERS_INDEX: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,100}$/)
      .optional(),
    PUBLIC_SEARCH_MONTHLY_REQUESTS_LIMIT: z.coerce.number().int().min(1).max(9000).default(9000),
    PUBLIC_SEARCH_MONTHLY_WRITES_LIMIT: z.coerce.number().int().min(1).max(45000).default(45000),
    CASSANDRA_SECURE_CONNECT_BUNDLE: z.string().min(1).optional(),
    CASSANDRA_APPLICATION_TOKEN: z.string().min(1).optional(),
    CASSANDRA_KEYSPACE: z
      .string()
      .regex(/^[a-z][a-z0-9_]{0,47}$/)
      .optional(),
    REDIS_MAXMEMORY_POLICY: z
      .enum(['allkeys-lru', 'volatile-lru', 'allkeys-lfu', 'volatile-lfu', 'noeviction'])
      .default('noeviction'),
    SENTRY_DSN: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_CALLBACK_URL: z.string().optional(),
    GITHUB_SYSTEM_TOKEN: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    FEED_PRESET: z.enum(['legacy', 'balanced']).optional(),
    SANITIZE_BACKEND: z.enum(['legacy', 'pipeline']).optional(),
    BLIND_RSA_N_HEX: z.string().optional(),
    BLIND_RSA_E_HEX: z.string().optional(),
    BLIND_RSA_D_HEX: z.string().optional(),
    STORAGE_DRIVER: z.enum(['r2', 's3', 'minio', 'local', 'auto']).optional().default('auto'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ENDPOINT: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
    R2_PRIVATE_BUCKET: z.string().optional(),
    R2_PUBLIC_URL: z.string().optional(),
    MINIO_ENDPOINT: z.string().optional(),
    MINIO_ACCESS_KEY: z.string().optional(),
    MINIO_SECRET_KEY: z.string().optional(),
    MINIO_BUCKET: z.string().optional(),
    MINIO_PUBLIC_URL: z.string().optional(),
    LOCAL_STORAGE_DIR: z.string().optional(),
    LOCAL_STORAGE_PUBLIC_URL: z.string().optional(),
  })

  .refine(
    (data) => {
      const values = [
        data.CASSANDRA_SECURE_CONNECT_BUNDLE,
        data.CASSANDRA_APPLICATION_TOKEN,
        data.CASSANDRA_KEYSPACE,
      ];
      const configured = values.filter(Boolean).length;
      return (
        configured === 3 ||
        (configured === 0 &&
          data.CALL_TELEMETRY_STORAGE === 'postgres' &&
          data.MESSAGE_BODY_ARCHIVE_ENABLED === 'false')
      );
    },
    {
      message:
        'Cassandra requires its secure connect bundle, application token and keyspace together',
    },
  )

  .refine(
    (data) =>
      data.PUBLIC_SEARCH_PROVIDER !== 'algolia' ||
      Boolean(
        data.ALGOLIA_APPLICATION_ID && data.ALGOLIA_API_KEY && data.ALGOLIA_PUBLIC_USERS_INDEX,
      ),
    { message: 'Algolia mode requires application ID, backend key and dedicated users index' },
  )

  .refine((data) => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET, {
    message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
  })
  .refine(
    (data) => {
      const set = [data.BLIND_RSA_N_HEX, data.BLIND_RSA_E_HEX, data.BLIND_RSA_D_HEX].filter(
        (v) => v !== undefined && v !== '',
      ).length;
      return set === 0 || set === 3;
    },
    { message: 'BLIND_RSA_N_HEX/E_HEX/D_HEX must be set together or all absent' },
  );

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const message = result.error.issues
      .map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new Error(`Environment validation failed: ${message}`);
  }

  return result.data;
}
