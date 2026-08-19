import { z } from 'zod';
import type { Comment } from '@prisma/client';

export const createCommentSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(1000)
    .transform((val) => val.trim()),
  parentId: z.string().optional(),
  replyToUserId: z.string().optional(),
  mediaUrl: z.string().optional().or(z.string().length(0)),
  clientMutationId: z.string().optional(),
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
  replyToUser?: {
    id: string;
    username: string;
    displayName: string | null;
  } | null;
  _count?: {
    replies?: number;
    likes?: number;
  } | null;
  likes?: { userId: string }[];
  isLiked?: boolean;
  isLikedByAuthor?: boolean;
  likesCount?: number;
  replyCount?: number;
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
  rootParentId!: string | null;
  replyToUserId!: string | null;
  replyToUser!: { id: string; username: string; displayName: string | null } | null;
  mediaUrl!: string | null;
  likesCount!: number;
  replyCount!: number;
  isLiked!: boolean;
  isLikedByAuthor!: boolean;
  isPinned!: boolean;
  isDeleted!: boolean;
  createdAt!: string;

  static fromPrisma(
    this: void,
    comment: CommentWithUser,
    viewerId?: string,
    postAuthorId?: string,
  ): CommentResponseDto {
    const displayName = comment.user?.displayName || comment.user?.username || 'User';
    const handle = comment.user?.username || 'user';
    const avatar = comment.user?.avatar || null;
    const isVerified = comment.user?.isVerified ?? false;
    const primaryBadge = comment.user?.primaryBadge ?? null;

    const likesCount =
      comment.likesCount ??
      comment._count?.likes ??
      (Array.isArray(comment.likes) ? comment.likes.length : 0);

    const replyCount = comment.replyCount ?? comment._count?.replies ?? 0;

    const isLiked =
      comment.isLiked !== undefined
        ? comment.isLiked
        : Boolean(viewerId && comment.likes?.some((l) => l.userId === viewerId));

    const isLikedByAuthor =
      comment.isLikedByAuthor !== undefined
        ? comment.isLikedByAuthor
        : Boolean(postAuthorId && comment.likes?.some((l) => l.userId === postAuthorId));

    return {
      id: comment.id,
      text: comment.isDeleted ? '[Comment deleted]' : comment.text,
      postId: comment.postId,
      userId: comment.userId,
      author: displayName,
      handle,
      avatar,
      isVerified,
      primaryBadge,
      parentId: comment.parentId ?? null,
      rootParentId: comment.rootParentId ?? null,
      replyToUserId: comment.replyToUserId ?? null,
      replyToUser: comment.replyToUser
        ? {
            id: comment.replyToUser.id,
            username: comment.replyToUser.username,
            displayName: comment.replyToUser.displayName || comment.replyToUser.username,
          }
        : null,
      mediaUrl: comment.isDeleted ? null : (comment.mediaUrl ?? null),
      likesCount,
      replyCount,
      isLiked,
      isLikedByAuthor,
      isPinned: comment.isPinned ?? false,
      isDeleted: comment.isDeleted ?? false,
      createdAt: comment.createdAt
        ? typeof comment.createdAt === 'string'
          ? comment.createdAt
          : comment.createdAt instanceof Date
            ? comment.createdAt.toISOString()
            : new Date(comment.createdAt).toISOString()
        : new Date().toISOString(),
    };
  }
}
