import { UsersController } from '../users.controller';
import type { UsersService } from '../users.service';
import type { PostsService } from '../../posts/posts.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: {
    searchUsers: jest.Mock;
    searchMentionSuggestions: jest.Mock;
    getTopFollowedUsers: jest.Mock;
    getSuggestedUsers: jest.Mock;
    getNearbyUsers: jest.Mock;
    getProfileFor: jest.Mock;
    getProfileByUsername: jest.Mock;
    updateProfile: jest.Mock;
    updateUser: jest.Mock;
    deleteAccount: jest.Mock;
    setUserAlias: jest.Mock;
    deleteUserAlias: jest.Mock;
    updatePrimaryBadge: jest.Mock;
    blockUser: jest.Mock;
    unblockUser: jest.Mock;
    getBlockedUsers: jest.Mock;
    dismissSuggestedUser: jest.Mock;
    searchHashtags: jest.Mock;
    getTrendingHashtags: jest.Mock;
  };
  let mockPostsService: {
    getUserPosts: jest.Mock;
    getSavedPosts: jest.Mock;
    getUserReposts: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-current',
    email: 'current@test.com',
    username: 'current_user',
    sessionJti: 'jti-1',
  };

  beforeEach(() => {
    mockUsersService = {
      searchUsers: jest.fn(),
      searchMentionSuggestions: jest.fn(),
      getTopFollowedUsers: jest.fn(),
      getSuggestedUsers: jest.fn(),
      getNearbyUsers: jest.fn(),
      getProfileFor: jest.fn(),
      getProfileByUsername: jest.fn(),
      updateProfile: jest.fn(),
      updateUser: jest.fn(),
      deleteAccount: jest.fn(),
      setUserAlias: jest.fn(),
      deleteUserAlias: jest.fn(),
      updatePrimaryBadge: jest.fn(),
      blockUser: jest.fn(),
      unblockUser: jest.fn(),
      getBlockedUsers: jest.fn(),
      dismissSuggestedUser: jest.fn(),
      searchHashtags: jest.fn(),
      getTrendingHashtags: jest.fn(),
    };

    mockPostsService = {
      getUserPosts: jest.fn(),
      getSavedPosts: jest.fn(),
      getUserReposts: jest.fn(),
    };

    controller = new UsersController(
      mockUsersService as unknown as UsersService,
      mockPostsService as unknown as PostsService,
    );
  });

  it('searchUsers delegates query to UsersService with viewer context', async () => {
    mockUsersService.searchUsers.mockResolvedValueOnce([{ id: 'usr-found' }]);

    const result = await controller.searchUsers({ q: 'alex' }, mockUser);

    expect(mockUsersService.searchUsers).toHaveBeenCalledWith('alex', 'usr-current');
    expect(result).toHaveLength(1);
  });

  it('searchMentionSuggestions delegates to UsersService', async () => {
    mockUsersService.searchMentionSuggestions.mockResolvedValueOnce([]);

    await controller.searchMentionSuggestions({ q: '@sam' }, mockUser);
    expect(mockUsersService.searchMentionSuggestions).toHaveBeenCalledWith('@sam', 'usr-current');
  });

  it('getTopUsers parses limit and calls getTopFollowedUsers', async () => {
    mockUsersService.getTopFollowedUsers.mockResolvedValueOnce([]);

    await controller.getTopUsers({ limit: 10 }, mockUser);
    expect(mockUsersService.getTopFollowedUsers).toHaveBeenCalledWith(10, 'usr-current');
  });

  it('getProfile calls getProfileFor with user id and viewer', async () => {
    mockUsersService.getProfileFor.mockResolvedValueOnce({ id: 'usr-1' });

    const result = await controller.getProfile('usr-1', mockUser);
    expect(mockUsersService.getProfileFor).toHaveBeenCalledWith('usr-1', 'usr-current');
    expect(result.id).toBe('usr-1');
  });

  it('updateUser calls usersService.updateUser with DTO', async () => {
    const updateDto = { displayName: 'Updated' };
    mockUsersService.updateUser = jest
      .fn()
      .mockResolvedValueOnce({ id: 'usr-current', displayName: 'Updated' });

    const result = await controller.updateUser('usr-current', updateDto, mockUser);
    expect(mockUsersService.updateUser).toHaveBeenCalledWith('usr-current', updateDto);
    expect(result.displayName).toBe('Updated');
  });

  it('deleteUser delegates to UsersService', async () => {
    mockUsersService.deleteAccount.mockResolvedValueOnce(undefined);

    await controller.deleteUser('usr-current', { password: 'Password123!' }, mockUser);
    expect(mockUsersService.deleteAccount).toHaveBeenCalledWith('usr-current', 'Password123!');
  });

  it('getProfileByUsername queries UsersService with username and viewer', async () => {
    mockUsersService.getProfileByUsername.mockResolvedValueOnce({ id: 'usr-2' });

    const result = await controller.getProfileByUsername('target_user', mockUser);
    expect(mockUsersService.getProfileByUsername).toHaveBeenCalledWith(
      'target_user',
      'usr-current',
    );
    expect(result.id).toBe('usr-2');
  });

  it('getUserPosts queries PostsService', async () => {
    mockPostsService.getUserPosts.mockResolvedValueOnce({
      data: [],
      meta: { nextCursor: null, hasNextPage: false },
    });

    await controller.getUserPosts('usr-target', { limit: 20 }, mockUser);
    expect(mockPostsService.getUserPosts).toHaveBeenCalledWith(
      'usr-target',
      20,
      undefined,
      'usr-current',
    );
  });

  it('setUserAlias and deleteUserAlias delegate to UsersService', async () => {
    mockUsersService.setUserAlias.mockResolvedValueOnce({ success: true });
    mockUsersService.deleteUserAlias.mockResolvedValueOnce({ success: true });

    await controller.setUserAlias('usr-target', { alias: 'Best Friend' }, mockUser);
    expect(mockUsersService.setUserAlias).toHaveBeenCalledWith(
      'usr-current',
      'usr-target',
      'Best Friend',
    );

    await controller.deleteUserAlias('usr-target', mockUser);
    expect(mockUsersService.deleteUserAlias).toHaveBeenCalledWith('usr-current', 'usr-target');
  });

  it('updatePrimaryBadge delegates to UsersService', async () => {
    mockUsersService.updatePrimaryBadge.mockResolvedValueOnce({ success: true });

    await controller.updatePrimaryBadge(mockUser, { badgeId: 'badge-vip' });
    expect(mockUsersService.updatePrimaryBadge).toHaveBeenCalledWith('usr-current', 'badge-vip');
  });

  it('blockUser, unblockUser, and getBlockedUsers delegate to UsersService', async () => {
    mockUsersService.blockUser.mockResolvedValueOnce({ success: true });
    mockUsersService.unblockUser.mockResolvedValueOnce({ success: true });
    mockUsersService.getBlockedUsers = jest
      .fn()
      .mockResolvedValueOnce({ data: [], meta: { nextCursor: null, hasNextPage: false } });

    await controller.blockUser('usr-target', mockUser);
    expect(mockUsersService.blockUser).toHaveBeenCalledWith('usr-current', 'usr-target');

    await controller.unblockUser('usr-target', mockUser);
    expect(mockUsersService.unblockUser).toHaveBeenCalledWith('usr-current', 'usr-target');

    await controller.updatePrimaryBadgeProfileAlias(mockUser, { badgeId: 'badge-vip' });
    expect(mockUsersService.updatePrimaryBadge).toHaveBeenCalledWith('usr-current', 'badge-vip');
  });

  it('suggested users, dismiss, hashtags, saved posts and reposts delegate properly', async () => {
    mockUsersService.getSuggestedUsers.mockResolvedValueOnce([]);
    mockUsersService.dismissSuggestedUser = jest.fn().mockResolvedValueOnce(undefined);
    mockUsersService.searchHashtags = jest.fn().mockResolvedValueOnce([{ tag: 'cool', count: 5 }]);
    mockUsersService.getTrendingHashtags = jest
      .fn()
      .mockResolvedValueOnce([{ tag: 'trending', count: 10 }]);
    mockPostsService.getSavedPosts = jest.fn().mockResolvedValueOnce({ data: [] });
    mockPostsService.getUserReposts = jest.fn().mockResolvedValueOnce({ data: [] });

    await controller.getSuggestedUsers({ limit: 5 }, mockUser, { ip: '127.0.0.1' } as never);
    expect(mockUsersService.getSuggestedUsers).toHaveBeenCalledWith(
      'usr-current',
      5,
      '127.0.0.1',
      undefined,
    );

    const dismissRes = await controller.dismissSuggestedUser('usr-target', mockUser);
    expect(dismissRes.success).toBe(true);

    const searchTags = await controller.searchHashtags({ q: 'cool' });
    expect(searchTags).toHaveLength(1);

    const trendingTags = await controller.getTrendingHashtags({ limit: 6 });
    expect(trendingTags).toHaveLength(1);

    await controller.getSavedPosts({ limit: 10 }, mockUser);
    expect(mockPostsService.getSavedPosts).toHaveBeenCalledWith('usr-current', 10, undefined);

    await controller.getUserReposts('usr-target', { limit: 10 }, mockUser);
    expect(mockPostsService.getUserReposts).toHaveBeenCalledWith(
      'usr-target',
      10,
      undefined,
      'usr-current',
    );
  });
});
