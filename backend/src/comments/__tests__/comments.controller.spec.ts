import { CommentsController } from '../comments.controller';
import type { CommentsService } from '../comments.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('CommentsController', () => {
  let controller: CommentsController;
  let mockCommentsService: {
    addComment: jest.Mock;
    getComments: jest.Mock;
    deleteComment: jest.Mock;
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
      deleteComment: jest.fn(),
    };

    controller = new CommentsController(mockCommentsService as unknown as CommentsService);
  });

  it('addComment delegates to CommentsService', async () => {
    const dto = { text: 'Nice post!' };
    mockCommentsService.addComment.mockResolvedValueOnce({ id: 'com-1', text: 'Nice post!' });

    const result = await controller.addComment('post-1', mockUser, dto);

    expect(mockCommentsService.addComment).toHaveBeenCalledWith('post-1', 'usr-1', dto);
    expect(result.id).toBe('com-1');
  });

  it('getComments delegates to CommentsService', async () => {
    mockCommentsService.getComments.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getComments('post-1', { limit: 10, after: 'cur-1' });

    expect(mockCommentsService.getComments).toHaveBeenCalledWith('post-1', 10, 'cur-1');
  });

  it('deleteComment delegates to CommentsService', async () => {
    mockCommentsService.deleteComment.mockResolvedValueOnce({ id: 'com-1' });

    await controller.deleteComment('com-1', mockUser);

    expect(mockCommentsService.deleteComment).toHaveBeenCalledWith('com-1', 'usr-1');
  });
});
