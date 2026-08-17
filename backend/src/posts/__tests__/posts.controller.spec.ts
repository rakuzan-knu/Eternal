import { ReportCategory } from '@prisma/client';
import { PostsController } from '../posts.controller';
import type { PostsService } from '../posts.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('PostsController', () => {
  let controller: PostsController;
  let mockPostsService: {
    getAllPosts: jest.Mock;
    getExplorePosts: jest.Mock;
    getPostsByHashtag: jest.Mock;
    searchPosts: jest.Mock;
    getPostById: jest.Mock;
    createPost: jest.Mock;
    editPost: jest.Mock;
    deletePost: jest.Mock;
    savePost: jest.Mock;
    unsavePost: jest.Mock;
    getSavedPosts: jest.Mock;
    repost: jest.Mock;
    unrepost: jest.Mock;
    getUserPosts: jest.Mock;
    getUserReposts: jest.Mock;
    reportPost: jest.Mock;
    sharePost: jest.Mock;
    votePoll: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'test@example.com',
    username: 'test_user',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockPostsService = {
      getAllPosts: jest.fn(),
      getExplorePosts: jest.fn(),
      getPostsByHashtag: jest.fn(),
      searchPosts: jest.fn(),
      getPostById: jest.fn(),
      createPost: jest.fn(),
      editPost: jest.fn(),
      deletePost: jest.fn(),
      savePost: jest.fn(),
      unsavePost: jest.fn(),
      getSavedPosts: jest.fn(),
      repost: jest.fn(),
      unrepost: jest.fn(),
      getUserPosts: jest.fn(),
      getUserReposts: jest.fn(),
      reportPost: jest.fn(),
      sharePost: jest.fn(),
      votePoll: jest.fn(),
    };

    controller = new PostsController(mockPostsService as unknown as PostsService);
  });

  it('getAllPosts delegates query to PostsService', async () => {
    mockPostsService.getAllPosts.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getAllPosts({ limit: 20, after: 'cur-1' }, mockUser);
    expect(mockPostsService.getAllPosts).toHaveBeenCalledWith(20, 'cur-1', 'usr-1');
  });

  it('getExplorePosts delegates to PostsService', async () => {
    mockPostsService.getExplorePosts.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getExplorePosts({ limit: 15 }, mockUser);
    expect(mockPostsService.getExplorePosts).toHaveBeenCalledWith(15, undefined, 'usr-1');
  });

  it('getPostsByHashtag delegates to PostsService', async () => {
    mockPostsService.getPostsByHashtag.mockResolvedValueOnce({
      data: [],
      totalCount: 0,
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getPostsByHashtag('coding', { limit: 10 }, mockUser);
    expect(mockPostsService.getPostsByHashtag).toHaveBeenCalledWith(
      'coding',
      10,
      undefined,
      'usr-1',
    );
  });

  it('searchPosts delegates to PostsService', async () => {
    mockPostsService.searchPosts.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.searchPosts({ q: 'typescript', limit: 10, mediaOnly: true }, mockUser);
    expect(mockPostsService.searchPosts).toHaveBeenCalledWith(
      'typescript',
      10,
      undefined,
      'usr-1',
      true,
    );
  });

  it('createPost delegates to PostsService with current user and multer files', async () => {
    const createDto = { content: 'Hello' };
    const mockFiles = [{ buffer: Buffer.from('abc') }] as Express.Multer.File[];
    mockPostsService.createPost.mockResolvedValueOnce({ id: 'post-new' });

    const result = await controller.createPost(createDto, mockUser, mockFiles);

    expect(mockPostsService.createPost).toHaveBeenCalledWith(createDto, 'usr-1', mockFiles);
    expect(result.id).toBe('post-new');
  });

  it('editPost delegates to PostsService', async () => {
    const editDto = { content: 'Updated content' };
    mockPostsService.editPost.mockResolvedValueOnce({ id: 'post-1', content: 'Updated content' });

    const result = await controller.editPost('post-1', editDto, mockUser);
    expect(mockPostsService.editPost).toHaveBeenCalledWith('post-1', editDto, 'usr-1');
    expect(result.content).toBe('Updated content');
  });

  it('deletePost delegates to PostsService', async () => {
    mockPostsService.deletePost.mockResolvedValueOnce({ id: 'post-1' });

    const result = await controller.deletePost('post-1', mockUser);
    expect(mockPostsService.deletePost).toHaveBeenCalledWith('post-1', 'usr-1');
    expect(result.id).toBe('post-1');
  });

  it('savePost and unsavePost delegate to PostsService', async () => {
    mockPostsService.savePost.mockResolvedValueOnce({ success: true });
    mockPostsService.unsavePost.mockResolvedValueOnce({ success: true });

    await controller.savePost('post-1', mockUser);
    expect(mockPostsService.savePost).toHaveBeenCalledWith('post-1', 'usr-1');

    await controller.unsavePost('post-1', mockUser);
    expect(mockPostsService.unsavePost).toHaveBeenCalledWith('post-1', 'usr-1');
  });

  it('repost and unrepost delegate to PostsService', async () => {
    mockPostsService.repost.mockResolvedValueOnce({ success: true });
    mockPostsService.unrepost.mockResolvedValueOnce({ success: true });

    await controller.repost('post-1', mockUser);
    expect(mockPostsService.repost).toHaveBeenCalledWith('post-1', 'usr-1');

    await controller.unrepost('post-1', mockUser);
    expect(mockPostsService.unrepost).toHaveBeenCalledWith('post-1', 'usr-1');
  });

  it('reportPost, sharePost, votePoll delegate to PostsService', async () => {
    mockPostsService.reportPost.mockResolvedValueOnce({ id: 'rep-1', status: 'queued' });
    mockPostsService.sharePost.mockResolvedValueOnce({ success: true });
    mockPostsService.votePoll.mockResolvedValueOnce({ success: true, poll: {} });

    await controller.reportPost(
      'post-1',
      { category: ReportCategory.SPAM, details: 'spam' },
      mockUser,
    );
    expect(mockPostsService.reportPost).toHaveBeenCalledWith(
      'post-1',
      'usr-1',
      ReportCategory.SPAM,
      'spam',
    );

    await controller.sharePost('post-1');
    expect(mockPostsService.sharePost).toHaveBeenCalledWith('post-1');

    await controller.votePoll('post-1', 'opt-1', mockUser);
    expect(mockPostsService.votePoll).toHaveBeenCalledWith('post-1', 'opt-1', 'usr-1');
  });
});
