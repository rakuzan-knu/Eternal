import {
  createCommentSchema,
  getCommentsQuerySchema,
  CommentResponseDto,
  type CommentWithUser,
} from '../comments';

describe('comments contract schemas and DTOs (comments.spec.ts)', () => {
  it('should validate createCommentSchema and trim whitespace', () => {
    const parsed = createCommentSchema.parse({
      text: '   Nice post!   ',
      parentId: 'parent-123',
    });
    expect(parsed.text).toBe('Nice post!');
    expect(parsed.parentId).toBe('parent-123');
  });

  it('should validate getCommentsQuerySchema defaults and bounds', () => {
    const parsed = getCommentsQuerySchema.parse({});
    expect(parsed.limit).toBe(20);
    expect(parsed.after).toBeUndefined();

    const custom = getCommentsQuerySchema.parse({ limit: 50, after: 'cursor-1' });
    expect(custom.limit).toBe(50);
    expect(custom.after).toBe('cursor-1');
  });

  it('should format CommentResponseDto correctly using fromPrisma', () => {
    const rawComment: CommentWithUser = {
      id: 'comm-1',
      text: 'Great photo!',
      postId: 'post-1',
      userId: 'usr-1',
      parentId: null,
      rootParentId: null,
      replyToUserId: null,
      mediaUrl: 'https://cdn.example.com/comment.png',
      isPinned: false,
      isDeleted: false,
      createdAt: new Date('2026-08-01T12:00:00Z'),
      user: {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice In Wonderland',
        avatar: 'https://cdn.example.com/alice.png',
        isVerified: true,
        primaryBadge: 'star',
      },
      replyToUser: null,
      _count: {
        replies: 2,
        likes: 5,
      },
      likes: [{ userId: 'viewer-1' }, { userId: 'author-1' }],
    };

    const dto = CommentResponseDto.fromPrisma(rawComment, 'viewer-1', 'author-1');
    expect(dto.id).toBe('comm-1');
    expect(dto.author).toBe('Alice In Wonderland');
    expect(dto.handle).toBe('alice');
    expect(dto.isLiked).toBe(true);
    expect(dto.isLikedByAuthor).toBe(true);
    expect(dto.likesCount).toBe(5);
    expect(dto.replyCount).toBe(2);
    expect(dto.mediaUrl).toBe('https://cdn.example.com/comment.png');
  });

  it('should sanitize deleted comments in CommentResponseDto', () => {
    const rawComment: CommentWithUser = {
      id: 'comm-2',
      text: 'Secret text',
      postId: 'post-1',
      userId: 'usr-2',
      parentId: null,
      rootParentId: null,
      replyToUserId: null,
      mediaUrl: 'https://cdn.example.com/secret.png',
      isPinned: false,
      isDeleted: true,
      createdAt: '2026-08-01T12:00:00Z' as unknown as Date,
    };

    const dto = CommentResponseDto.fromPrisma(rawComment);
    expect(dto.text).toBe('[Comment deleted]');
    expect(dto.mediaUrl).toBeNull();
    expect(dto.isDeleted).toBe(true);
  });
});
