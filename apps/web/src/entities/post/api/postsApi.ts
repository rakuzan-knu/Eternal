import { apiClient as api } from '@/shared/api/httpClient';
import { PostType, PollVoterGroup } from '../model/types';

export interface FeedPage {
  posts: PostType[];
  nextCursor: string | null;
}

export interface CompactAuthor {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  isVerified: boolean;
}

export interface CompactMediaPreview {
  type: 'IMAGE' | 'VIDEO';
  url: string;
  poster?: string | null;
  totalCount: number;
}

export interface CompactPostItem {
  id: string;
  author: CompactAuthor;
  content: string;
  mediaPreview?: CompactMediaPreview | null;
  stats: {
    likes: number;
    comments: number;
    reposts: number;
  };
  viewer: {
    isLiked: boolean;
    isSaved: boolean;
    isReposted: boolean;
    isOwner: boolean;
  };
  createdAt: string;
}

export interface CompactFeedResponse {
  data: CompactPostItem[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    count: number;
  };
}

export function normalizePost(raw: Record<string, unknown> | null | undefined): PostType {
  if (!raw) {
    return {
      id: '',
      authorId: '',
      author: 'User',
      handle: 'user',
      text: '',
      createdAt: new Date().toISOString(),
    };
  }

  const authorObj =
    typeof raw.author === 'object' && raw.author !== null
      ? (raw.author as Record<string, unknown>)
      : undefined;

  const authorName =
    (authorObj?.displayName as string | undefined) ??
    (authorObj?.username as string | undefined) ??
    (typeof raw.author === 'string' ? raw.author : undefined) ??
    (raw.authorName as string | undefined) ??
    'User';

  const handle =
    (authorObj?.username as string | undefined) ??
    (typeof raw.handle === 'string' ? raw.handle : undefined) ??
    (typeof raw.username === 'string' ? raw.username : undefined) ??
    'user';
  const avatar =
    (authorObj?.avatar as string | null | undefined) ??
    (raw.avatar as string | null | undefined) ??
    null;
  const isVerified =
    (authorObj?.isVerified as boolean | undefined) ??
    (raw.isVerified as boolean | undefined) ??
    false;
  const primaryBadge =
    (authorObj?.primaryBadge as string | null | undefined) ??
    (raw.primaryBadge as string | null | undefined) ??
    null;
  const text = (raw.text as string | undefined) ?? (raw.content as string | undefined) ?? '';

  const rawMedia = raw.media;
  const media: PostType['media'] = Array.isArray(rawMedia)
    ? rawMedia.map((m: Record<string, unknown>) => ({
        type:
          ((m.type as string) ?? 'image').toLowerCase() === 'video'
            ? ('video' as const)
            : ('image' as const),
        url: (m.url as string) ?? '',
        poster: (m.poster as string) ?? undefined,
      }))
    : [];

  const image = (raw.image as string | undefined) ?? media.find((m) => m.type === 'image')?.url;

  return {
    id: (raw.id as string) ?? '',
    authorId: (raw.authorId as string) ?? '',
    author: authorName,
    handle,
    avatar,
    text,
    createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
    editedAt:
      (raw.editedAt as string | undefined) ??
      (raw.updatedAt &&
      new Date(raw.updatedAt as string).getTime() >
        new Date((raw.createdAt as string) || 0).getTime() + 1000
        ? (raw.updatedAt as string)
        : undefined),
    isPinned: Boolean(raw.isPinned),
    pinnedAt:
      (raw.pinnedAt as string | undefined) ??
      (raw.isPinned ? ((raw.createdAt as string) ?? new Date().toISOString()) : undefined),
    isVerified,
    primaryBadge,
    type: raw.type as PostType['type'],
    repostedBy: raw.repostedBy as string | undefined,
    media,
    image,
    poll: (raw.poll as PostType['poll']) ?? null,
    comments: (raw.comments as number) ?? (raw.commentsCount as number) ?? 0,
    reposts: (raw.reposts as number) ?? (raw.repostsCount as number) ?? 0,
    likes: (raw.likes as number) ?? (raw.likesCount as number) ?? 0,
    sharesCount: (raw.sharesCount as number) ?? 0,
    isLiked: Boolean(raw.isLiked),
    isReposted: Boolean(raw.isReposted),
    isSaved: Boolean(raw.isSaved),
    isFollowing: Boolean(raw.isFollowing),
    isOwner: Boolean(raw.isOwner),
    commentList: (raw.commentList as PostType['commentList']) ?? [],
  };
}

export function normalizeFeedPage(resData: Record<string, unknown> | null | undefined): FeedPage {
  if (!resData) return { posts: [], nextCursor: null };

  const rawList = Array.isArray(resData.data)
    ? resData.data
    : Array.isArray(resData.posts)
      ? resData.posts
      : Array.isArray(resData)
        ? resData
        : [];

  const meta = resData.meta as { nextCursor?: string | null } | undefined;
  const nextCursor = meta?.nextCursor ?? (resData.nextCursor as string | null | undefined) ?? null;
  const posts = (rawList as Record<string, unknown>[]).filter(Boolean).map(normalizePost);

  return { posts, nextCursor };
}

export const postsApi = {
  getFeed: (after?: string, limit = 10, signal?: AbortSignal): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/posts', {
        params: { after, limit },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFeedPage(r.data)),

  getUserPosts: (userId: string, after?: string, signal?: AbortSignal): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/posts`, {
        params: { after },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFeedPage(r.data)),

  getUserReposts: (userId: string, after?: string, signal?: AbortSignal): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/reposts`, {
        params: { after },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFeedPage(r.data)),

  getPollVoters: (postId: string | number, signal?: AbortSignal): Promise<PollVoterGroup[]> =>
    api
      .get<PollVoterGroup[]>(`/posts/${postId}/poll/voters`, ...(signal ? [{ signal }] : []))
      .then((r) => r.data),

  getSavedPosts: (after?: string, limit = 10, signal?: AbortSignal): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/users/me/saved-posts', {
        params: { after, limit },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFeedPage(r.data)),

  getPostById: (postId: string, signal?: AbortSignal): Promise<PostType> =>
    api
      .get<Record<string, unknown>>(`/posts/${postId}`, ...(signal ? [{ signal }] : []))
      .then((r) => normalizePost(r.data)),

  getExplorePosts: (after?: string, limit = 9, signal?: AbortSignal): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/posts/explore', {
        params: { after, limit },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFeedPage(r.data)),

  getPostsByHashtag: (
    tag: string,
    after?: string,
    limit = 9,
    signal?: AbortSignal,
  ): Promise<FeedPage & { totalCount?: number }> =>
    api
      .get<Record<string, unknown>>(
        `/posts/hashtag/${encodeURIComponent(tag.replace(/^#+/, ''))}`,
        {
          params: { after, limit },
          ...(signal ? { signal } : {}),
        },
      )
      .then((r) => {
        const page = normalizeFeedPage(r.data);
        return {
          ...page,
          totalCount: r.data?.totalCount as number | undefined,
        };
      }),

  searchPosts: (
    query: string,
    after?: string,
    limit = 10,
    mediaOnly = false,
    signal?: AbortSignal,
  ): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/posts/search', {
        params: { q: query, after, limit, mediaOnly: mediaOnly ? 'true' : undefined },
        ...(signal ? { signal } : {}),
      })
      .then((r) => normalizeFeedPage(r.data)),

  editPost: (
    postId: string | number,
    dto: { content: string },
    signal?: AbortSignal,
  ): Promise<PostType> =>
    api
      .patch<Record<string, unknown>>(`/posts/${postId}`, dto, ...(signal ? [{ signal }] : []))
      .then((r) => normalizePost(r.data)),

  deletePost: (postId: string | number, signal?: AbortSignal): Promise<unknown> =>
    api.delete(`/posts/${postId}`, ...(signal ? [{ signal }] : [])).then((r) => r.data),

  reportPost: (postId: string | number, reason: string, signal?: AbortSignal): Promise<unknown> =>
    api
      .post(`/posts/${postId}/report`, { reason }, ...(signal ? [{ signal }] : []))
      .then((r) => r.data),

  pinPost: (postId: string | number, signal?: AbortSignal): Promise<PostType> =>
    api
      .post<Record<string, unknown>>(`/posts/${postId}/pin`, ...(signal ? [{}, { signal }] : []))
      .then((r) => normalizePost(r.data)),

  unpinPost: (postId: string | number, signal?: AbortSignal): Promise<PostType> =>
    api
      .delete<Record<string, unknown>>(`/posts/${postId}/pin`, ...(signal ? [{ signal }] : []))
      .then((r) => normalizePost(r.data)),

  getCompactFeed: (
    after?: string,
    limit = 20,
    algorithm: 'latest' | 'ml' = 'latest',
    signal?: AbortSignal,
  ): Promise<CompactFeedResponse> =>
    api
      .get<CompactFeedResponse>('/feed/compact', {
        params: { after, limit, algorithm },
        ...(signal ? { signal } : {}),
      })
      .then((r) => r.data),
};
