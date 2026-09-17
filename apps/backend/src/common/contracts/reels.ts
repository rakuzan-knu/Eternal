import { z } from 'zod';

export const createReelSchema = z.object({
  caption: z.string().max(2000).default('').optional(),
  audioTitle: z.string().max(128).optional(),
  audioArtist: z.string().max(128).optional(),
  audioUrl: z.string().url().max(2048).optional(),
  duration: z.coerce.number().positive().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export type CreateReelDto = z.infer<typeof createReelSchema>;

export const createReelCommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});

export type CreateReelCommentDto = z.infer<typeof createReelCommentSchema>;

export const getReelsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  after: z.string().max(128).optional(),
});

export type GetReelsQueryDto = z.infer<typeof getReelsQuerySchema>;

export const reportReelSchema = z.object({
  category: z.string().min(1).max(100),
  details: z.string().max(1000).optional(),
});

export type ReportReelDto = z.infer<typeof reportReelSchema>;

export interface ReelAuthorDto {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean | undefined;
  isFollowing?: boolean | undefined;
}

export interface ReelResponseDto {
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
  isLiked?: boolean;
  createdAt: string;
  author: ReelAuthorDto;
}

export interface ReelCommentResponseDto {
  id: string;
  reelId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: ReelAuthorDto;
}
