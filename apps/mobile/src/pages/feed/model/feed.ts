import type { InfiniteData } from '@tanstack/react-query';
import type { PostResponseDto } from '@social-network/shared-contracts';
import { formatDate, tr } from '@/shared/lib/i18n';

export interface Page<T> {
  data: T[];
  meta: { nextCursor: string | null; hasNextPage: boolean };
}

export type FeedData = InfiniteData<Page<PostResponseDto>>;
export type PostAction = 'like' | 'save' | 'repost';
export type FeedMode = 'home' | 'saved';

export function uniquePosts(data: FeedData | undefined): PostResponseDto[] {
  const seen = new Set<string>();
  return (data?.pages.flatMap((page) => page.data) ?? []).filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

export function nextCursor<T>(page: Page<T>, pages: Page<T>[]): string | undefined {
  const cursor = page.meta.nextCursor;
  // Stop if a server repeats a cursor instead of requesting the same page forever.
  if (
    !page.meta.hasNextPage ||
    !cursor ||
    pages.slice(0, -1).some((p) => p.meta.nextCursor === cursor)
  ) {
    return undefined;
  }
  return cursor;
}

export function applyPostAction(
  post: PostResponseDto,
  action: PostAction,
  active: boolean,
): PostResponseDto {
  if (action === 'save') return { ...post, isSaved: active };
  if (action === 'like') {
    const count = Math.max(0, post.likesCount + Number(active) - Number(post.isLiked));
    return { ...post, isLiked: active, likes: count, likesCount: count };
  }
  const count = Math.max(0, post.repostsCount + Number(active) - Number(post.isReposted));
  return { ...post, isReposted: active, reposts: count, repostsCount: count };
}

export function updateFeed(
  data: FeedData | undefined,
  id: string,
  update: (post: PostResponseDto) => PostResponseDto,
): FeedData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((post) => (post.id === id ? update(post) : post)),
    })),
  };
}

export function relativeTime(value: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return tr('now');
  if (seconds < 3600) return tr('{count}m', { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return tr('{count}h', { count: Math.floor(seconds / 3600) });
  if (seconds < 604800) return tr('{count}d', { count: Math.floor(seconds / 86400) });
  return formatDate(value, { month: 'short', day: 'numeric' });
}
