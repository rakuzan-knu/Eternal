import {
  createCommentSchema,
  getCommentsQuerySchema,
  CommentResponseDto,
  type CommentWithUser,
} from '../comments';

describe('comments.contract', () => {
  describe('createCommentSchema & getCommentsQuerySchema', () => {
    it('validates createCommentSchema and trims text', () => {
      const parsed = createCommentSchema.parse({
        text: '  Nice post!  ',
        parentId: 'parent-1',
        mediaUrl: 'https://img.com/pic.png',
      });
      expect(parsed.text).toBe('Nice post!');
      expect(parsed.parentId).toBe('parent-1');
    });

    it('rejects empty text and invalid mediaUrl', () => {
      expect(() => createCommentSchema.parse({ text: '' })).toThrow();
      expect(() =>
        createCommentSchema.parse({ text: 'Valid', mediaUrl: 'ftp://bad.com' }),
      ).toThrow();
    });

    it('validates getCommentsQuerySchema defaults and coercion', () => {
      const parsedDefault = getCommentsQuerySchema.parse({});
      expect(parsedDefault.limit).toBe(20);

      const parsedCoerced = getCommentsQuerySchema.parse({
        limit: '45',
        after: 'cur-1',
      });
      expect(parsedCoerced.limit).toBe(45);
      expect(parsedCoerced.after).toBe('cur-1');
    });
  });

  describe('CommentResponseDto', () => {
    it('instantiates DTO and handles fromPrisma transformations with safe ISO strings', () => {
      const comment: CommentWithUser = {
        id: 'c-1',
        text: 'Hello world',
        postId: 'p-1',
        userId: 'u-1',
        parentId: null,
        rootParentId: null,
        replyToUserId: 'u-2',
        mediaUrl: 'https://img.com/c.png',
        isPinned: false,
        isDeleted: false,
        createdAt: new Date('2026-08-01T12:00:00.000Z'),
        user: {
          id: 'u-1',
          username: 'commenter',
          displayName: 'John Commenter',
          avatar: 'https://avatar.com/u1.png',
          isVerified: true,
          primaryBadge: 'gold',
        },
        replyToUser: {
          id: 'u-2',
          username: 'author_john',
          displayName: null,
        },
        likes: [{ userId: 'viewer-1' }],
        likesCount: 1,
        replyCount: 0,
      };

      const dto = CommentResponseDto.fromPrisma(comment, 'viewer-1', 'u-2');
      expect(dto.id).toBe('c-1');
      expect(dto.author).toBe('John Commenter');
      expect(dto.isLiked).toBe(true);
      expect(dto.replyToUser?.displayName).toBe('author_john');
      expect(dto.createdAt).toBe('2026-08-01T12:00:00.000Z');

      // Test deleted comment and object with toISOString in createdAt
      const deletedComment: CommentWithUser = {
        ...comment,
        isDeleted: true,
        user: null,
        createdAt: { toISOString: () => '2026-08-01T12:00:00.000Z' } as unknown as Date,
      };
      const deletedDto = CommentResponseDto.fromPrisma(deletedComment);
      expect(deletedDto.text).toBe('[Comment deleted]');
      expect(deletedDto.mediaUrl).toBeNull();
      expect(deletedDto.author).toBe('User');
    });
  });
});
