import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Comment } from '@prisma/client';

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
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  id!: string;

  @ApiProperty({ example: 'Great post!' })
  text!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  postId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId!: string;

  @ApiProperty({ example: 'Ayate' })
  author!: string;

  @ApiProperty({ example: 'ayate' })
  handle!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  avatar!: string | null;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiPropertyOptional({ example: null })
  primaryBadge!: string | null;

  @ApiPropertyOptional({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  parentId!: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
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
