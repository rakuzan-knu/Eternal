import { CommentsService } from '../comments.service';
import type { PrismaService } from '@common/prisma';
import type { MessengerGateway } from '../../messenger/gateway/messenger.gateway';

describe('CommentsService', () => {
  let service: CommentsService;
  let mockCommentsRepository: {
    addComment: jest.Mock;
    deleteComment: jest.Mock;
    getCommentsByPostId: jest.Mock;
  };
  let mockPrisma: {
    post: {
      findUnique: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let mockGateway: {
    emitToUser: jest.Mock;
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const baseComment = {
    id: 'comment-1',
    text: 'Check @alice_dev on this!',
    postId: 'post-100',
    userId: 'usr-commenter',
    parentId: null,
    createdAt: sampleDate,
    updatedAt: sampleDate,
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
    };

    mockPrisma = {
      post: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    service = new CommentsService(
      mockCommentsRepository,
      mockPrisma as unknown as PrismaService,
      mockGateway as unknown as MessengerGateway,
    );
  });

  describe('addComment', () => {
    it('creates comment and emits notifications to post author and mentioned users', async () => {
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
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'usr-post-author',
        'socialNotification',
        expect.objectContaining({ type: 'COMMENT' }),
      );
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'usr-alice',
        'socialNotification',
        expect.objectContaining({ type: 'MENTION' }),
      );
      expect(result.id).toBe('comment-1');
      expect(result.handle).toBe('commenter_user');
      expect(result.author).toBe('Commenter');
    });
  });

  describe('deleteComment', () => {
    it('delegates deletion to repository and maps to DTO', async () => {
      mockCommentsRepository.deleteComment.mockResolvedValueOnce(baseComment);

      const result = await service.deleteComment('comment-1', 'usr-commenter');

      expect(mockCommentsRepository.deleteComment).toHaveBeenCalledWith(
        'comment-1',
        'usr-commenter',
      );
      expect(result.id).toBe('comment-1');
    });
  });

  describe('getComments', () => {
    it('queries repository and paginates comments', async () => {
      mockCommentsRepository.getCommentsByPostId.mockResolvedValueOnce([baseComment]);

      const result = await service.getComments('post-100', 10, 'cursor-1');

      expect(mockCommentsRepository.getCommentsByPostId).toHaveBeenCalledWith(
        'post-100',
        10,
        'cursor-1',
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('comment-1');
    });
  });
});
