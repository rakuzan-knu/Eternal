import { FOLLOWERS_REPOSITORY, type IFollowersRepository } from '../followers-repository.interface';
import { FollowStatus } from '@prisma/client';

describe('followers-repository.interface', () => {
  it('defines FOLLOWERS_REPOSITORY symbol token', () => {
    expect(typeof FOLLOWERS_REPOSITORY).toBe('symbol');
    expect(FOLLOWERS_REPOSITORY.toString()).toBe('Symbol(FOLLOWERS_REPOSITORY)');
  });

  it('implements IFollowersRepository interface methods', async () => {
    const mockRepo: IFollowersRepository = {
      getFollowers: jest.fn().mockResolvedValue([]),
      getFollowing: jest.fn().mockResolvedValue([]),
      followUser: jest.fn().mockResolvedValue(FollowStatus.ACCEPTED),
      unfollowUser: jest.fn().mockResolvedValue(undefined),
      isTargetPrivate: jest.fn().mockResolvedValue(false),
      listPendingRequests: jest.fn().mockResolvedValue([]),
      acceptRequest: jest.fn().mockResolvedValue(true),
      rejectRequest: jest.fn().mockResolvedValue(true),
      pendingCount: jest.fn().mockResolvedValue(0),
    };

    expect(await mockRepo.followUser('usr-1', 'usr-2', FollowStatus.ACCEPTED)).toBe(
      FollowStatus.ACCEPTED,
    );
    expect(await mockRepo.isTargetPrivate('usr-2')).toBe(false);
    expect(await mockRepo.pendingCount('usr-1')).toBe(0);
  });
});
