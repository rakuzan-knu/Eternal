import type { CommentResponseDto } from '@backend/common/contracts';

export interface CommentType extends Omit<Partial<CommentResponseDto>, 'id' | 'replyToUser'> {
  id: string;
  author: string;
  avatar?: string | null;
  handle: string;
  text: string;
  time?: string;
  parentId?: string | null;
  rootParentId?: string | null;
  replyToUserId?: string | null;
  replyToUser?: { id: string; username: string; displayName?: string | null } | null;
  mediaUrl?: string | null;
  userId?: string;
  createdAt?: string;
  isVerified?: boolean;
  primaryBadge?: string | null;
  likesCount?: number;
  replyCount?: number;
  isLiked?: boolean;
  isLikedByAuthor?: boolean;
  isPinned?: boolean;
  isDeleted?: boolean;
}
