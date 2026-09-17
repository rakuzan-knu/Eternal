import { publicUserSelect } from '../users.select';

describe('users.select', () => {
  it('defines the expected public user projection fields', () => {
    expect(publicUserSelect).toEqual({
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      bio: true,
      isPrivate: true,
      isVerified: true,
      primaryBadge: true,
      githubUsername: true,
      mergedPrsCount: true,
      badges: { select: { badgeId: true } },
      createdAt: true,
      updatedAt: true,
    });
  });
});
