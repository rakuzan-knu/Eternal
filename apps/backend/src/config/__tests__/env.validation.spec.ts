import { validateEnv, envSchema } from '../env.validation';

describe('env.validation', () => {
  const validBaseConfig = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/social_network',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'super-secret-access-token-key-must-be-at-least-32-chars-long',
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_SECRET: 'super-secret-refresh-token-key-must-be-at-least-32-chars-long',
    JWT_REFRESH_TTL: '7d',
  };

  it('validates a correct minimal environment configuration', () => {
    const result = validateEnv(validBaseConfig);
    expect(result).toBeDefined();
    expect(result.DATABASE_URL).toBe(validBaseConfig.DATABASE_URL);
    expect(result.REDIS_URL).toBe(validBaseConfig.REDIS_URL);
    expect(result.PORT).toBe(3000);
  });

  it('accepts valid optional environment variables', () => {
    const fullConfig = {
      ...validBaseConfig,
      PORT: '8080',
      SENTRY_DSN: 'https://sentry.io/12345',
      SENTRY_TRACES_SAMPLE_RATE: '0.5',
      GITHUB_CLIENT_ID: 'gh_client_id_123',
      GITHUB_CLIENT_SECRET: 'gh_client_secret_456',
      GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
      GITHUB_SYSTEM_TOKEN: 'gh_sys_token_789',
      GITHUB_WEBHOOK_SECRET: 'gh_webhook_sec_000',
    };

    const result = validateEnv(fullConfig);
    expect(result.PORT).toBe(8080);
    expect(result.SENTRY_DSN).toBe('https://sentry.io/12345');
    expect(result.SENTRY_TRACES_SAMPLE_RATE).toBe('0.5');
    expect(result.GITHUB_CLIENT_ID).toBe('gh_client_id_123');
    expect(result.GITHUB_CLIENT_SECRET).toBe('gh_client_secret_456');
    expect(result.GITHUB_CALLBACK_URL).toBe('http://localhost:3000/auth/github/callback');
    expect(result.GITHUB_SYSTEM_TOKEN).toBe('gh_sys_token_789');
    expect(result.GITHUB_WEBHOOK_SECRET).toBe('gh_webhook_sec_000');
  });

  it('throws an error if DATABASE_URL is missing', () => {
    const invalidConfig = { ...validBaseConfig, DATABASE_URL: '' };
    expect(() => validateEnv(invalidConfig)).toThrow(/Environment validation failed: DATABASE_URL/);
  });

  it('throws an error if REDIS_URL is missing', () => {
    const invalidConfig = { ...validBaseConfig, REDIS_URL: '' };
    expect(() => validateEnv(invalidConfig)).toThrow(/Environment validation failed: REDIS_URL/);
  });

  it('throws an error if JWT_ACCESS_SECRET is shorter than 32 characters', () => {
    const invalidConfig = { ...validBaseConfig, JWT_ACCESS_SECRET: 'too-short-secret' };
    expect(() => validateEnv(invalidConfig)).toThrow(
      /JWT_ACCESS_SECRET must be at least 32 characters long/,
    );
  });

  it('throws an error if JWT_REFRESH_SECRET is shorter than 32 characters', () => {
    const invalidConfig = { ...validBaseConfig, JWT_REFRESH_SECRET: 'short-refresh' };
    expect(() => validateEnv(invalidConfig)).toThrow(
      /JWT_REFRESH_SECRET must be at least 32 characters long/,
    );
  });

  it('throws an error if JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are identical', () => {
    const secret = 'identical-secret-key-that-is-longer-than-32-chars-for-test';
    const invalidConfig = {
      ...validBaseConfig,
      JWT_ACCESS_SECRET: secret,
      JWT_REFRESH_SECRET: secret,
    };
    expect(() => validateEnv(invalidConfig)).toThrow(
      /JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different/,
    );
  });

  it('throws an error for invalid PORT values', () => {
    expect(() => validateEnv({ ...validBaseConfig, PORT: '-1' })).toThrow(
      /Environment validation failed: PORT/,
    );
    expect(() => validateEnv({ ...validBaseConfig, PORT: '70000' })).toThrow(
      /Environment validation failed: PORT/,
    );
    expect(() => validateEnv({ ...validBaseConfig, PORT: 'invalid-port' })).toThrow(
      /Environment validation failed: PORT/,
    );
  });

  it('directly checks envSchema safeParse', () => {
    const parseSuccess = envSchema.safeParse(validBaseConfig);
    expect(parseSuccess.success).toBe(true);

    const parseFail = envSchema.safeParse({});
    expect(parseFail.success).toBe(false);
  });
});
