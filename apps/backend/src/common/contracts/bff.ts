import { z } from 'zod';
import type { PostWithRelations } from './posts';

export const getCompactFeedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  after: z.string().max(128).optional(),
  algorithm: z.enum(['latest', 'ml']).default('latest').optional(),
});
export type GetCompactFeedQueryDto = z.infer<typeof getCompactFeedQuerySchema>;

export class CompactAuthorDto {
  id!: string;
  username!: string;
  displayName!: string;
  avatar!: string | null;
  isVerified!: boolean;
}

export class CompactMediaPreviewDto {
  type!: 'IMAGE' | 'VIDEO';
  url!: string;
  poster?: string | null;
  totalCount!: number;
}

export class CompactStatsDto {
  likes!: number;
  comments!: number;
  reposts!: number;
}

export class CompactViewerStateDto {
  isLiked!: boolean;
  isSaved!: boolean;
  isReposted!: boolean;
  isOwner!: boolean;
}

export class CompactPostDto {
  id!: string;
  author!: CompactAuthorDto;
  content!: string;
  mediaPreview?: CompactMediaPreviewDto | null;
  stats!: CompactStatsDto;
  viewer!: CompactViewerStateDto;
  createdAt!: string;

  static fromPost(this: void, post: PostWithRelations): CompactPostDto {
    const author: CompactAuthorDto = {
      id: post.authorId,
      username: post.author?.username || 'user',
      displayName: post.author?.displayName || post.author?.username || 'User',
      avatar: post.author?.avatar || null,
      isVerified: Boolean(post.author?.isVerified),
    };

    let mediaPreview: CompactMediaPreviewDto | null = null;
    if (post.media && post.media.length > 0) {
      const first = post.media[0];
      if (first) {
        mediaPreview = {
          type: first.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          url: first.url,
          poster: first.poster ?? null,
          totalCount: post.media.length,
        };
      }
    }

    const stats: CompactStatsDto = {
      likes: post._count?.likes ?? 0,
      comments: post._count?.comments ?? 0,
      reposts: post._count?.reposts ?? 0,
    };

    const viewer: CompactViewerStateDto = {
      isLiked: Boolean(post.isLiked),
      isSaved: Boolean(post.isSaved),
      isReposted: Boolean(post.isReposted),
      isOwner: Boolean(post.isOwner),
    };

    const createdAt =
      post.createdAt instanceof Date ? post.createdAt.toISOString() : String(post.createdAt || '');

    return {
      id: post.id,
      author,
      content: post.content,
      mediaPreview,
      stats,
      viewer,
      createdAt,
    };
  }
}

export class CompactFeedMetaDto {
  nextCursor!: string | null;
  hasMore!: boolean;
  count!: number;
}

export class CompactFeedResponseDto {
  data!: CompactPostDto[];
  meta!: CompactFeedMetaDto;
}
