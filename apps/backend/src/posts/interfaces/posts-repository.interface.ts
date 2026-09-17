import type { Post, Prisma, ReportCategory } from '@prisma/client';
import type { PostWithRelations } from '@common/contracts';

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
  getExploreMediaPosts(
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<PostWithRelations[]>;
  getPostsByHashtag(
    hashtag: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<{ posts: PostWithRelations[]; totalCount: number }>;
  searchPosts(
    query: string,
    limit: number,
    after?: string,
    viewerId?: string,
    mediaOnly?: boolean,
  ): Promise<PostWithRelations[]>;
  editPost(id: string, data: Prisma.PostUpdateInput): Promise<PostWithRelations>;
  deletePost(id: string): Promise<Post>;
  savePost(postId: string, userId: string): Promise<void>;
  unsavePost(postId: string, userId: string): Promise<void>;
  repost(postId: string, userId: string): Promise<void>;
  unrepost(postId: string, userId: string): Promise<void>;
  incrementShareCount(postId: string): Promise<void>;
  incrementManyShareCounts(entries: { postId: string; count: number }[]): Promise<void>;
  createPollForPost(
    authorId: string,
    postId: string,
    title: string,
    options: string[],
  ): Promise<unknown>;
  findMentionUsers(
    usernames: string[],
    excludeUserId: string,
  ): Promise<{ id: string; username: string }[]>;
  findUserBasic(id: string): Promise<{
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  } | null>;
  getPollForVote(postId: string): Promise<{
    id: string;
    isActive: boolean;
    options: { id: string; optionText: string; votesCount: number }[];
    votes: { id: string; userId: string; optionId: string }[];
  } | null>;
  updateVote(voteId: string, oldOptionId: string, newOptionId: string): Promise<void>;
  createVote(pollId: string, optionId: string, userId: string): Promise<void>;
  getPollVoters(postId: string): Promise<{
    options: { id: string }[];
    votes: {
      optionId: string;
      user: { id: string; username: string; displayName?: string | null; avatar?: string | null };
    }[];
  } | null>;
  reportPost(
    postId: string,
    reporterId: string,
    category: ReportCategory,
    details?: string,
  ): Promise<{ id: string }>;
}
