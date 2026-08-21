// Provide fallback test environment variables for modules validating env on import
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/social_network_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-jwt-access-secret-at-least-32-chars-long-for-testing';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL || '15m';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-at-least-32-chars-long-for-testing';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

afterAll(async () => {
  // Allow pending async microtasks/timers to drain cleanly before Jest terminates
  await new Promise((resolve) => setTimeout(resolve, 100));
});
