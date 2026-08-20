import { z } from 'zod';
import { MediaType, ReportCategory, type PostMedia } from '@prisma/client';
export { MediaType, ReportCategory };

export const mediaSchema = z.object({
  type: z.nativeEnum(MediaType),
  url: z.string().url(),
  poster: z.string().url().optional(),
  order: z.number().int().optional(),
});
export type MediaDto = z.infer<typeof mediaSchema>;

export const createPostSchema = z.object({
  content: z
    .string()
    .transform((val) => val.trim())
    .optional(),
  media: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, z.array(mediaSchema))
    .optional(),
  gifUrls: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          const parsed: unknown = JSON.parse(val);
          return Array.isArray(parsed) ? (parsed as string[]) : [val];
        } catch {
          return [val];
        }
      }
      return val;
    }, z.array(z.string()))
    .optional(),
  poll: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        try {
          const parsed: unknown = JSON.parse(val);
          return Array.isArray(parsed) ? (parsed as string[]) : [val];
        } catch {
          return [val];
        }
      }
      return val;
    }, z.array(z.string()))
    .optional(),
});
export type CreatePostDto = z.infer<typeof createPostSchema>;

export const editPostSchema = z.object({
  content: z
    .string()
    .min(1)
    .transform((val) => val.trim())
    .optional(),
  image: z.string().url().optional(),
});
export type EditPostDto = z.infer<typeof editPostSchema>;

export const getPostsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
});
export type GetPostsQueryDto = z.infer<typeof getPostsQuerySchema>;

export const searchPostsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  after: z.string().optional(),
  mediaOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});
export type SearchPostsDto = z.infer<typeof searchPostsSchema>;

export const reportPostSchema = z.object({
  category: z.nativeEnum(ReportCategory),
  details: z.string().max(1000).optional(),
});
export type ReportPostDto = z.infer<typeof reportPostSchema>;

export class PostMediaResponseDto {
  id!: string;
  type!: MediaType;
  url!: string;
  poster!: string | null;
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
  id!: string;
  text!: string;
  votesCount!: number;
}

export class PostPollDto {
  id!: string;
  title!: string;
  description?: string | null;
  isMultiple!: boolean;
  isActive!: boolean;
  totalVotes!: number;
  myVoteOptionId!: string | null;
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
  isPinned?: boolean;
  pinnedAt?: Date | null;
  editedAt?: Date | string | null;
  _count?: {
    likes?: number;
    reposts?: number;
    comments?: number;
  };
};

function toSafeIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (
    typeof val === 'object' &&
    'toISOString' in val &&
    typeof (val as { toISOString: () => string }).toISOString === 'function'
  ) {
    return (val as { toISOString: () => string }).toISOString();
  }
  const parsed = new Date(val as string | number);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toSafeDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export class PostResponseDto {
  id!: string;
  content!: string;
  text!: string;
  media!: PostMediaResponseDto[];
  authorId!: string;
  author!: string;
  handle!: string;
  avatar!: string | null;
  isVerified!: boolean;
  primaryBadge!: string | null;
  createdAt!: string;
  updatedAt!: string;
  editedAt?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | null;
  isFollowing!: boolean;
  isSaved!: boolean;
  isReposted!: boolean;
  isLiked!: boolean;
  isOwner!: boolean;
  likesCount!: number;
  likes!: number;
  repostsCount!: number;
  reposts!: number;
  sharesCount!: number;
  commentsCount!: number;
  comments!: number;
  poll?: PostPollDto | null;

  static fromPrisma(this: void, post: PostWithRelations): PostResponseDto {
    const displayName = post.author?.displayName || post.author?.username || 'User';
    const handle = post.author?.username || 'user';
    const avatar = post.author?.avatar || null;
    const isVerified = Boolean(post.author?.isVerified);
    const primaryBadge = post.author?.primaryBadge ?? null;

    let pollDto: PostPollDto | null = null;
    if (post.poll) {
      const totalVotes = post.poll.options.reduce((sum, opt) => sum + (opt.votesCount ?? 0), 0);
      const myVoteOptionId = post.poll.votes?.[0]?.optionId ?? null;
      pollDto = {
        id: post.poll.id,
        title: post.poll.title,
        description: post.poll.description ?? null,
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

    const createdDate = toSafeDate(post.createdAt);
    const updatedDate = toSafeDate(post.updatedAt);

    const isEdited =
      post.editedAt != null
        ? toSafeIsoString(post.editedAt)
        : updatedDate && createdDate && updatedDate.getTime() > createdDate.getTime() + 1000
          ? toSafeIsoString(updatedDate)
          : null;

    const isPinned = Boolean(post.isPinned);
    const pinnedAt = post.pinnedAt
      ? toSafeIsoString(post.pinnedAt)
      : isPinned
        ? toSafeIsoString(post.createdAt)
        : null;

    return {
      id: post.id,
      content: post.content,
      text: post.content,
      media: post.media ? post.media.map((m) => PostMediaResponseDto.fromPrisma(m)) : [],
      authorId: post.authorId,
      author: displayName,
      handle,
      avatar,
      isVerified,
      primaryBadge,
      createdAt: toSafeIsoString(post.createdAt),
      updatedAt: toSafeIsoString(post.updatedAt),
      editedAt: isEdited,
      isPinned,
      pinnedAt,
      isFollowing: Boolean(post.isFollowing),
      isSaved: Boolean(post.isSaved),
      isReposted: Boolean(post.isReposted),
      isLiked: Boolean(post.isLiked),
      isOwner: Boolean(post.isOwner),
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
