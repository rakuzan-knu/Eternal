export interface AvatarView {
  id: string;
  avatar: string | null;
}

export interface IAvatarRepository {
  findById(userId: string): Promise<AvatarView | null>;
  updateAvatar(userId: string, avatar: string | null): Promise<AvatarView>;
}

export const AVATAR_REPOSITORY = 'AVATAR_REPOSITORY';
