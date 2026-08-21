import type { LikeResult } from '../likes.types';

describe('likes.types', () => {
  it('conforms to LikeResult structure', () => {
    const result: LikeResult = {
      liked: true,
      likesCount: 42,
    };

    expect(result.liked).toBe(true);
    expect(result.likesCount).toBe(42);
  });
});
