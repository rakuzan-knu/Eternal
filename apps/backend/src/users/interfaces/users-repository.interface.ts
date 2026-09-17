import type { Prisma, User } from '@prisma/client';
import type { CreateUserDto } from '@common/contracts';

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findFullProfile(id: string): Promise<
    | (User & {
        badges: { badgeId: string }[];
        _count: { followers: number; following: number; posts: number };
      })
    | null
  >;
  create(dto: CreateUserDto): Promise<User>;

  updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User>;
  updateManyLastSeen(records: { id: string; lastSeenAt: Date }[]): Promise<void>;
  updateAvatar(id: string, avatarUrl: string | null): Promise<User>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  isBlocked(userA: string, userB: string): Promise<boolean>;
  getBlockedIds(userId: string): Promise<string[]>;
  findUserAlias(ownerId: string, targetId: string): Promise<string | null>;
  setUserAlias(ownerId: string, targetId: string, alias: string): Promise<void>;
  deleteUserAlias(ownerId: string, targetId: string): Promise<void>;
  hasBadge(userId: string, badgeId: string): Promise<boolean>;
  getUserBadges(userId: string): Promise<string[]>;
  searchCandidates(
    blockedIds: string[],
    reservedUsernames: string[],
    takeLimit: number,
  ): Promise<
    (User & {
      badges: { badgeId: string }[];
      _count: { followers: number; following: number };
    })[]
  >;
  getFollowingIds(userId: string): Promise<string[]>;
  getFollowerIds(userId: string): Promise<string[]>;
  getRecentChatParticipantIds(userId: string): Promise<string[]>;
  getFriendsOfFriends(followingIds: string[], excludeIds: string[]): Promise<string[]>;
  getPopularUserIds(excludeIds: string[], reservedUsernames: string[]): Promise<string[]>;
  getCandidateUsersDetails(
    candidateIds: string[],
    reservedUsernames: string[],
    followingIds: string[],
  ): Promise<
    (User & {
      badges: { badgeId: string }[];
      privacy: { allowNearbyRecommendations: boolean } | null;
      _count: { followers: number; following: number; posts: number };
      followers: { follower: { id: string; username: string; avatar: string | null } }[];
    })[]
  >;
  getNearbyUserCandidates(
    excludeIds: string[],
    reservedUsernames: string[],
  ): Promise<
    (User & {
      badges: { badgeId: string }[];
      privacy: { allowNearbyRecommendations: boolean } | null;
      _count: { followers: number; following: number; posts: number };
    })[]
  >;
  getTopPostsForUsers(
    authorIds: string[],
  ): Promise<{ id: string; authorId: string; media: { url: string }[] }[]>;
  getRecentPublicPostsContent(takeLimit: number): Promise<{ content: string }[]>;
  getRecentContentsByAuthors(
    authorIds: string[],
    perAuthorLimit?: number,
  ): Promise<Array<{ authorId: string; content: string }>>;
}
