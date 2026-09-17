import type { FollowStatus, ProfileShowcase, ShowcaseMedia } from '@prisma/client';
import type { UpdateShowcaseDto } from '@common/contracts';

export type ProfileShowcaseWithMedia = ProfileShowcase & { mediaItems: ShowcaseMedia[] };

export type UserWithShowcase = {
  id: string;
  username: string;
  displayName: string | null;
  birthDate: Date | null;
  gender: string | null;
  githubUsername: string | null;
  showcase: ProfileShowcaseWithMedia | null;
};

export const SHOWCASE_REPOSITORY = Symbol('SHOWCASE_REPOSITORY');

export interface IShowcaseRepository {
  findUserWithShowcase(username: string): Promise<UserWithShowcase | null>;
  findUserBasic(userId: string): Promise<{ id: string; username: string } | null>;
  getFollowStatus(followerId: string, followingId: string): Promise<FollowStatus | null>;
  upsertDefaultShowcase(userId: string): Promise<ProfileShowcaseWithMedia>;
  updateShowcase(userId: string, dto: UpdateShowcaseDto): Promise<void>;
  findUsersByIds(
    userIds: string[],
  ): Promise<{ id: string; username: string; displayName: string | null; avatar: string | null }[]>;
  updateConnectedAccounts(userId: string, connectedAccounts: unknown): Promise<void>;
}
