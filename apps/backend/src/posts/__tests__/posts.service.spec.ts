import { ForbiddenException, GoneException, NotFoundException } from '@nestjs/common';
import { ReportCategory } from '@prisma/client';
import { MediaType } from '@common/contracts';
import { PostsService } from '../posts.service';
import type { PostsMediaService } from '../posts-media.service';
import type { RedisService } from '../../redis/redis.service';
import type { MessengerGateway } from '../../messenger/gateway/messenger.gateway';

describe('PostsService', () => {
  let service: PostsService;
  let mockPostsRepository: {
    getAllPosts: jest.Mock;
    getPostById: jest.Mock;
    createPost: jest.Mock;
    searchPosts: jest.Mock;
    getExploreMediaPosts: jest.Mock;
    getPostsByHashtag: jest.Mock;
    editPost: jest.Mock;
    deletePost: jest.Mock;
    savePost: jest.Mock;
    unsavePost: jest.Mock;
    getSavedPostsByUserId: jest.Mock;
    repost: jest.Mock;
    unrepost: jest.Mock;
    getPostsByUserId: jest.Mock;
    getRepostsByUserId: jest.Mock;
    reportPost: jest.Mock;
    incrementShareCount: jest.Mock;
    incrementManyShareCounts: jest.Mock;
    createPollForPost: jest.Mock;
    findMentionUsers: jest.Mock;
    findUserBasic: jest.Mock;
    getPollForVote: jest.Mock;
    updateVote: jest.Mock;
    createVote: jest.Mock;
    getPollVoters: jest.Mock;
  };
  let mockMediaService: {
    processUploadedFiles: jest.Mock;
    uploadChunk: jest.Mock;
    getChunkStatus: jest.Mock;
  };
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    delByPattern: jest.Mock;
    getOrSet: jest.Mock;
    withLock?: jest.Mock;
  };
  let mockGateway: {
    emitToUser: jest.Mock;
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const basePost = {
    id: 'post-100',
    content: 'Check this out @sam_dev #coding',
    sharesCount: 1,
    authorId: 'usr-author-1',
    createdAt: sampleDate,
    updatedAt: sampleDate,
    media: [],
    poll: null,
    author: {
      id: 'usr-author-1',
      username: 'author_one',
      displayName: 'Author One',
      avatar: null,
      isVerified: true,
      primaryBadge: null,
    },
    isFollowing: false,
    isSaved: false,
    isReposted: false,
    isLiked: false,
    isOwner: false,
    _count: { likes: 0, reposts: 0, comments: 0 },
  };

  beforeEach(() => {
    mockPostsRepository = {
      getAllPosts: jest.fn().mockResolvedValue([]),
      getPostById: jest.fn(),
      createPost: jest.fn(),
      searchPosts: jest.fn().mockResolvedValue([]),
      getExploreMediaPosts: jest.fn().mockResolvedValue([]),
      getPostsByHashtag: jest.fn().mockResolvedValue({ posts: [], totalCount: 0 }),
      editPost: jest.fn(),
      deletePost: jest.fn(),
      savePost: jest.fn().mockResolvedValue(undefined),
      unsavePost: jest.fn().mockResolvedValue(undefined),
      getSavedPostsByUserId: jest.fn().mockResolvedValue([]),
      repost: jest.fn().mockResolvedValue(undefined),
      unrepost: jest.fn().mockResolvedValue(undefined),
      getPostsByUserId: jest.fn().mockResolvedValue([]),
      getRepostsByUserId: jest.fn().mockResolvedValue([]),
      reportPost: jest.fn().mockResolvedValue({ id: 'rep-1' }),
      incrementShareCount: jest.fn().mockResolvedValue(undefined),
      incrementManyShareCounts: jest.fn().mockResolvedValue(undefined),
      createPollForPost: jest.fn().mockResolvedValue(undefined),
      findMentionUsers: jest.fn().mockResolvedValue([]),
      findUserBasic: jest.fn().mockResolvedValue(null),
      getPollForVote: jest.fn().mockResolvedValue(null),
      updateVote: jest.fn().mockResolvedValue(undefined),
      createVote: jest.fn().mockResolvedValue(undefined),
      getPollVoters: jest.fn().mockResolvedValue(null),
    };

    mockMediaService = {
      processUploadedFiles: jest.fn().mockResolvedValue([]),
      uploadChunk: jest.fn().mockResolvedValue({ complete: true }),
      getChunkStatus: jest.fn().mockReturnValue({ uploadedChunks: [0], totalChunks: 1 }),
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      delByPattern: jest.fn().mockResolvedValue(1),
      withLock: jest.fn((_k: string, action: () => unknown) => action()),
      getOrSet: jest
        .fn()
        .mockImplementation((_key: string, _ttl: number, factory: () => unknown) => factory()),
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    service = new PostsService(
      mockPostsRepository,
      mockMediaService as unknown as PostsMediaService,
      mockRedis as unknown as RedisService,
      mockGateway as unknown as MessengerGateway,
    );
  });

  describe('getAllPosts & getPostById', () => {
    it('getAllPosts fetches from repository and paginates', async () => {
      mockPostsRepository.getAllPosts.mockResolvedValueOnce([basePost]);

      const result = await service.getAllPosts(10, undefined, 'usr-viewer');

      expect(mockPostsRepository.getAllPosts).toHaveBeenCalledWith(10, undefined, 'usr-viewer');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('post-100');
    });

    it('getPostById throws NotFoundException when post does not exist', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(null);

      await expect(service.getPostById('missing-post', 'usr-viewer')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getPostById returns mapped post when found', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);

      const post = await service.getPostById('post-100', 'usr-viewer');
      expect(post.id).toBe('post-100');
      expect(post.handle).toBe('author_one');
      expect(post.author).toBe('Author One');
    });
  });

  describe('createPost', () => {
    it('creates post with media, poll and notifies mentioned users', async () => {
      mockPostsRepository.createPost.mockResolvedValueOnce({
        ...basePost,
        id: 'post-new-1',
      });
      mockPostsRepository.findMentionUsers.mockResolvedValueOnce([
        { id: 'usr-sam', username: 'sam_dev' },
      ]);
      mockPostsRepository.findUserBasic.mockResolvedValueOnce({
        id: 'usr-author-1',
        username: 'author_one',
        displayName: 'Author One',
        avatar: null,
      });

      const dto = {
        content: 'Check this out @sam_dev #coding',
        media: [{ type: MediaType.IMAGE, url: 'https://cdn.com/img.png', order: 0 }],
        gifUrls: ['https://cdn.com/a.gif'],
        poll: ['Option A', 'Option B'],
      };

      const result = await service.createPost(dto, 'usr-author-1');

      expect(mockPostsRepository.createPost).toHaveBeenCalledTimes(1);
      expect(mockPostsRepository.createPollForPost).toHaveBeenCalledTimes(1);
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'usr-sam',
        'socialNotification',
        expect.objectContaining({
          type: 'MENTION',
          postId: 'post-new-1',
        }),
      );
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('posts:feed:*');
      expect(result.id).toBe('post-new-1');
    });
  });

  describe('editPost & deletePost', () => {
    it('editPost throws ForbiddenException if user is not post author', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);

      await expect(
        service.editPost('post-100', { content: 'New content' }, 'other-user'),
      ).rejects.toThrow(new ForbiddenException('You can only edit your own posts'));
    });

    it('editPost updates post and invalidates cache when user is author', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);
      mockPostsRepository.editPost.mockResolvedValueOnce({
        ...basePost,
        content: 'Updated content',
      });

      const result = await service.editPost(
        'post-100',
        { content: 'Updated content' },
        'usr-author-1',
      );

      expect(mockPostsRepository.editPost).toHaveBeenCalledWith('post-100', {
        content: 'Updated content',
      });
      expect(mockRedis.del).toHaveBeenCalledWith('posts:post-100');
      expect(result.content).toBe('Updated content');
    });

    it('deletePost throws ForbiddenException if user is not author', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);

      await expect(service.deletePost('post-100', 'other-user')).rejects.toThrow(
        new ForbiddenException('You can only delete your own posts'),
      );
    });

    it('deletePost deletes post and clears cache when user is author', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);
      mockPostsRepository.deletePost.mockResolvedValueOnce(basePost);

      const result = await service.deletePost('post-100', 'usr-author-1');

      expect(mockPostsRepository.deletePost).toHaveBeenCalledWith('post-100');
      expect(mockRedis.del).toHaveBeenCalledWith('posts:post-100');
      expect(result.id).toBe('post-100');
    });
  });

  describe('savePost, unsavePost, getSavedPosts', () => {
    it('savePost and unsavePost delegate to repository and clear cache', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);

      expect(await service.savePost('post-100', 'usr-1')).toEqual({ success: true });
      expect(mockPostsRepository.savePost).toHaveBeenCalledWith('post-100', 'usr-1');

      expect(await service.unsavePost('post-100', 'usr-1')).toEqual({ success: true });
      expect(mockPostsRepository.unsavePost).toHaveBeenCalledWith('post-100', 'usr-1');
    });

    it('getSavedPosts paginates saved posts', async () => {
      mockPostsRepository.getSavedPostsByUserId.mockResolvedValueOnce([basePost]);

      const result = await service.getSavedPosts('usr-1', 10);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('repost & unrepost', () => {
    it('repost delegates to repository, invalidates cache and emits notification', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce(basePost);
      mockPostsRepository.findUserBasic
        .mockResolvedValueOnce({ id: 'usr-reposter', username: 'reposter_user' })
        .mockResolvedValueOnce({ username: 'author_one' });

      const result = await service.repost('post-100', 'usr-reposter');

      expect(mockPostsRepository.repost).toHaveBeenCalledWith('post-100', 'usr-reposter');
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'usr-author-1',
        'socialNotification',
        expect.objectContaining({ type: 'REPOST' }),
      );
      expect(result).toEqual({ success: true });
    });

    it('unrepost delegates to repository and invalidates cache', async () => {
      const result = await service.unrepost('post-100', 'usr-reposter');
      expect(mockPostsRepository.unrepost).toHaveBeenCalledWith('post-100', 'usr-reposter');
      expect(result).toEqual({ success: true });
    });
  });

  describe('votePoll', () => {
    it('throws NotFoundException if poll does not exist', async () => {
      mockPostsRepository.getPollForVote.mockResolvedValueOnce(null);

      await expect(service.votePoll('post-missing', 'opt-1', 'usr-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws GoneException if poll is no longer active', async () => {
      mockPostsRepository.getPollForVote.mockResolvedValueOnce({
        isActive: false,
        options: [{ id: 'opt-1' }],
        votes: [],
      });

      await expect(service.votePoll('post-100', 'opt-1', 'usr-1')).rejects.toThrow(GoneException);
    });

    it('throws NotFoundException if chosen option is not in poll', async () => {
      mockPostsRepository.getPollForVote.mockResolvedValueOnce({
        isActive: true,
        options: [{ id: 'opt-1' }],
        votes: [],
      });

      await expect(service.votePoll('post-100', 'opt-nonexistent', 'usr-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('records first-time vote and allows changing existing vote', async () => {
      mockPostsRepository.getPollForVote.mockResolvedValue({
        id: 'poll-1',
        postId: 'post-100',
        isActive: true,
        options: [{ id: 'opt-1' }, { id: 'opt-2' }],
        votes: [],
      });

      // 1. First time vote
      const vote1 = await service.votePoll('post-100', 'opt-1', 'usr-1');
      expect(vote1.success).toBe(true);
      expect(mockPostsRepository.createVote).toHaveBeenCalled();

      // 2. Change vote from opt-1 to opt-2
      mockPostsRepository.getPollForVote.mockResolvedValueOnce({
        id: 'poll-1',
        postId: 'post-100',
        isActive: true,
        options: [{ id: 'opt-1' }, { id: 'opt-2' }],
        votes: [{ id: 'vote-1', userId: 'usr-1', optionId: 'opt-1' }],
      });

      const vote2 = await service.votePoll('post-100', 'opt-2', 'usr-1');
      expect(vote2.success).toBe(true);

      // 3. Voting same option returns without transaction
      mockPostsRepository.getPollForVote.mockResolvedValueOnce({
        id: 'poll-1',
        postId: 'post-100',
        isActive: true,
        options: [{ id: 'opt-1' }, { id: 'opt-2' }],
        votes: [{ id: 'vote-1', userId: 'usr-1', optionId: 'opt-1' }],
      });

      const voteSame = await service.votePoll('post-100', 'opt-1', 'usr-1');
      expect(voteSame.success).toBe(true);
    });

    it('getPollVoters returns grouped options with voter details', async () => {
      mockPostsRepository.getPollVoters.mockResolvedValueOnce({
        options: [{ id: 'opt-1' }, { id: 'opt-2' }],
        votes: [
          {
            optionId: 'opt-1',
            user: { id: 'u-1', username: 'ayate', displayName: 'Ayate', avatar: null },
          },
        ],
      });

      const voters = await service.getPollVoters('post-100', 'usr-1');
      expect(voters).toHaveLength(2);
      expect(voters[0].optionId).toBe('opt-1');
      expect(voters[0].voters).toHaveLength(1);
      expect(voters[0].voters[0].username).toBe('ayate');
      expect(voters[1].voters).toHaveLength(0);
    });

    it('getPollVoters throws NotFoundException when poll does not exist', async () => {
      mockPostsRepository.getPollVoters.mockResolvedValueOnce(null);
      await expect(service.getPollVoters('post-none', 'usr-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('user posts, reposts, reports, and chunked uploads', () => {
    it('getUserPosts sorts pinned post to front', async () => {
      mockRedis.get.mockResolvedValueOnce('post-2');
      mockPostsRepository.getPostsByUserId.mockResolvedValueOnce([
        { ...basePost, id: 'post-1' },
        { ...basePost, id: 'post-2' },
      ]);

      const res = await service.getUserPosts('usr-author-1', 10);
      expect(res.data[0].id).toBe('post-2');
      expect(res.data[0].isPinned).toBe(true);
    });

    it('getUserReposts and reportPost delegate correctly', async () => {
      mockPostsRepository.getRepostsByUserId.mockResolvedValueOnce([basePost]);
      const reposts = await service.getUserReposts('usr-1', 10);
      expect(reposts.data).toHaveLength(1);

      mockPostsRepository.reportPost.mockResolvedValueOnce({ id: 'rep-1' });
      const rep = await service.reportPost('post-100', 'usr-1', ReportCategory.SPAM, 'Spam post');
      expect(rep.status).toBe('queued');
    });

    it('uploadChunk and getChunkStatus delegate to mediaService', async () => {
      mockMediaService.uploadChunk.mockResolvedValueOnce({ complete: true });
      mockMediaService.getChunkStatus.mockReturnValueOnce({ uploadedChunks: [0], totalChunks: 1 });

      const chunkRes = await service.uploadChunk('up-1', 0, 1, {} as Express.Multer.File);
      expect(chunkRes.complete).toBe(true);

      const statusRes = service.getChunkStatus('up-1');
      expect(statusRes.totalChunks).toBe(1);
    });
  });

  describe('pinPost, unpinPost, sharePost & getPostOgHtml', () => {
    it('pinPost and unpinPost enforce author permissions', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce({
        ...basePost,
        id: 'post-100',
        authorId: 'usr-author-1',
      });
      await expect(service.pinPost('post-100', 'other-user')).rejects.toThrow(ForbiddenException);

      mockPostsRepository.getPostById.mockResolvedValueOnce({
        ...basePost,
        id: 'post-100',
        authorId: 'usr-author-1',
      });
      await expect(service.unpinPost('post-100', 'other-user')).rejects.toThrow(ForbiddenException);
    });

    it('pinPost sets user pinned post and marks isPinned true', async () => {
      mockPostsRepository.getPostById.mockResolvedValue({
        ...basePost,
        id: 'post-100',
        authorId: 'usr-author-1',
      });

      const result = await service.pinPost('post-100', 'usr-author-1');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'user:pinned_post:usr-author-1',
        'post-100',
        expect.any(Number),
      );
      expect(result.isPinned).toBe(true);
    });

    it('unpinPost removes user pinned post if matching', async () => {
      mockPostsRepository.getPostById.mockResolvedValue({
        ...basePost,
        id: 'post-100',
        authorId: 'usr-author-1',
      });
      mockRedis.get.mockResolvedValueOnce('post-100');

      const result = await service.unpinPost('post-100', 'usr-author-1');
      expect(mockRedis.del).toHaveBeenCalledWith('user:pinned_post:usr-author-1');
      expect(result.isPinned).toBe(false);
    });

    it('sharePost handles unique tracking per user and increments count', async () => {
      mockRedis.get.mockResolvedValueOnce(null); // not shared yet
      const res = await service.sharePost('post-100', 'usr-1');
      expect(mockPostsRepository.incrementShareCount).toHaveBeenCalledWith('post-100');
      expect(res.incremented).toBe(true);

      mockRedis.get.mockResolvedValueOnce('1'); // already shared
      const res2 = await service.sharePost('post-100', 'usr-1');
      expect(res2.incremented).toBe(false);
    });

    it('getPostOgHtml returns HTML with metadata and handles not found', async () => {
      mockPostsRepository.getPostById.mockResolvedValueOnce({
        ...basePost,
        content: 'Check out this awesome post!',
      });

      const html = await service.getPostOgHtml('post-100');
      expect(html).toContain('<meta property="og:site_name" content="Eternal Social Network" />');
      expect(html).toContain('Check out this awesome post!');

      mockPostsRepository.getPostById.mockResolvedValueOnce(null);
      const notFoundHtml = await service.getPostOgHtml('missing-post');
      expect(notFoundHtml).toContain('Post not found');
    });
  });
});
