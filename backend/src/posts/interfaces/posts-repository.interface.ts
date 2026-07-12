import type { Post, Prisma } from '@prisma/client';

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');

export interface IPostRepository {
  createPost(data: Prisma.PostCreateInput): Promise<Post>;
  getAllPosts(limit: number, after?: string): Promise<Post[]>;
  getPostById(id: string): Promise<Post | null>;
  editPost(id: string, data: Prisma.PostUpdateInput): Promise<Post>;
  deletePost(id: string): Promise<Post>;
}
