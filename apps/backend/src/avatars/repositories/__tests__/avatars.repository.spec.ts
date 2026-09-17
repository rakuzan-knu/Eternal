import type { PrismaService } from '@common/prisma';
import { PrismaAvatarRepository } from '../avatars.repository';

describe('PrismaAvatarRepository', () => {
  let repository: PrismaAvatarRepository;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new PrismaAvatarRepository(mockPrisma as unknown as PrismaService);
  });

  it('findById selects user avatar', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: 'usr-1',
      avatar: 'https://cdn.com/a.jpg',
    });

    const result = await repository.findById('usr-1');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      select: { id: true, avatar: true },
    });
    expect(result?.avatar).toBe('https://cdn.com/a.jpg');
  });

  it('updateAvatar updates user avatar in database', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 'usr-1',
      avatar: 'https://cdn.com/new.jpg',
    });

    const result = await repository.updateAvatar('usr-1', 'https://cdn.com/new.jpg');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      data: { avatar: 'https://cdn.com/new.jpg' },
      select: { id: true, avatar: true },
    });
    expect(result.avatar).toBe('https://cdn.com/new.jpg');
  });
});
