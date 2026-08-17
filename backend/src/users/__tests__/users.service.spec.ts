import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { AutoDeletePeriod } from '@prisma/client';
import { CreateUserDto } from '@common/contracts';
import { UsersService } from '../users.service';
import type { RedisService } from '../../redis/redis.service';
import type { VisibilityResolver } from '../privacy/visibility.resolver';
import type { PrismaService } from '@common/prisma';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepository: {
    findByEmail: jest.Mock;
    findByUsername: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updateUser: jest.Mock;
    updateAvatar: jest.Mock;
    updatePassword: jest.Mock;
    deleteUser: jest.Mock;
    blockUser: jest.Mock;
    unblockUser: jest.Mock;
  };
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    getOrSet: jest.Mock;
  };
  let mockVisibility: {
    loadContext: jest.Mock;
    resolve: jest.Mock;
    isFollower: jest.Mock;
    resolvePresenceAudience: jest.Mock;
  };
  let mockPrisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    userBlock: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    userAlias: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    follow: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    userBadge: {
      findUnique: jest.Mock;
    };
  };

  const sampleDate = new Date('2026-08-16T12:00:00.000Z');

  const baseDbUser = {
    id: 'usr-100',
    email: 'alex@example.com',
    username: 'alex_dev',
    displayName: 'Alex Dev',
    avatar: 'https://img.com/avatar.png',
    banner: 'https://img.com/banner.png',
    bannerPosition: 50,
    bio: 'Software engineer',
    birthDate: sampleDate,
    isPrivate: false,
    isVerified: true,
    primaryBadge: 'veteran',
    githubUsername: 'alexdev',
    mergedPrsCount: 15,
    lastSeenAt: sampleDate,
    autoDeletePeriod: AutoDeletePeriod.OFF,
    createdAt: sampleDate,
    updatedAt: sampleDate,
    badges: [{ badgeId: 'veteran' }],
    _count: {
      followers: 120,
      following: 85,
      posts: 42,
    },
  };

  beforeEach(() => {
    mockUsersRepository = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateUser: jest.fn(),
      updateAvatar: jest.fn(),
      updatePassword: jest.fn(),
      deleteUser: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
    };

    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      getOrSet: jest
        .fn()
        .mockImplementation((_key: string, _ttl: number, factory: () => unknown) => factory()),
    };

    mockVisibility = {
      loadContext: jest.fn().mockResolvedValue({
        viewerId: null,
        acceptedFollowing: new Set(),
        pendingFollowing: new Set(),
        blocked: new Set(),
        visibility: new Map(),
        exceptions: new Map(),
      }),
      resolve: jest.fn().mockReturnValue(true),
      isFollower: jest.fn().mockReturnValue(false),
      resolvePresenceAudience: jest.fn().mockResolvedValue(new Set()),
    };

    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      userBlock: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userAlias: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      follow: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userBadge: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    service = new UsersService(
      mockUsersRepository,
      mockRedis as unknown as RedisService,
      mockVisibility as unknown as VisibilityResolver,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('Basic CRUD delegates', () => {
    it('delegates findByEmail, findByUsername, findById, create', async () => {
      mockUsersRepository.findByEmail.mockResolvedValueOnce({ id: '1' });
      mockUsersRepository.findByUsername.mockResolvedValueOnce({ id: '2' });
      mockUsersRepository.findById.mockResolvedValueOnce({ id: '3' });
      mockUsersRepository.create.mockResolvedValueOnce({ id: '4' });

      expect(await service.findByEmail('e@x.com')).toEqual({ id: '1' });
      expect(await service.findByUsername('usr')).toEqual({ id: '2' });
      expect(await service.findById('3')).toEqual({ id: '3' });

      const dto = new CreateUserDto({ email: 'a@b.com', username: 'ab', passwordHash: 'hash' });
      expect(await service.create(dto)).toEqual({ id: '4' });
    });

    it('updatePasswordHash and touchLastSeen update repository and invalidate cache', async () => {
      await service.updatePasswordHash('usr-1', 'new-hash');
      expect(mockUsersRepository.updatePassword).toHaveBeenCalledWith('usr-1', 'new-hash');
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');

      await service.touchLastSeen('usr-1', sampleDate);
      expect(mockUsersRepository.updateUser).toHaveBeenCalledWith('usr-1', {
        lastSeenAt: sampleDate,
      });
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
    });
  });

  describe('deleteAccount', () => {
    it('throws NotFoundException if user is not found', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(null);

      await expect(service.deleteAccount('missing-id', 'password')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws UnauthorizedException if password is wrong', async () => {
      const hash = await argon2.hash('CorrectPassword');
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-1', passwordHash: hash });

      await expect(service.deleteAccount('usr-1', 'WrongPassword')).rejects.toThrow(
        new UnauthorizedException('Incorrect password'),
      );
    });

    it('deletes account and invalidates cache when password matches', async () => {
      const hash = await argon2.hash('CorrectPassword');
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-1', passwordHash: hash });

      await service.deleteAccount('usr-1', 'CorrectPassword');

      expect(mockUsersRepository.deleteUser).toHaveBeenCalledWith('usr-1');
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
    });
  });

  describe('getProfileFor & getProfileByUsername', () => {
    it('throws NotFoundException when viewer is blocked by target or vice versa', async () => {
      mockPrisma.userBlock.findFirst.mockResolvedValueOnce({
        blockerId: 'usr-target',
        blockedId: 'usr-viewer',
      });

      await expect(service.getProfileFor('usr-target', 'usr-viewer')).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });

    it('retrieves profile, loads visibility context, applies privacy and alias', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseDbUser);
      mockPrisma.userAlias.findUnique.mockResolvedValueOnce({ alias: 'Alex Best Friend' });

      const profile = await service.getProfileFor('usr-100', 'usr-viewer');

      expect(profile.id).toBe('usr-100');
      expect(profile.username).toBe('alex_dev');
      expect(profile.alias).toBe('Alex Best Friend');
      expect(profile.isVerified).toBe(true);
      expect(profile.followersCount).toBe(120);
    });

    it('getProfileByUsername throws NotFoundException for reserved usernames or missing users', async () => {
      await expect(service.getProfileByUsername('settings', null)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfileByUsername('', null)).rejects.toThrow(NotFoundException);

      mockUsersRepository.findByUsername.mockResolvedValueOnce(null);
      await expect(service.getProfileByUsername('unknown_user', null)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('getProfileByUsername retrieves user and calls getProfileFor', async () => {
      mockUsersRepository.findByUsername.mockResolvedValueOnce({
        id: 'usr-100',
        username: 'alex_dev',
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseDbUser);

      const profile = await service.getProfileByUsername('@alex_dev', null);
      expect(profile.id).toBe('usr-100');
    });
  });

  describe('User Aliases', () => {
    it('setUserAlias throws BadRequestException when assigning alias to self', async () => {
      await expect(service.setUserAlias('usr-1', 'usr-1', 'Me')).rejects.toThrow(
        new BadRequestException('Cannot set alias for yourself'),
      );
    });

    it('setUserAlias throws NotFoundException when target does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(null);

      await expect(service.setUserAlias('usr-1', 'target-missing', 'Buddy')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('setUserAlias upserts alias in database', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'target-1' });

      const result = await service.setUserAlias('usr-1', 'target-1', '  Best Mate  ');

      expect(mockPrisma.userAlias.upsert).toHaveBeenCalledWith({
        where: { ownerId_targetId: { ownerId: 'usr-1', targetId: 'target-1' } },
        create: { ownerId: 'usr-1', targetId: 'target-1', alias: 'Best Mate' },
        update: { alias: 'Best Mate' },
      });
      expect(result).toEqual({ success: true });
    });

    it('deleteUserAlias deletes alias from database', async () => {
      const result = await service.deleteUserAlias('usr-1', 'target-1');
      expect(mockPrisma.userAlias.deleteMany).toHaveBeenCalledWith({
        where: { ownerId: 'usr-1', targetId: 'target-1' },
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Blocking & Unblocking', () => {
    it('blockUser throws BadRequestException when blocking self', async () => {
      await expect(service.blockUser('usr-1', 'usr-1')).rejects.toThrow(
        new BadRequestException("Can't block yourself"),
      );
    });

    it('blockUser throws NotFoundException if target does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce(null);

      await expect(service.blockUser('usr-1', 'usr-missing')).rejects.toThrow(NotFoundException);
    });

    it('blockUser blocks user and clears redis cache for both users', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-2' });

      const result = await service.blockUser('usr-1', 'usr-2');

      expect(mockUsersRepository.blockUser).toHaveBeenCalledWith('usr-1', 'usr-2');
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-2');
      expect(result).toEqual({ success: true });
    });

    it('unblockUser unblocks user and clears cache', async () => {
      const result = await service.unblockUser('usr-1', 'usr-2');

      expect(mockUsersRepository.unblockUser).toHaveBeenCalledWith('usr-1', 'usr-2');
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-2');
      expect(result).toEqual({ success: true });
    });
  });

  describe('updateUser & updatePrimaryBadge', () => {
    it('updateUser throws ConflictException when new username is taken', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-1', username: 'old_user' });
      mockUsersRepository.findByUsername.mockResolvedValueOnce({ id: 'other-user' });

      await expect(service.updateUser('usr-1', { username: 'taken_user' })).rejects.toThrow(
        new ConflictException('Username is already taken'),
      );
    });

    it('updateUser throws ConflictException when new email is taken', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-1', email: 'old@example.com' });
      mockUsersRepository.findByEmail.mockResolvedValueOnce({ id: 'other-user' });

      await expect(service.updateUser('usr-1', { email: 'taken@example.com' })).rejects.toThrow(
        new ConflictException('Email is already taken'),
      );
    });

    it('updateUser updates user and clears cache', async () => {
      mockUsersRepository.findById.mockResolvedValueOnce({ id: 'usr-1' });
      mockUsersRepository.updateUser.mockResolvedValueOnce({ id: 'usr-1' });
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseDbUser);

      const result = await service.updateUser('usr-1', {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      });

      expect(mockUsersRepository.updateUser).toHaveBeenCalledWith('usr-1', {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      });
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(result.id).toBe('usr-100');
    });

    it('updatePrimaryBadge throws ForbiddenException if user does not own badge', async () => {
      mockPrisma.userBadge.findUnique.mockResolvedValueOnce(null);

      await expect(service.updatePrimaryBadge('usr-1', 'vip-badge')).rejects.toThrow(
        /You do not own the badge 'vip-badge'/,
      );
    });

    it('updatePrimaryBadge updates badge and clears cache when badge is owned', async () => {
      mockPrisma.userBadge.findUnique.mockResolvedValueOnce({
        userId: 'usr-1',
        badgeId: 'vip-badge',
      });
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'usr-1', primaryBadge: 'vip-badge' });
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseDbUser);

      const result = await service.updatePrimaryBadge('usr-1', 'vip-badge');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'usr-1' },
        data: { primaryBadge: 'vip-badge' },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('user:usr-1');
      expect(result.id).toBe('usr-100');
    });
  });
});
