import type { Post, Prisma, ReportCategory } from '@prisma/client';
import type { PostWithRelations } from '../dto/post-response.dto';

export const POSTS_REPOSITORY = Symbol('POSTS_REPOSITORY');

export interface IPostRepository {
  createPost(data: Prisma.PostCreateInput): Promise<PostWithRelations>;
  getAllPosts(limit: number, after?: string, viewerId?: string): Promise<PostWithRelations[]>;
  getPostById(id: string, viewerId?: string): Promise<PostWithRelations | null>;
  getPostsByUserId(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]>;
  getRepostsByUserId(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]>;
  getSavedPostsByUserId(
    userId: string,
    limit: number,
    after?: string,
  ): Promise<PostWithRelations[]>;
  editPost(id: string, data: Prisma.PostUpdateInput): Promise<PostWithRelations>;
  deletePost(id: string): Promise<Post>;
  savePost(postId: string, userId: string): Promise<void>;
  unsavePost(postId: string, userId: string): Promise<void>;
  repost(postId: string, userId: string): Promise<void>;
  unrepost(postId: string, userId: string): Promise<void>;
  reportPost(
    postId: string,
    reporterId: string,
    category: ReportCategory,
    details?: string,
  ): Promise<{ id: string }>;
}
