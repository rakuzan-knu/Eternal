import { publicUserSelect } from '../users.select';

describe('users.select', () => {
  it('defines the expected public user projection fields', () => {
    expect(publicUserSelect).toEqual({
      id: true,
      username: true,
      displayName: true,
      displayNameStyle: true,
      profileTheme: true,
      avatar: true,
      activeProfileFrameId: true,
      activeProfileFrame: true,
      activeProfileEffectId: true,
      activeProfileEffect: true,
      activeNameplateId: true,
      activeNameplate: true,
      activeDecorationId: true,
      activeDecoration: true,
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
