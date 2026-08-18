import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from '../comments.service';
import type { PrismaService } from '@common/prisma';
import type { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import type { RedisService } from '../../redis/redis.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let mockCommentsRepository: {
    addComment: jest.Mock;
    deleteComment: jest.Mock;
    getCommentsByPostId: jest.Mock;
    getRepliesByRootId: jest.Mock;
    toggleCommentLike: jest.Mock;
    togglePinComment: jest.Mock;
  };
  let mockPrisma: {
    post: {
      findUnique: jest.Mock;
    };
    comment: {
      findFirst: jest.Mock;
    };
    userBlock: {
      findFirst: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let mockGateway: {
    emitToUser: jest.Mock;
  };
  let mockRedis: {
    getClient: jest.Mock;
  };
  let mockRedisClient: {
    set: jest.Mock;
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const baseComment = {
    id: 'comment-1',
    text: 'Check @alice_dev on this!',
    postId: 'post-100',
    userId: 'usr-commenter',
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
      id: 'usr-commenter',
      username: 'commenter_user',
      displayName: 'Commenter',
      avatar: null,
      isVerified: true,
      primaryBadge: null,
    },
  };

  beforeEach(() => {
    mockCommentsRepository = {
      addComment: jest.fn(),
      deleteComment: jest.fn(),
      getCommentsByPostId: jest.fn().mockResolvedValue([]),
      getRepliesByRootId: jest.fn().mockResolvedValue([]),
      toggleCommentLike: jest.fn().mockResolvedValue({ isLiked: true, likesCount: 1 }),
      togglePinComment: jest.fn().mockResolvedValue({ isPinned: true }),
    };

    mockPrisma = {
      post: {
        findUnique: jest.fn(),
      },
      comment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      userBlock: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockRedis = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    service = new CommentsService(
      mockCommentsRepository,
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as MessengerGateway,
      mockRedis as unknown as RedisService,
    );
  });

  describe('addComment security & anti-abuse', () => {
    it('throws BadRequestException if mentions count > 5', async () => {
      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Hello @user1 @user2 @user3 @user4 @user5 @user6!',
        }),
      ).rejects.toThrow(new BadRequestException('Maximum 5 mentions per comment allowed'));
    });

    it('throws ConflictException if duplicate comment was posted within 60s', async () => {
      mockPrisma.comment.findFirst.mockResolvedValueOnce({ id: 'existing-dup' });

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Same repeated comment text',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if clientMutationId lock fails', async () => {
      mockRedisClient.set.mockResolvedValueOnce(null);

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Comment with mutation id',
          clientMutationId: 'mut-123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.addComment('missing-post', 'usr-1', {
          text: 'Valid comment',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if post author blocked user or vice versa', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-author',
      });
      mockPrisma.userBlock.findFirst.mockResolvedValueOnce({ id: 'block-1' });

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Valid comment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates comment and emits notifications when valid', async () => {
      mockCommentsRepository.addComment.mockResolvedValueOnce(baseComment);
      mockPrisma.post.findUnique.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-post-author',
        author: { username: 'post_author' },
      });
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'usr-commenter',
          username: 'commenter_user',
          displayName: 'Commenter',
          avatar: null,
        })
        .mockResolvedValueOnce({
          id: 'usr-commenter',
          username: 'commenter_user',
          displayName: 'Commenter',
          avatar: null,
        });
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'usr-alice', username: 'alice_dev' }]);

      const result = await service.addComment('post-100', 'usr-commenter', {
        text: 'Check @alice_dev on this!',
      });

      expect(mockCommentsRepository.addComment).toHaveBeenCalledWith('post-100', 'usr-commenter', {
        text: 'Check @alice_dev on this!',
      });
      expect(result.id).toBe('comment-1');
      expect(mockGateway.emitToUser).toHaveBeenCalled();
    });
  });

  describe('getComments & getReplies', () => {
    it('paginates root comments', async () => {
      mockCommentsRepository.getCommentsByPostId.mockResolvedValueOnce([baseComment]);

      const result = await service.getComments('post-100', 10, undefined, 'usr-viewer');

      expect(mockCommentsRepository.getCommentsByPostId).toHaveBeenCalledWith(
        'post-100',
        10,
        undefined,
        'usr-viewer',
      );
      expect(result.data).toHaveLength(1);
    });

    it('paginates replies for root thread', async () => {
      mockCommentsRepository.getRepliesByRootId.mockResolvedValueOnce([baseComment]);

      const result = await service.getReplies('comment-1', 10, undefined, 'usr-viewer');

      expect(mockCommentsRepository.getRepliesByRootId).toHaveBeenCalledWith(
        'comment-1',
        10,
        undefined,
        'usr-viewer',
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('toggleCommentLike & togglePinComment', () => {
    it('delegates toggleCommentLike', async () => {
      const res = await service.toggleCommentLike('com-1', 'usr-1');
      expect(mockCommentsRepository.toggleCommentLike).toHaveBeenCalledWith('com-1', 'usr-1');
      expect(res.isLiked).toBe(true);
    });

    it('delegates togglePinComment', async () => {
      const res = await service.togglePinComment('com-1', 'usr-1');
      expect(mockCommentsRepository.togglePinComment).toHaveBeenCalledWith('com-1', 'usr-1');
      expect(res.isPinned).toBe(true);
    });
  });

  describe('deleteComment', () => {
    it('deletes comment and returns dto', async () => {
      mockCommentsRepository.deleteComment.mockResolvedValueOnce(baseComment);

      const result = await service.deleteComment('comment-1', 'usr-commenter');

      expect(mockCommentsRepository.deleteComment).toHaveBeenCalledWith(
        'comment-1',
        'usr-commenter',
      );
      expect(result.id).toBe('comment-1');
    });
  });
});
