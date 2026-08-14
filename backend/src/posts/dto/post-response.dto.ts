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

export class PostPollOptionDto {
  @ApiProperty({ example: 'opt-1' })
  id!: string;

  @ApiProperty({ example: 'Option A' })
  text!: string;

  @ApiProperty({ example: 0 })
  votesCount!: number;
}

export class PostPollDto {
  @ApiProperty({ example: 'poll-1' })
  id!: string;

  @ApiProperty({ example: 'Poll Title' })
  title!: string;

  @ApiPropertyOptional({ example: null })
  description?: string | null;

  @ApiProperty({ example: false })
  isMultiple!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 0 })
  totalVotes!: number;

  @ApiPropertyOptional({ example: null })
  myVoteOptionId!: string | null;

  @ApiProperty({ type: [PostPollOptionDto] })
  options!: PostPollOptionDto[];
}

export type PostWithRelations = {
  id: string;
  content: string;
  sharesCount?: number;
  authorId: string;
  author?: {
    id: string;
    username: string;
    displayName?: string | null;
    avatar?: string | null;
    isVerified?: boolean;
    primaryBadge?: string | null;
    followers?: { id: string }[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
  media?: PostMedia[];
  poll?: {
    id: string;
    title: string;
    description?: string | null;
    isMultiple: boolean;
    isActive: boolean;
    options: {
      id: string;
      optionText: string;
      votesCount: number;
    }[];
    votes?: { optionId: string }[];
  } | null;
  isFollowing?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  isLiked?: boolean;
  isOwner?: boolean;
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

  @ApiProperty({ example: 'Hello world!' })
  text!: string;

  @ApiProperty({ type: [PostMediaResponseDto] })
  media!: PostMediaResponseDto[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  authorId!: string;

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

  @ApiProperty({
    example: false,
    description: 'Whether the requesting user liked this post.',
  })
  isLiked!: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the requesting user is the owner of this post.',
  })
  isOwner!: boolean;

  @ApiProperty({ example: 0 })
  likesCount!: number;

  @ApiProperty({ example: 0 })
  likes!: number;

  @ApiProperty({ example: 0 })
  repostsCount!: number;

  @ApiProperty({ example: 0 })
  reposts!: number;

  @ApiProperty({ example: 0 })
  sharesCount!: number;

  @ApiProperty({ example: 0 })
  commentsCount!: number;

  @ApiProperty({ example: 0 })
  comments!: number;

  @ApiPropertyOptional({ type: PostPollDto, nullable: true })
  poll?: PostPollDto | null;

  static fromPrisma(this: void, post: PostWithRelations): PostResponseDto {
    const displayName = post.author?.displayName || post.author?.username || 'User';
    const handle = post.author?.username || 'user';
    const avatar = post.author?.avatar || null;
    const isVerified = post.author?.isVerified ?? false;
    const primaryBadge = post.author?.primaryBadge ?? null;

    let pollDto: PostPollDto | null = null;
    if (post.poll) {
      const totalVotes = post.poll.options.reduce((sum, opt) => sum + (opt.votesCount ?? 0), 0);
      const myVoteOptionId = post.poll.votes?.[0]?.optionId ?? null;
      pollDto = {
        id: post.poll.id,
        title: post.poll.title,
        description: post.poll.description,
        isMultiple: post.poll.isMultiple,
        isActive: post.poll.isActive,
        totalVotes,
        myVoteOptionId,
        options: post.poll.options.map((opt) => ({
          id: opt.id,
          text: opt.optionText,
          votesCount: opt.votesCount,
        })),
      };
    }

    return {
      id: post.id,
      content: post.content,
      text: post.content,
      media: post.media ? post.media.map((m) => PostMediaResponseDto.fromPrisma(m)) : [],
      authorId: post.authorId,
      author: displayName,
      handle: handle,
      avatar: avatar,
      isVerified: isVerified,
      primaryBadge: primaryBadge,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      isFollowing: post.isFollowing ?? false,
      isSaved: post.isSaved ?? false,
      isReposted: post.isReposted ?? false,
      isLiked: post.isLiked ?? false,
      isOwner: post.isOwner ?? false,
      likesCount: post._count?.likes ?? 0,
      likes: post._count?.likes ?? 0,
      repostsCount: post._count?.reposts ?? 0,
      reposts: post._count?.reposts ?? 0,
      sharesCount: post.sharesCount ?? 0,
      commentsCount: post._count?.comments ?? 0,
      comments: post._count?.comments ?? 0,
      poll: pollDto,
    };
  }
}
