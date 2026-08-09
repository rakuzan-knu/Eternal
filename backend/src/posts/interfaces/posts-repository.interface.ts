import type { Post, Prisma } from '@prisma/client';
import type { PostWithFollowing } from '../dto/post-response.dto';

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');

export interface IPostRepository {
  createPost(data: Prisma.PostCreateInput): Promise<Post>;
  getAllPosts(limit: number, after?: string, viewerId?: string): Promise<PostWithFollowing[]>;
  getPostById(id: string, viewerId?: string): Promise<PostWithFollowing | null>;
  editPost(id: string, data: Prisma.PostUpdateInput): Promise<Post>;
  deletePost(id: string): Promise<Post>;
}
