import { CreateUserDto } from '@common/contracts';
import type { PrismaService } from '@common/prisma';
import { UsersRepository } from '../users.repository';

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    userBlock: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    follow: {
      deleteMany: jest.Mock;
    };
    post: {
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userBlock: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      follow: {
        deleteMany: jest.fn(),
      },
      post: {
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    repository = new UsersRepository(mockPrisma as unknown as PrismaService);
  });

  it('findByEmail queries user by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-1', email: 'test@example.com' });
    const user = await repository.findByEmail('test@example.com');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(user?.id).toBe('usr-1');
  });

  it('findByUsername queries user by username', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-2', username: 'alex' });
    const user = await repository.findByUsername('alex');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'alex' } });
    expect(user?.username).toBe('alex');
  });

  it('findById queries user by id', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'usr-3' });
    const user = await repository.findById('usr-3');

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'usr-3' } });
    expect(user?.id).toBe('usr-3');
  });

  it('create inserts new user with CreateUserDto', async () => {
    const dto = new CreateUserDto({
      email: 'new@example.com',
      username: 'new_user',
      passwordHash: 'argon2-hash',
      displayName: 'New Display Name',
      birthDate: new Date('2000-01-01'),
    });

    mockPrisma.user.create.mockResolvedValueOnce({
      id: 'usr-new',
      email: dto.email,
      username: dto.username,
      displayName: dto.displayName,
      passwordHash: dto.passwordHash,
      birthDate: dto.birthDate,
    });

    const created = await repository.create(dto);

    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        username: 'new_user',
        passwordHash: 'argon2-hash',
        displayName: 'New Display Name',
        birthDate: dto.birthDate,
      },
    });
    expect(created.id).toBe('usr-new');
  });

  it('updateUser updates user fields in database', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({ id: 'usr-1', bio: 'New bio' });
    const updated = await repository.updateUser('usr-1', { bio: 'New bio' });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      data: { bio: 'New bio' },
    });
    expect(updated.bio).toBe('New bio');
  });

  it('updateAvatar updates avatar url for given user id', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({
      id: 'usr-1',
      avatar: 'https://cdn.com/avatar.jpg',
    });
    const updated = await repository.updateAvatar('usr-1', 'https://cdn.com/avatar.jpg');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      data: { avatar: 'https://cdn.com/avatar.jpg' },
    });
    expect(updated.avatar).toBe('https://cdn.com/avatar.jpg');
  });

  it('updatePassword updates password hash for user', async () => {
    mockPrisma.user.update.mockResolvedValueOnce({ id: 'usr-1' });
    await repository.updatePassword('usr-1', 'new-hashed-password');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      data: { passwordHash: 'new-hashed-password' },
    });
  });

  it('deleteUser executes transaction to delete posts, follows and user record', async () => {
    mockPrisma.$transaction.mockImplementationOnce(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          post: { deleteMany: jest.fn() },
          follow: { deleteMany: jest.fn() },
          user: { delete: jest.fn() },
        };
        await callback(tx);
        expect(tx.post.deleteMany).toHaveBeenCalledWith({ where: { authorId: 'usr-to-delete' } });
        expect(tx.follow.deleteMany).toHaveBeenCalledWith({
          where: {
            OR: [{ followerId: 'usr-to-delete' }, { followingId: 'usr-to-delete' }],
          },
        });
        expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: 'usr-to-delete' } });
      },
    );

    await repository.deleteUser('usr-to-delete');
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('blockUser executes upsert and removes follow relations via transaction', async () => {
    mockPrisma.userBlock.upsert.mockResolvedValueOnce({});
    mockPrisma.follow.deleteMany.mockResolvedValueOnce({ count: 2 });
    mockPrisma.$transaction.mockImplementationOnce(
      async (callback: (tx: typeof mockPrisma) => Promise<void>) => {
        await callback(mockPrisma);
      },
    );

    await repository.blockUser('usr-blocker', 'usr-blocked');

    expect(mockPrisma.userBlock.upsert).toHaveBeenCalledWith({
      where: { blockerId_blockedId: { blockerId: 'usr-blocker', blockedId: 'usr-blocked' } },
      create: { blockerId: 'usr-blocker', blockedId: 'usr-blocked' },
      update: {},
    });
    expect(mockPrisma.follow.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { followerId: 'usr-blocker', followingId: 'usr-blocked' },
          { followerId: 'usr-blocked', followingId: 'usr-blocker' },
        ],
      },
    });
  });

  it('unblockUser deletes user block record', async () => {
    mockPrisma.userBlock.deleteMany.mockResolvedValueOnce({ count: 1 });
    await repository.unblockUser('usr-blocker', 'usr-blocked');

    expect(mockPrisma.userBlock.deleteMany).toHaveBeenCalledWith({
      where: { blockerId: 'usr-blocker', blockedId: 'usr-blocked' },
    });
  });
});
