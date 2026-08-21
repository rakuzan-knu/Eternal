import { getFollowersQuerySchema, followResponseSchema } from '../followers';

describe('followers.contract', () => {
  it('validates getFollowersQuerySchema', () => {
    expect(getFollowersQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(getFollowersQuerySchema.parse({ limit: '50', after: 'cursor-1' })).toEqual({
      limit: 50,
      after: 'cursor-1',
    });
  });

  it('validates followResponseSchema status values', () => {
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
    expect(() => followResponseSchema.parse({ success: true, status: 'invalid-status' })).toThrow();
  });
});
