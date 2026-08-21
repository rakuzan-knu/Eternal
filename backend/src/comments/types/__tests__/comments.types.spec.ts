import type { GetAllCommentsResult } from '../comments.types';
import type { CommentResponseDto } from '@common/contracts';

describe('comments.types', () => {
  it('conforms to GetAllCommentsResult structure', () => {
    const mockCommentDto: CommentResponseDto = {
      id: 'comm-1',
      text: 'Test comment',
      postId: 'post-1',
      userId: 'usr-1',
      author: 'Author',
      handle: 'author_handle',
      avatar: null,
      isVerified: false,
      primaryBadge: null,
      parentId: null,
      rootParentId: null,
      replyToUserId: null,
      replyToUser: null,
      mediaUrl: null,
      likesCount: 0,
      replyCount: 0,
      isLiked: false,
      isLikedByAuthor: false,
      isPinned: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    const result: GetAllCommentsResult = {
      data: [mockCommentDto],
      meta: {
        nextCursor: 'next-123',
        hasNextPage: true,
      },
    };

    expect(result.data).toHaveLength(1);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.nextCursor).toBe('next-123');
  });
});
