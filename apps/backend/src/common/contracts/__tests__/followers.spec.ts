import { getFollowersQuerySchema, followResponseSchema } from '../followers';

describe('followers contract schemas (followers.spec.ts)', () => {
  it('should validate getFollowersQuerySchema default values', () => {
    const parsed = getFollowersQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.after).toBeUndefined();
  });

  it('should validate getFollowersQuerySchema custom values', () => {
    const parsed = getFollowersQuerySchema.parse({ limit: '30', after: 'usr-cursor' });
    expect(parsed.limit).toBe(30);
    expect(parsed.after).toBe('usr-cursor');
  });

  it('should validate followResponseSchema with various status values', () => {
    expect(followResponseSchema.parse({ success: true, status: 'following' })).toEqual({
      success: true,
      status: 'following',
    });
    expect(followResponseSchema.parse({ success: true, status: 'pending' })).toEqual({
      success: true,
      status: 'pending',
    });
    expect(followResponseSchema.parse({ success: true, status: 'unfollowed' })).toEqual({
      success: true,
      status: 'unfollowed',
    });
  });

  it('should reject invalid status in followResponseSchema', () => {
    expect(() =>
      followResponseSchema.parse({
        success: true,
        status: 'blocked',
      }),
    ).toThrow();
  });
});
