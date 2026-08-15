import { z } from 'zod';
import type { Comment } from '@prisma/client';

export const createCommentSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(1000)
    .transform((val) => val.trim()),
  parentId: z.string().optional(),
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;

export const getCommentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
});
export type GetCommentsQueryDto = z.infer<typeof getCommentsQuerySchema>;

export type CommentWithUser = Comment & {
  user?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    isVerified?: boolean;
    primaryBadge?: string | null;
  } | null;
};

export class CommentResponseDto {
  id!: string;
  text!: string;
  postId!: string;
  userId!: string;
  author!: string;
  handle!: string;
  avatar!: string | null;
  isVerified!: boolean;
  primaryBadge!: string | null;
  parentId!: string | null;
  createdAt!: string;

  static fromPrisma(this: void, comment: CommentWithUser): CommentResponseDto {
    const displayName = comment.user?.displayName || comment.user?.username || 'User';
    const handle = comment.user?.username || 'user';
    const avatar = comment.user?.avatar || null;
    const isVerified = comment.user?.isVerified ?? false;
    const primaryBadge = comment.user?.primaryBadge ?? null;

    return {
      id: comment.id,
      text: comment.text,
      postId: comment.postId,
      userId: comment.userId,
      author: displayName,
      handle,
      avatar,
      isVerified,
      primaryBadge,
      parentId: comment.parentId ?? null,
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
