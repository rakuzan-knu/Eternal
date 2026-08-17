import { FollowStatus } from '@prisma/client';
import { FollowersController } from '../followers.controller';
import type { FollowersService } from '../followers.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('FollowersController', () => {
  let controller: FollowersController;
  let mockFollowersService: {
    getFollowers: jest.Mock;
    getFollowing: jest.Mock;
    getFriends: jest.Mock;
    getFollowRequests: jest.Mock;
    getPendingCount: jest.Mock;
    acceptRequest: jest.Mock;
    rejectRequest: jest.Mock;
    followUser: jest.Mock;
    unfollowUser: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-current',
    email: 'user@test.com',
    username: 'user_current',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockFollowersService = {
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      getFriends: jest.fn(),
      getFollowRequests: jest.fn(),
      getPendingCount: jest.fn(),
      acceptRequest: jest.fn(),
      rejectRequest: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
    };

    controller = new FollowersController(mockFollowersService as unknown as FollowersService);
  });

  it('getFollowers and getFollowing delegate to FollowersService', async () => {
    mockFollowersService.getFollowers.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });
    mockFollowersService.getFollowing.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getFollowers('usr-1', { limit: 10, after: 'cur-1' }, mockUser);
    expect(mockFollowersService.getFollowers).toHaveBeenCalledWith(
      'usr-1',
      10,
      'cur-1',
      'usr-current',
    );

    await controller.getFollowing('usr-1', { limit: 10 }, mockUser);
    expect(mockFollowersService.getFollowing).toHaveBeenCalledWith(
      'usr-1',
      10,
      undefined,
      'usr-current',
    );
  });

  it('getFriends delegates to FollowersService', async () => {
    mockFollowersService.getFriends.mockResolvedValueOnce([]);

    await controller.getFriends(mockUser);
    expect(mockFollowersService.getFriends).toHaveBeenCalledWith('usr-current');
  });

  it('getFollowRequests and getFollowRequestsCount delegate to FollowersService', async () => {
    mockFollowersService.getFollowRequests.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });
    mockFollowersService.getPendingCount.mockResolvedValueOnce(3);

    await controller.getFollowRequests(mockUser, { limit: 10 });
    expect(mockFollowersService.getFollowRequests).toHaveBeenCalledWith(
      'usr-current',
      10,
      undefined,
    );

    const countResult = await controller.getFollowRequestsCount(mockUser);
    expect(mockFollowersService.getPendingCount).toHaveBeenCalledWith('usr-current');
    expect(countResult).toEqual({ count: 3 });
  });

  it('acceptRequest and rejectRequest delegate to FollowersService', async () => {
    mockFollowersService.acceptRequest.mockResolvedValueOnce(undefined);
    mockFollowersService.rejectRequest.mockResolvedValueOnce(undefined);

    await controller.acceptRequest('follower-1', mockUser);
    expect(mockFollowersService.acceptRequest).toHaveBeenCalledWith('usr-current', 'follower-1');

    await controller.rejectRequest('follower-1', mockUser);
    expect(mockFollowersService.rejectRequest).toHaveBeenCalledWith('usr-current', 'follower-1');
  });

  it('followUser and unfollowUser delegate to FollowersService', async () => {
    mockFollowersService.followUser.mockResolvedValueOnce({ status: FollowStatus.ACCEPTED });
    mockFollowersService.unfollowUser.mockResolvedValueOnce(undefined);

    const followRes = await controller.followUser('usr-target', mockUser);
    expect(mockFollowersService.followUser).toHaveBeenCalledWith('usr-current', 'usr-target');
    expect(followRes.status).toBe(FollowStatus.ACCEPTED);

    await controller.unfollowUser('usr-target', mockUser);
    expect(mockFollowersService.unfollowUser).toHaveBeenCalledWith('usr-current', 'usr-target');
  });
});
