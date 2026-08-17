import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '@common/prisma';
import { CommentsRepository } from '../comments.repository';

describe('CommentsRepository', () => {
  let repository: CommentsRepository;
  let mockPrisma: {
    post: {
      findUnique: jest.Mock;
    };
    comment: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      delete: jest.Mock;
    };
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const baseComment = {
    id: 'comment-1',
    text: 'Great post!',
    postId: 'post-100',
    userId: 'usr-1',
    parentId: null,
    createdAt: sampleDate,
    updatedAt: sampleDate,
    user: {
      id: 'usr-1',
      username: 'user_one',
      displayName: 'User One',
      avatar: null,
      isVerified: false,
      primaryBadge: null,
    },
  };

  beforeEach(() => {
    mockPrisma = {
      post: {
        findUnique: jest.fn(),
      },
      comment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn(),
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

    it('throws NotFoundException if parent comment is missing or belongs to another post', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100' });
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(
        repository.addComment('post-100', 'usr-1', { text: 'Reply', parentId: 'missing-parent' }),
      ).rejects.toThrow(new NotFoundException('Parent comment not found'));

      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100' });
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        id: 'other-parent',
        postId: 'other-post',
      });

      await expect(
        repository.addComment('post-100', 'usr-1', { text: 'Reply', parentId: 'other-parent' }),
      ).rejects.toThrow(new NotFoundException('Parent comment not found'));
    });

    it('creates comment and returns comment with user relation', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ id: 'post-100' });
      mockPrisma.comment.create.mockResolvedValueOnce(baseComment);

      const created = await repository.addComment('post-100', 'usr-1', { text: 'Great post!' });

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          text: 'Great post!',
          postId: 'post-100',
          userId: 'usr-1',
          parentId: undefined,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
              primaryBadge: true,
            },
          },
        },
      });
      expect(created.id).toBe('comment-1');
    });
  });

  describe('getCommentsByPostId', () => {
    it('queries comments by post id with cursor and limit', async () => {
      mockPrisma.comment.findMany.mockResolvedValueOnce([baseComment]);

      const comments = await repository.getCommentsByPostId('post-100', 10, 'cur-1');

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
        where: { postId: 'post-100' },
        take: 11,
        skip: 1,
        cursor: { id: 'cur-1' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
              primaryBadge: true,
            },
          },
        },
      });
      expect(comments).toHaveLength(1);
    });
  });

  describe('deleteComment', () => {
    it('throws NotFoundException if comment does not exist', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce(null);

      await expect(repository.deleteComment('missing-comment', 'usr-1')).rejects.toThrow(
        new NotFoundException('Comment not found'),
      );
    });

    it('throws ForbiddenException if user is not author of comment', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({
        id: 'comment-1',
        userId: 'other-user',
      });

      await expect(repository.deleteComment('comment-1', 'usr-1')).rejects.toThrow(
        new ForbiddenException('You can only delete your own comments'),
      );
    });

    it('deletes comment when user is author', async () => {
      mockPrisma.comment.findUnique.mockResolvedValueOnce({ id: 'comment-1', userId: 'usr-1' });
      mockPrisma.comment.delete.mockResolvedValueOnce(baseComment);

      const deleted = await repository.deleteComment('comment-1', 'usr-1');

      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
              primaryBadge: true,
            },
          },
        },
      });
      expect(deleted.id).toBe('comment-1');
    });
  });
});
