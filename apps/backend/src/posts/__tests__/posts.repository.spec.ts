import { NotFoundException } from '@nestjs/common';
import { MediaType, ReportCategory } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import { PostsRepository } from '../posts.repository';

describe('PostsRepository', () => {
  let repository: PostsRepository;
  let mockPrisma: {
    post: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    userBlock: {
      findMany: jest.Mock;
    };
    savedPost: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    repost: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    report: {
      create: jest.Mock;
    };
    outboxEvent: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const basePrismaPost = {
    id: 'post-100',
    content: 'Hello world #coding',
    sharesCount: 5,
    authorId: 'usr-author-1',
    createdAt: sampleDate,
    updatedAt: sampleDate,
    media: [{ id: 'media-1', type: MediaType.IMAGE, url: 'https://img.com/pic.png', order: 0 }],
    poll: null,
    author: {
      id: 'usr-author-1',
      username: 'author_one',
      displayName: 'Author One',
      avatar: null,
      isVerified: true,
      primaryBadge: null,
      followers: [{ id: 'follow-1' }],
    },
    savedPosts: [{ id: 'saved-1' }],
    reposts: [{ id: 'repost-1' }],
    likes: [{ id: 'like-1' }],
    _count: { likes: 10, reposts: 3, comments: 2 },
  };

  beforeEach(() => {
    mockPrisma = {
      post: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      userBlock: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      savedPost: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      repost: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      report: {
        create: jest.fn(),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
        typeof fn === 'function' ? fn(mockPrisma) : Promise.all(fn as unknown[]),
      ),
    };

    repository = new PostsRepository(mockPrisma as unknown as PrismaService);
  });

  describe('createPost & mapPost', () => {
    it('creates post and maps relations correctly', async () => {
      mockPrisma.post.create.mockResolvedValueOnce(basePrismaPost);

      const created = await repository.createPost({
        content: 'Hello world #coding',
        author: { connect: { id: 'usr-author-1' } },
      });

      expect(created.id).toBe('post-100');
      expect(created.content).toBe('Hello world #coding');
      expect(created.author?.username).toBe('author_one');
      expect(created.media).toHaveLength(1);
    });
  });

  describe('incrementShareCount', () => {
    it('increments share count in database', async () => {
      mockPrisma.post.update.mockResolvedValueOnce({ id: 'post-100', sharesCount: 6 });

      await repository.incrementShareCount('post-100');

      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-100' },
        data: { sharesCount: { increment: 1 } },
      });
    });
  });

  describe('getAllPosts & getPostById', () => {
    it('getAllPosts filters out blocked user IDs and maps results', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValueOnce([
        { blockerId: 'usr-viewer', blockedId: 'usr-blocked-1' },
      ]);
      mockPrisma.post.findMany.mockResolvedValueOnce([basePrismaPost]);

      const posts = await repository.getAllPosts(10, 'cursor-prev', 'usr-viewer');

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: { notIn: ['usr-blocked-1'] } },
          take: 11,
          skip: 1,
          cursor: { id: 'cursor-prev' },
        }),
      );
      expect(posts).toHaveLength(1);
      expect(posts[0].isSaved).toBe(true);
      expect(posts[0].isLiked).toBe(true);
    });

    it('getPostById returns null if post is missing or author is blocked', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValueOnce([
        { blockerId: 'usr-author-1', blockedId: 'usr-viewer' },
      ]);
      mockPrisma.post.findUnique.mockResolvedValueOnce(basePrismaPost);

      const post = await repository.getPostById('post-100', 'usr-viewer');
      expect(post).toBeNull();
    });

    it('getPostById returns mapped post when found and not blocked', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(basePrismaPost);

      const post = await repository.getPostById('post-100', 'usr-author-1');
      expect(post?.id).toBe('post-100');
      expect(post?.isOwner).toBe(true);
    });
  });

  describe('getPostsByUserId, getRepostsByUserId, getSavedPostsByUserId', () => {
    it('getPostsByUserId returns empty array if target user is blocked', async () => {
      mockPrisma.userBlock.findMany.mockResolvedValueOnce([
        { blockerId: 'usr-viewer', blockedId: 'usr-target' },
      ]);

      const posts = await repository.getPostsByUserId('usr-target', 10, undefined, 'usr-viewer');
      expect(posts).toEqual([]);
      expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
    });

    it('getPostsByUserId returns posts when target user is not blocked', async () => {
      mockPrisma.post.findMany.mockResolvedValueOnce([basePrismaPost]);

      const posts = await repository.getPostsByUserId('usr-target', 10, 'cur-1');
      expect(posts).toHaveLength(1);
      expect(mockPrisma.post.findMany).toHaveBeenCalled();
    });

    it('getExploreMediaPosts, getPostsByHashtag, searchPosts work without viewerId', async () => {
      mockPrisma.post.findMany
        .mockResolvedValueOnce([]) // explore media
        .mockResolvedValueOnce([basePrismaPost]) // explore fallback
        .mockResolvedValueOnce([basePrismaPost]) // hashtag
        .mockResolvedValueOnce([basePrismaPost]); // search

      const explore = await repository.getExploreMediaPosts(10);
      expect(explore).toHaveLength(1);

      const hashtag = await repository.getPostsByHashtag('#news', 10);
      expect(hashtag.posts).toHaveLength(1);

      const search = await repository.searchPosts('test', 10);
      expect(search).toHaveLength(1);
    });
  });

  describe('editPost, deletePost, save/unsave, repost/unrepost, reportPost', () => {
    it('editPost updates post content and returns mapped post', async () => {
      mockPrisma.post.update.mockResolvedValueOnce({
        ...basePrismaPost,
        content: 'Updated content',
      });

      const updated = await repository.editPost('post-100', { content: 'Updated content' });
      expect(updated.content).toBe('Updated content');
    });

    it('deletePost deletes post from database', async () => {
      mockPrisma.post.delete.mockResolvedValueOnce(basePrismaPost);
      const deleted = await repository.deletePost('post-100');
      expect(deleted.id).toBe('post-100');
    });

    it('savePost and unsavePost call upsert and deleteMany', async () => {
      await repository.savePost('post-100', 'usr-1');
      expect(mockPrisma.savedPost.upsert).toHaveBeenCalledWith({
        where: { postId_userId: { postId: 'post-100', userId: 'usr-1' } },
        create: { postId: 'post-100', userId: 'usr-1' },
        update: {},
      });

      await repository.unsavePost('post-100', 'usr-1');
      expect(mockPrisma.savedPost.deleteMany).toHaveBeenCalledWith({
        where: { postId: 'post-100', userId: 'usr-1' },
      });
    });

    it('repost and unrepost call upsert and deleteMany', async () => {
      await repository.repost('post-100', 'usr-1');
      expect(mockPrisma.repost.upsert).toHaveBeenCalledWith({
        where: { postId_userId: { postId: 'post-100', userId: 'usr-1' } },
        create: { postId: 'post-100', userId: 'usr-1' },
        update: {},
      });

      await repository.unrepost('post-100', 'usr-1');
      expect(mockPrisma.repost.deleteMany).toHaveBeenCalledWith({
        where: { postId: 'post-100', userId: 'usr-1' },
      });
    });

    it('reportPost throws NotFoundException if post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce(null);

      await expect(
        repository.reportPost('post-missing', 'usr-reporter', ReportCategory.SPAM),
      ).rejects.toThrow(new NotFoundException('Post not found'));
    });

    it('reportPost creates report record when post exists', async () => {
      mockPrisma.post.findUnique.mockResolvedValueOnce({ authorId: 'usr-reported' });
      mockPrisma.report.create.mockResolvedValueOnce({ id: 'report-123' });

      const result = await repository.reportPost(
        'post-100',
        'usr-reporter',
        ReportCategory.SPAM,
        'Spam message',
      );

      expect(mockPrisma.report.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'usr-reporter',
          reportedId: 'usr-reported',
          postId: 'post-100',
          category: ReportCategory.SPAM,
          details: 'Spam message',
        },
        select: { id: true },
      });
      expect(result.id).toBe('report-123');
    });
  });
});
