import { LIKES_REPOSITORY, type ILikesRepository } from '../likes-repository.interface';
import type { Like } from '@prisma/client';

describe('likes-repository.interface', () => {
  it('defines LIKES_REPOSITORY symbol token', () => {
    expect(typeof LIKES_REPOSITORY).toBe('symbol');
    expect(LIKES_REPOSITORY.toString()).toBe('Symbol(LIKES_REPOSITORY)');
  });

  it('implements ILikesRepository interface methods', async () => {
    const mockLike: Like = {
      id: 'like-1',
      postId: 'post-1',
      userId: 'usr-1',
      createdAt: new Date(),
    };

    const deleteMock = jest.fn().mockResolvedValue(undefined);
    const mockRepo: ILikesRepository = {
      createLike: jest.fn().mockResolvedValue(mockLike),
      deleteLike: deleteMock,
    };

    expect(await mockRepo.createLike('post-1', 'usr-1')).toEqual(mockLike);
    await mockRepo.deleteLike('post-1', 'usr-1');
    expect(deleteMock).toHaveBeenCalledWith('post-1', 'usr-1');
  });
});
