import { REDIS_CLIENT } from '../redis.constants';

describe('redis.constants', () => {
  it('defines REDIS_CLIENT token as REDIS_CLIENT', () => {
    expect(REDIS_CLIENT).toBe('REDIS_CLIENT');
  });
});
