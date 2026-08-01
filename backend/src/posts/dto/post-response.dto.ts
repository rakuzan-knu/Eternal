import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Post } from '@prisma/client';

export class PostResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Hello world!' })
  content!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/image.jpg' })
  image!: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  authorId!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(post: Post): PostResponseDto {
    return {
      id: post.id,
      content: post.content,
      image: post.image,
      authorId: post.authorId,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
