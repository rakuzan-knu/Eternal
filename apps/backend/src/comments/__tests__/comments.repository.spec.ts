import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsRepository } from '../comments.repository';
import type { PrismaService } from '@common/prisma';

describe('CommentsRepository', () => {
  let repository: CommentsRepository;
  let mockPrisma: {
    post: {
      findUnique: jest.Mock;
    };
    comment: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      delete: jest.Mock;
    };
    commentLike: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const baseComment = {
    id: 'comment-1',
    text: 'Hello world',
    postId: 'post-100',
    userId: 'usr-1',
    parentId: null,
    rootParentId: null,
    replyToUserId: null,
    isPinned: false,
    isDeleted: false,
    mediaUrl: null,
    createdAt: sampleDate,
    updatedAt: sampleDate,
    likes: [],
    _count: { likes: 0, replies: 0 },
    user: {
      id: 'usr-1',
      username: 'test_user',
      displayName: 'Test User',
      avatar: null,
      isVerified: true,
      primaryBadge: null,
    },
    replyToUser: null,
  };

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn(),
      },
      comment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      commentLike: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    repository = new CommentsRepository(mockPrisma as unknown as PrismaService);
  });

  describe('addComment', () => {
    it('throws NotFoundException if post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(null);

      await expect(
        repository.addComment('missing-post', 'usr-1', { text: 'Hello' }),
      ).rejects.toThrow(new NotFoundException('Post not found'));
    });

    it('throws NotFoundException if parent comment is missing or from different post', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100' });
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(
        repository.addComment('post-100', 'usr-1', { text: 'Reply', parentId: 'missing-parent' }),
      ).rejects.toThrow(new NotFoundException('Parent comment not found'));
    });

    it('creates root comment with user and replyToUser includes', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100' });
      mockPrisma.comment.create.mockResolvedValueOnce(baseComment);

      const created = await repository.addComment('post-100', 'usr-1', { text: 'Hello world' });
      expect(created.id).toBe('comment-1');
    });

    it('creates reply comment calculating rootParentId', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100' });
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        id: 'com-root',
        postId: 'post-100',
        userId: 'usr-author',
        rootParentId: null,
      });
      mockPrisma.comment.create.mockResolvedValueOnce({
        ...baseComment,
        id: 'com-reply',
        parentId: 'com-root',
        rootParentId: 'com-root',
        replyToUserId: 'usr-author',
      });

      const reply = await repository.addComment('post-100', 'usr-1', {
        text: 'Reply to root',
        parentId: 'com-root',
      });
      expect(reply.rootParentId).toBe('com-root');
    });
  });

  describe('getCommentsByPostId', () => {
    it('queries root comments ordered by isPinned desc and createdAt asc', async () => {
      mockPrisma.comment.findMany.mockResolvedValueOnce([baseComment]);
      mockPrisma.post.findUnique.mockResolvedValueOnce({ authorId: 'usr-post-author' });

      const comments = await repository.getCommentsByPostId('post-100', 10, 'cur-1', 'usr-1');

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postId: 'post-100', parentId: null },
          take: 11,
          skip: 1,
          cursor: { id: 'cur-1' },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
        }),
      );
      expect(comments).toHaveLength(1);
    });
  });

  describe('getRepliesByRootId', () => {
    it('queries replies by rootParentId or parentId', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        id: 'com-root',
        post: { authorId: 'usr-author' },
      });
      mockPrisma.comment.findMany.mockResolvedValueOnce([baseComment]);

      const replies = await repository.getRepliesByRootId('com-root', 10);
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ rootParentId: 'com-root' }, { parentId: 'com-root' }],
          },
        }),
      );
      expect(replies).toHaveLength(1);
    });

    it('throws NotFoundException if root comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(repository.getRepliesByRootId('missing-root', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleCommentLike', () => {
    it('creates like when not already liked', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(baseComment);
      mockPrisma.commentLike.findUnique.mockResolvedValueOnce(null);
      mockPrisma.commentLike.count.mockResolvedValueOnce(1);

      const res = await repository.toggleCommentLike('comment-1', 'usr-1');
      expect(mockPrisma.commentLike.create).toHaveBeenCalledWith({
        data: { commentId: 'comment-1', userId: 'usr-1' },
      });
      expect(res.isLiked).toBe(true);
      expect(res.likesCount).toBe(1);
    });

    it('deletes like when already liked', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(baseComment);
      mockPrisma.commentLike.findUnique.mockResolvedValueOnce({ id: 'like-1' });
      mockPrisma.commentLike.count.mockResolvedValueOnce(0);

      const res = await repository.toggleCommentLike('comment-1', 'usr-1');
      expect(mockPrisma.commentLike.delete).toHaveBeenCalledWith({
        where: { commentId_userId: { commentId: 'comment-1', userId: 'usr-1' } },
      });
      expect(res.isLiked).toBe(false);
      expect(res.likesCount).toBe(0);
    });
  });

  describe('togglePinComment', () => {
    it('throws ForbiddenException if user is not post author or if pinning child comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        ...baseComment,
        post: { authorId: 'other-user' },
      });

      await expect(repository.togglePinComment('comment-1', 'usr-1')).rejects.toThrow(
        ForbiddenException,
      );

      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        ...baseComment,
        parentId: 'parent-1',
        post: { authorId: 'usr-1' },
      });

      await expect(repository.togglePinComment('comment-1', 'usr-1')).rejects.toThrow(
        new ForbiddenException('Only root comments can be pinned'),
      );
    });

    it('unpins previous pinned comment and pins new comment (limit 1)', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        ...baseComment,
        isPinned: false,
        post: { authorId: 'usr-1' },
      });

      const res = await repository.togglePinComment('comment-1', 'usr-1');
      expect(mockPrisma.comment.updateMany).toHaveBeenCalledWith({
        where: { postId: 'post-100', isPinned: true },
        data: { isPinned: false },
      });
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { isPinned: true },
      });
      expect(res.isPinned).toBe(true);
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundException if comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(repository.deleteComment('missing-comment', 'usr-1')).rejects.toThrow(
        new NotFoundException('Comment not found'),
      );
    });

    it('throws ForbiddenException if user is not comment author or post author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        ...baseComment,
        userId: 'author-comment',
        post: { authorId: 'author-post' },
      });

      await expect(repository.deleteComment('comment-1', 'intruder')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('tombstones comment if it has replies', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        ...baseComment,
        userId: 'usr-1',
        post: { authorId: 'usr-post-author' },
        _count: { replies: 2, likes: 0 },
      });
      mockPrisma.comment.update.mockResolvedValueOnce({
        ...baseComment,
        isDeleted: true,
        text: '[Comment deleted]',
      });

      const res = await repository.deleteComment('comment-1', 'usr-1');
      expect(mockPrisma.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-1' },
          data: { isDeleted: true, text: '[Comment deleted]', mediaUrl: null },
        }),
      );
      expect(res.isDeleted).toBe(true);
    });

    it('hard deletes comment if it has no replies', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        ...baseComment,
        userId: 'usr-1',
        post: { authorId: 'usr-post-author' },
        _count: { replies: 0, likes: 0 },
      });
      mockPrisma.comment.delete.mockResolvedValueOnce(baseComment);

      await repository.deleteComment('comment-1', 'usr-1');
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'comment-1' },
        }),
      );
    });
  });
});
