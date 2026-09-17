import type { Prisma } from '@prisma/client';

export const REELS_REPOSITORY = Symbol('REELS_REPOSITORY');

export interface Reel {
  id: string;
  authorId: string;
  caption: string;
  videoUrl: string;
  hlsUrl: string | null;
  thumbnailUrl: string | null;
  blurhash: string | null;
  thumbhash: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  audioTitle: string | null;
  audioArtist: string | null;
  audioUrl: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReelComment {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ReelWithAuthor = Reel & {
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified?: boolean;
    followers?: { followerId: string }[];
  };
  likes?: { userId: string }[];
  _count?: {
    likes: number;
    comments: number;
  };
};

export type ReelCommentWithUser = ReelComment & {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified?: boolean;
  };
};

export interface IReelsRepository {
  findAllPaginated(limit: number, after?: string, viewerId?: string): Promise<ReelWithAuthor[]>;
  findByUserId(
    userId: string,
    limit: number,
    after?: string,
    viewerId?: string,
  ): Promise<ReelWithAuthor[]>;
  findById(id: string, viewerId?: string): Promise<ReelWithAuthor | null>;
  create(data: Prisma.ReelCreateInput): Promise<ReelWithAuthor>;
  update(id: string, data: Prisma.ReelUpdateInput): Promise<ReelWithAuthor>;
  delete(id: string): Promise<void>;
  toggleLike(reelId: string, userId: string): Promise<{ liked: boolean; likesCount: number }>;
  incrementViews(reelId: string): Promise<void>;
  incrementShares(reelId: string): Promise<void>;
  addComment(reelId: string, userId: string, content: string): Promise<ReelCommentWithUser>;
  findComments(reelId: string, limit?: number, after?: string): Promise<ReelCommentWithUser[]>;
  reportReel?(
    reelId: string,
    reporterId: string,
    category: string,
    details?: string,
  ): Promise<void>;
}
