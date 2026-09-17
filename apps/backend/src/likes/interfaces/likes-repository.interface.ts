import type { Like } from '@prisma/client';

export const LIKES_REPOSITORY = Symbol('LIKES_REPOSITORY');

export interface ILikesRepository {
  createLike(postId: string, userId: string): Promise<Like>;
  deleteLike(postId: string, userId: string): Promise<void>;
}
