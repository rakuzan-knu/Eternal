import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LikesService } from '../likes.service';
import type { IPostRepository } from '../../posts/interfaces/posts-repository.interface';
import type { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import type { EventEmitter2 } from '@nestjs/event-emitter';

describe('LikesService', () => {
  let service: LikesService;
  let mockLikesRepository: {
    createLike: jest.Mock;
    deleteLike: jest.Mock;
  };
  let mockPostsRepository: {
    getPostById: jest.Mock;
    findUserBasic: jest.Mock;
  };
  let mockGateway: {
    emitToUser: jest.Mock;
  };
  let mockEventEmitter: {
    emit: jest.Mock;
  };

  beforeEach(() => {
    mockLikesRepository = {
      createLike: jest.fn(),
      deleteLike: jest.fn(),
    };

    mockPostsRepository = {
      getPostById: jest.fn(),
      findUserBasic: jest.fn().mockResolvedValue({
        id: 'usr-liker',
        username: 'liker',
        displayName: 'Liker',
        avatar: null,
      }),
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    service = new LikesService(
      mockLikesRepository,
      mockPostsRepository as unknown as IPostRepository,
      mockGateway as unknown as MessengerGateway,
      mockEventEmitter as unknown as EventEmitter2,
    );
  });

  describe('likePost', () => {
    it('throws NotFoundException if post is missing', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(null);

      await expect(service.likePost('missing-post', 'usr-1')).rejects.toThrow(
        new NotFoundException('Post not found'),
      );
    });

    it('creates like, emits event and ws notification to post author', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce({
        id: 'post-1',
        authorId: 'usr-author',
      });
      const mockLike = { id: 'like-1', postId: 'post-1', userId: 'usr-liker' };
      mockLikesRepository.createLike.mockResolvedValueOnce(mockLike);
      mockPostsRepository.findUserBasic
        .mockResolvedValueOnce({
          id: 'usr-liker',
          username: 'liker',
          displayName: 'Liker',
          avatar: null,
        })
        .mockResolvedValueOnce({ username: 'author' });

      const result = await service.likePost('post-1', 'usr-liker');

      expect(mockLikesRepository.createLike).toHaveBeenCalledWith('post-1', 'usr-liker');
      expect(mockEventEmitter.emit).toHaveBeenCalled();
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'usr-author',
        'socialNotification',
        expect.objectContaining({ type: 'LIKE' }),
      );
      expect(result).toEqual(mockLike);
    });

    it('throws ConflictException on Prisma P2002 error and rethrows generic errors', async () => {
      mockPostsRepository.getPostById.mockResolvedValue({
        id: 'post-1',
        authorId: 'usr-author',
      });
      mockLikesRepository.createLike.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Duplicate like', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.likePost('post-1', 'usr-liker')).rejects.toThrow(
        new ConflictException('Post already liked'),
      );

      mockLikesRepository.createLike.mockRejectedValueOnce(new Error('DB failure'));
      await expect(service.likePost('post-1', 'usr-liker')).rejects.toThrow('DB failure');
    });
  });

  describe('unlikePost', () => {
    it('deletes like successfully', async () => {
      mockLikesRepository.deleteLike.mockResolvedValueOnce(undefined);

      await service.unlikePost('post-1', 'usr-1');

      expect(mockLikesRepository.deleteLike).toHaveBeenCalledWith('post-1', 'usr-1');
    });

    it('throws NotFoundException on Prisma P2025 error and rethrows generic errors', async () => {
      mockLikesRepository.deleteLike.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('Like not found', {
          code: 'P2025',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.unlikePost('post-1', 'usr-1')).rejects.toThrow(
        new NotFoundException('Like not found'),
      );

      mockLikesRepository.deleteLike.mockRejectedValueOnce(new Error('DB failure'));
      await expect(service.unlikePost('post-1', 'usr-1')).rejects.toThrow('DB failure');
    });
  });
});
