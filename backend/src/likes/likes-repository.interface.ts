import { Like, Post } from '@prisma/client';

export interface ILikesRepository {
  createLike(postId: string, userId: string): Promise<Like>;
  deleteLike(postId: string, userId: string): Promise<void>;
}
