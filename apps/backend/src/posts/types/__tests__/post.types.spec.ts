import type { GetAllPostsResult } from '../post.types';
import type { PostResponseDto } from '@common/contracts';

describe('post.types', () => {
  it('conforms to GetAllPostsResult type structure', () => {
    const postDto: PostResponseDto = {
      id: 'p-1',
      content: 'Post body',
      text: 'Post body',
      media: [],
      authorId: 'a-1',
      author: 'Author',
      handle: 'author',
      avatar: null,
      isVerified: false,
      primaryBadge: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFollowing: false,
      isSaved: false,
      isReposted: false,
      isLiked: false,
      isOwner: true,
      likesCount: 0,
      likes: 0,
      repostsCount: 0,
      reposts: 0,
      sharesCount: 0,
      commentsCount: 0,
      comments: 0,
    };

    const result: GetAllPostsResult = {
      data: [postDto],
      meta: {
        nextCursor: 'cur-100',
        hasNextPage: false,
      },
    };

    expect(result.data).toHaveLength(1);
    expect(result.data[0].content).toBe('Post body');
    expect(result.meta.nextCursor).toBe('cur-100');
  });
});
