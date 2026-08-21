import { createCommentSchema, getCommentsQuerySchema, CommentResponseDto } from '../comments';

describe('comments.contract', () => {
  describe('createCommentSchema & getCommentsQuerySchema', () => {
    it('validates createCommentSchema and trims text', () => {
      const parsed = createCommentSchema.parse({
        text: '  Nice post!  ',
        parentId: 'parent-1',
      });
      expect(parsed.text).toBe('Nice post!');
      expect(parsed.parentId).toBe('parent-1');
    });

    it('rejects empty text', () => {
      expect(() => createCommentSchema.parse({ text: '' })).toThrow();
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
    it('instantiates DTO with expected properties', () => {
      const dto = new CommentResponseDto();
      dto.id = 'c-1';
      dto.text = 'Comment';
      dto.postId = 'p-1';
      dto.userId = 'u-1';
      dto.author = 'Author';
      dto.handle = 'handle';
      dto.avatar = null;
      dto.isVerified = true;
      dto.primaryBadge = null;
      dto.parentId = null;
      dto.rootParentId = null;
      dto.replyToUserId = null;
      dto.replyToUser = null;
      dto.createdAt = new Date().toISOString();
      dto.likesCount = 0;
      dto.replyCount = 0;
      dto.isLiked = false;
      dto.isLikedByAuthor = false;
      dto.isPinned = false;
      dto.isDeleted = false;
      dto.mediaUrl = null;

      expect(dto.id).toBe('c-1');
      expect(dto.isVerified).toBe(true);
      expect(dto.likesCount).toBe(0);
    });
  });
});
