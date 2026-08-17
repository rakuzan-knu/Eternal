import { LikesController } from '../likes.controller';
import type { LikesService } from '../likes.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('LikesController', () => {
  let controller: LikesController;
  let mockLikesService: {
    likePost: jest.Mock;
    unlikePost: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'test@example.com',
    username: 'test_user',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockLikesService = {
      likePost: jest.fn(),
      unlikePost: jest.fn(),
    };

    controller = new LikesController(mockLikesService as unknown as LikesService);
  });

  it('addLike delegates to LikesService', async () => {
    mockLikesService.likePost.mockResolvedValueOnce({ id: 'like-1' });

    const result = await controller.addLike('post-100', mockUser);

    expect(mockLikesService.likePost).toHaveBeenCalledWith('post-100', 'usr-1');
    expect(result).toEqual({ id: 'like-1' });
  });

  it('unLike delegates to LikesService', async () => {
    mockLikesService.unlikePost.mockResolvedValueOnce(undefined);

    await controller.unLike('post-100', mockUser);

    expect(mockLikesService.unlikePost).toHaveBeenCalledWith('post-100', 'usr-1');
  });
});
