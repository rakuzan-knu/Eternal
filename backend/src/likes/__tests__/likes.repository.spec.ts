import type { PrismaService } from '@common/prisma';
import { LikesRepository } from '../likes.repository';

describe('LikesRepository', () => {
  let repository: LikesRepository;
  let mockPrisma: {
    like: {
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      like: {
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new LikesRepository(mockPrisma as unknown as PrismaService);
  });

  it('createLike creates like record in database', async () => {
    const mockLike = { id: 'like-1', postId: 'post-1', userId: 'usr-1', createdAt: new Date() };
    mockPrisma.like.create.mockResolvedValueOnce(mockLike);

    const result = await repository.createLike('post-1', 'usr-1');

    expect(mockPrisma.like.create).toHaveBeenCalledWith({
      data: { postId: 'post-1', userId: 'usr-1' },
    });
    expect(result).toEqual(mockLike);
  });

  it('deleteLike removes like record by composite postId_userId', async () => {
    mockPrisma.like.delete.mockResolvedValueOnce({});

    await repository.deleteLike('post-1', 'usr-1');

    expect(mockPrisma.like.delete).toHaveBeenCalledWith({
      where: { postId_userId: { postId: 'post-1', userId: 'usr-1' } },
    });
  });
});
