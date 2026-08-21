import { toUserProfileDto } from '../followers.mapper';
import type { PublicUserEntity } from '../types/followers.types';

describe('followers.mapper', () => {
  const baseUser: PublicUserEntity = {
    id: 'usr-1',
    username: 'john_doe',
    displayName: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Software engineer',
    isPrivate: false,
    isVerified: true,
    primaryBadge: 'developer',
    badges: [{ badgeId: 'developer' }, { badgeId: 'early_adopter' }],
    githubUsername: 'johndoe',
    mergedPrsCount: 42,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  it('maps a user entity to UserProfileDto with default following flags', () => {
    const dto = toUserProfileDto(baseUser);

    expect(dto).toEqual({
      id: 'usr-1',
      username: 'john_doe',
      displayName: 'John Doe',
      avatar: 'https://example.com/avatar.jpg',
      bio: 'Software engineer',
      isPrivate: false,
      isVerified: true,
      primaryBadge: 'developer',
      badges: ['developer', 'early_adopter'],
      githubUsername: 'johndoe',
      mergedPrsCount: 42,
      createdAt: baseUser.createdAt,
      updatedAt: baseUser.updatedAt,
      isFollowing: false,
      followsYou: false,
      isFriend: false,
    });
  });

  it('maps string badges correctly', () => {
    const userWithStrBadges = {
      ...baseUser,
      badges: ['badge1', 'badge2'] as unknown as { badgeId: string }[],
    };

    const dto = toUserProfileDto(userWithStrBadges);
    expect(dto.badges).toEqual(['badge1', 'badge2']);
  });

  it('handles missing or non-array badges gracefully', () => {
    const userWithoutBadges = {
      ...baseUser,
      badges: undefined as unknown as { badgeId: string }[],
    };

    const dto = toUserProfileDto(userWithoutBadges);
    expect(dto.badges).toEqual([]);
  });

  it('computes isFriend as true when both isFollowing and followsYou are true', () => {
    const dto = toUserProfileDto(baseUser, true, true);
    expect(dto.isFollowing).toBe(true);
    expect(dto.followsYou).toBe(true);
    expect(dto.isFriend).toBe(true);
  });

  it('computes isFriend as false when only one of isFollowing/followsYou is true', () => {
    const dto1 = toUserProfileDto(baseUser, true, false);
    expect(dto1.isFriend).toBe(false);

    const dto2 = toUserProfileDto(baseUser, false, true);
    expect(dto2.isFriend).toBe(false);
  });

  it('falls back correctly for undefined optional fields', () => {
    const minimalUser: PublicUserEntity = {
      id: 'usr-2',
      username: 'jane',
      displayName: null,
      avatar: null,
      bio: null,
      isPrivate: false,
      isVerified: undefined as unknown as boolean,
      primaryBadge: undefined as unknown as string,
      badges: [],
      githubUsername: undefined as unknown as string,
      mergedPrsCount: undefined as unknown as number,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const dto = toUserProfileDto(minimalUser);
    expect(dto.isVerified).toBe(false);
    expect(dto.primaryBadge).toBeNull();
    expect(dto.githubUsername).toBeNull();
    expect(dto.mergedPrsCount).toBe(0);
  });
});
