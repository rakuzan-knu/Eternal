import { CommentsController } from '../comments.controller';
import type { CommentsService } from '../comments.service';
import type { CommentsMediaService } from '../comments-media.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('CommentsController', () => {
  let controller: CommentsController;
  let mockCommentsService: {
    addComment: jest.Mock;
    getComments: jest.Mock;
    getReplies: jest.Mock;
    toggleCommentLike: jest.Mock;
    togglePinComment: jest.Mock;
    deleteComment: jest.Mock;
  };
  let mockMediaService: {
    processCommentImage: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'test@example.com',
    username: 'test_user',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockCommentsService = {
      addComment: jest.fn(),
      getComments: jest.fn(),
      getReplies: jest.fn(),
      toggleCommentLike: jest.fn(),
      togglePinComment: jest.fn(),
      deleteComment: jest.fn(),
    };

    mockMediaService = {
      processCommentImage: jest.fn().mockResolvedValue({ url: 'http://cdn/image.webp' }),
    };

    controller = new CommentsController(
      mockCommentsService as unknown as CommentsService,
      mockMediaService as unknown as CommentsMediaService,
    );
  });

  it('addComment delegates to CommentsService', async () => {
    const dto = { text: 'Nice post!' };
    mockCommentsService.addComment.mockResolvedValueOnce({ id: 'com-1', text: 'Nice post!' });

    const result = await controller.addComment('post-1', mockUser, dto);

    expect(mockCommentsService.addComment).toHaveBeenCalledWith('post-1', 'usr-1', dto);
    expect(result.id).toBe('com-1');
  });

  it('uploadCommentMedia delegates to CommentsMediaService', async () => {
    const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
    const res = await controller.uploadCommentMedia(mockFile);

    expect(mockMediaService.processCommentImage).toHaveBeenCalledWith(mockFile);
    expect(res.url).toBe('http://cdn/image.webp');
  });

  it('getComments delegates to CommentsService with viewerId', async () => {
    mockCommentsService.getComments.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getComments('post-1', { limit: 10, after: 'cur-1' }, mockUser);

    expect(mockCommentsService.getComments).toHaveBeenCalledWith('post-1', 10, 'cur-1', 'usr-1');
  });

  it('getReplies delegates to CommentsService', async () => {
    mockCommentsService.getReplies.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getReplies('com-root', { limit: 10, after: 'cur-1' }, mockUser);

    expect(mockCommentsService.getReplies).toHaveBeenCalledWith('com-root', 10, 'cur-1', 'usr-1');
  });

  it('toggleLike delegates to CommentsService', async () => {
    mockCommentsService.toggleCommentLike.mockResolvedValueOnce({ isLiked: true, likesCount: 1 });

    const result = await controller.toggleLike('com-1', mockUser);

    expect(mockCommentsService.toggleCommentLike).toHaveBeenCalledWith('com-1', 'usr-1');
    expect(result.isLiked).toBe(true);
  });

  it('togglePin delegates to CommentsService', async () => {
    mockCommentsService.togglePinComment.mockResolvedValueOnce({ isPinned: true });

    const result = await controller.togglePin('com-1', mockUser);

    expect(mockCommentsService.togglePinComment).toHaveBeenCalledWith('com-1', 'usr-1');
    expect(result.isPinned).toBe(true);
  });

  it('deleteComment delegates to CommentsService', async () => {
    mockCommentsService.deleteComment.mockResolvedValueOnce({ id: 'com-1' });

    await controller.deleteComment('com-1', mockUser);

    expect(mockCommentsService.deleteComment).toHaveBeenCalledWith('com-1', 'usr-1');
  });
});
