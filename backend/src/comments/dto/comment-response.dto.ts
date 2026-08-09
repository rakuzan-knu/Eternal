import { ApiProperty } from '@nestjs/swagger';
import type { Comment } from '@prisma/client';

export class CommentResponseDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  id!: string;

  @ApiProperty({ example: 'Great post!' })
  text!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  postId!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  userId!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;

  static fromPrisma(this: void, comment: Comment): CommentResponseDto {
    return {
      id: comment.id,
      text: comment.text,
      postId: comment.postId,
      userId: comment.userId,
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
