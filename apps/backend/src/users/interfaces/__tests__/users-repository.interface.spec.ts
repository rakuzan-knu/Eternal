import { USERS_REPOSITORY, type IUsersRepository } from '../users-repository.interface';
import type { User } from '@prisma/client';
import { CreateUserDto } from '@common/contracts';

describe('users-repository.interface', () => {
  it('defines USERS_REPOSITORY symbol token', () => {
    expect(typeof USERS_REPOSITORY).toBe('symbol');
    expect(USERS_REPOSITORY.toString()).toBe('Symbol(USERS_REPOSITORY)');
  });

  it('implements IUsersRepository interface methods', async () => {
    const mockUser: User = {
      id: 'usr-1',
      email: 'usr@test.com',
      username: 'usr_test',
      displayName: null,
      passwordHash: 'hash',
      avatar: null,
      bio: null,
      banner: null,
      bannerPosition: 50,
      isPrivate: false,
      isVerified: false,
      flags: 0,
      primaryBadge: null,
      githubId: null,
      githubUsername: null,
      mergedPrsCount: 0,
      birthDate: null,
      gender: null,
      lastSeenAt: null,
      autoDeletePeriod: 'OFF',
      defaultChatTheme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepo: IUsersRepository = {
      findByEmail: jest.fn().mockResolvedValue(mockUser),
      findByUsername: jest.fn().mockResolvedValue(mockUser),
      findById: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockResolvedValue(mockUser),
      updateUser: jest.fn().mockResolvedValue(mockUser),
      updateManyLastSeen: jest.fn().mockResolvedValue(undefined),
      updateAvatar: jest.fn().mockResolvedValue(mockUser),
      updatePassword: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      blockUser: jest.fn().mockResolvedValue(undefined),
      unblockUser: jest.fn().mockResolvedValue(undefined),
      findFullProfile: jest.fn().mockResolvedValue(null),
      isBlocked: jest.fn().mockResolvedValue(false),
      getBlockedIds: jest.fn().mockResolvedValue([]),
      findUserAlias: jest.fn().mockResolvedValue(null),
      setUserAlias: jest.fn().mockResolvedValue(undefined),
      deleteUserAlias: jest.fn().mockResolvedValue(undefined),
      hasBadge: jest.fn().mockResolvedValue(false),
      getUserBadges: jest.fn().mockResolvedValue([]),
      searchCandidates: jest.fn().mockResolvedValue([]),
      getFollowingIds: jest.fn().mockResolvedValue([]),
      getFollowerIds: jest.fn().mockResolvedValue([]),
      getRecentChatParticipantIds: jest.fn().mockResolvedValue([]),
      getFriendsOfFriends: jest.fn().mockResolvedValue([]),
      getPopularUserIds: jest.fn().mockResolvedValue([]),
      getCandidateUsersDetails: jest.fn().mockResolvedValue([]),
      getNearbyUserCandidates: jest.fn().mockResolvedValue([]),
      getRecentPublicPostsContent: jest.fn().mockResolvedValue([]),
      getRecentContentsByAuthors: jest.fn().mockResolvedValue([]),
      getTopPostsForUsers: jest.fn().mockResolvedValue([]),
    };

    const createDto = new CreateUserDto({
      email: 'usr@test.com',
      username: 'usr_test',
      passwordHash: 'hash',
    });

    expect(await mockRepo.create(createDto)).toEqual(mockUser);
    expect(await mockRepo.findById('usr-1')).toEqual(mockUser);
  });
});
