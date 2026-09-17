import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from '../comments.service';
import type { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import type { RedisService } from '../../redis/redis.service';
import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('CommentsService', () => {
  let service: CommentsService;
  let mockCommentsRepository: {
    addComment: jest.Mock;
    deleteComment: jest.Mock;
    getCommentsByPostId: jest.Mock;
    getRepliesByRootId: jest.Mock;
    toggleCommentLike: jest.Mock;
    togglePinComment: jest.Mock;
    findRecentDuplicate: jest.Mock;
    findPostBasic: jest.Mock;
    isBlocked: jest.Mock;
    findUserBasic: jest.Mock;
    findMentionedUsers: jest.Mock;
  };
  let mockGateway: {
    emitToUser: jest.Mock;
  };
  let mockRedis: {
    getClient: jest.Mock;
    acquireLock: jest.Mock;
    releaseLock: jest.Mock;
  };
  let mockRedisClient: {
    set: jest.Mock;
  };
  let mockEventEmitter: {
    emit: jest.Mock;
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
      findRecentDuplicate: jest.fn().mockResolvedValue(null),
      findPostBasic: jest.fn().mockResolvedValue(null),
      isBlocked: jest.fn().mockResolvedValue(false),
      findUserBasic: jest.fn().mockResolvedValue(null),
      findMentionedUsers: jest.fn().mockResolvedValue([]),
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
    };

    mockRedis = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      acquireLock: jest.fn().mockResolvedValue('token-123'),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    service = new CommentsService(
      mockCommentsRepository,
      mockGateway as unknown as MessengerGateway,
      mockRedis as unknown as RedisService,
      mockEventEmitter as unknown as EventEmitter2,
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
      mockCommentsRepository.findRecentDuplicate.mockResolvedValueOnce({ id: 'existing-dup' });

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Same repeated comment text',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if clientMutationId lock fails', async () => {
      mockRedis.acquireLock.mockResolvedValueOnce(null);

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Comment with mutation id',
          clientMutationId: 'mut-123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if post does not exist', async () => {
      mockCommentsRepository.findPostBasic.mockResolvedValueOnce(null);

      await expect(
        service.addComment('missing-post', 'usr-1', {
          text: 'Valid comment',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if post author blocked user or vice versa', async () => {
      mockCommentsRepository.findPostBasic.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-author',
      });
      mockCommentsRepository.isBlocked.mockResolvedValueOnce(true);

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Valid comment',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if replyToUserId blocked commenter', async () => {
      mockCommentsRepository.findPostBasic.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-author',
      });
      mockCommentsRepository.isBlocked.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      await expect(
        service.addComment('post-100', 'usr-1', {
          text: 'Valid reply',
          replyToUserId: 'usr-reply-target',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates comment, emits notification and gateway events for author, replyTo, and mentions', async () => {
      mockCommentsRepository.addComment.mockResolvedValueOnce(baseComment);
      mockCommentsRepository.findPostBasic.mockResolvedValueOnce({
        id: 'post-100',
        authorId: 'usr-post-author',
        author: { username: 'post_author' },
      });
      mockCommentsRepository.findUserBasic
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
      mockCommentsRepository.findMentionedUsers.mockResolvedValueOnce([
        { id: 'usr-alice', username: 'alice_dev' },
      ]);

      const result = await service.addComment('post-100', 'usr-commenter', {
        text: 'Check @..alice_dev.. on this!',
        replyToUserId: 'usr-reply-user',
      });

      expect(mockCommentsRepository.addComment).toHaveBeenCalled();
      expect(result.id).toBe('comment-1');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
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
