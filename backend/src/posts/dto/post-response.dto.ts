import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PostMedia } from '@prisma/client';
import { MediaType } from '@prisma/client';

export class PostMediaResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.IMAGE })
  type!: MediaType;

  @ApiProperty({ example: 'https://cdn.example.com/image.jpg' })
  url!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/poster.jpg' })
  poster!: string | null;

  @ApiProperty({ example: 0 })
  order!: number;

  static fromPrisma(this: void, media: PostMedia): PostMediaResponseDto {
    return {
      id: media.id,
      type: media.type,
      url: media.url,
      poster: media.poster,
      order: media.order,
    };
  }
}

export type PostWithRelations = {
  id: string;
  content: string;
  sharesCount?: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  media?: PostMedia[];
  isFollowing?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  _count?: {
    likes?: number;
    reposts?: number;
    comments?: number;
  };
};

export class PostResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Hello world!' })
  content!: string;

  @ApiProperty({ type: [PostMediaResponseDto] })
  media!: PostMediaResponseDto[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  authorId!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({
    example: false,
    description: "Whether the requesting user follows this post's author.",
  })
  isFollowing!: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the requesting user saved/bookmarked this post.',
  })
  isSaved!: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the requesting user reposted this post.',
  })
  isReposted!: boolean;

  @ApiProperty({ example: 0 })
  likesCount!: number;

  @ApiProperty({ example: 0 })
  repostsCount!: number;

  @ApiProperty({ example: 0 })
  sharesCount!: number;

  @ApiProperty({ example: 0 })
  commentsCount!: number;

  static fromPrisma(this: void, post: PostWithRelations): PostResponseDto {
    return {
      id: post.id,
      content: post.content,
      media: post.media ? post.media.map((m) => PostMediaResponseDto.fromPrisma(m)) : [],
      authorId: post.authorId,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      isFollowing: post.isFollowing ?? false,
      isSaved: post.isSaved ?? false,
      isReposted: post.isReposted ?? false,
      likesCount: post._count?.likes ?? 0,
      repostsCount: post._count?.reposts ?? 0,
      sharesCount: post.sharesCount ?? 0,
      commentsCount: post._count?.comments ?? 0,
    };
  }
}
