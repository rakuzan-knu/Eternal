import { z } from 'zod';

export const envSchema = z
  .object({
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
    R2_PUBLIC_URL: z.string().optional(),
    MINIO_ENDPOINT: z.string().optional(),
    MINIO_ACCESS_KEY: z.string().optional(),
    MINIO_SECRET_KEY: z.string().optional(),
    MINIO_BUCKET: z.string().optional(),
    MINIO_PUBLIC_URL: z.string().optional(),
    LOCAL_STORAGE_DIR: z.string().optional(),
    LOCAL_STORAGE_PUBLIC_URL: z.string().optional(),
  })

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
