import { apiClient as api } from '@/shared/api/httpClient';
import { PostType, PollVoterGroup } from '../model/types';

export interface FeedPage {
  posts: PostType[];
  nextCursor: string | null;
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

  const authorObj = raw.author as Record<string, unknown> | undefined;

  const authorName =
    (raw.author as string | undefined) ??
    (raw.authorName as string | undefined) ??
    (authorObj?.displayName as string | undefined) ??
    (authorObj?.username as string | undefined) ??
    'User';

  const handle =
    (raw.handle as string | undefined) ??
    (authorObj?.username as string | undefined) ??
    (raw.username as string | undefined) ??
    'user';
  const avatar =
    (raw.avatar as string | null | undefined) ??
    (authorObj?.avatar as string | null | undefined) ??
    null;
  const isVerified =
    (raw.isVerified as boolean | undefined) ??
    (authorObj?.isVerified as boolean | undefined) ??
    false;
  const primaryBadge =
    (raw.primaryBadge as string | null | undefined) ??
    (authorObj?.primaryBadge as string | null | undefined) ??
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
  getFeed: (after?: string, limit = 10): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/posts', { params: { after, limit } })
      .then((r) => normalizeFeedPage(r.data)),

  getUserPosts: (userId: string, after?: string): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/posts`, { params: { after } })
      .then((r) => normalizeFeedPage(r.data)),

  getUserReposts: (userId: string, after?: string): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>(`/users/${userId}/reposts`, { params: { after } })
      .then((r) => normalizeFeedPage(r.data)),

  getPollVoters: (postId: string | number): Promise<PollVoterGroup[]> =>
    api.get<PollVoterGroup[]>(`/posts/${postId}/poll/voters`).then((r) => r.data),

  getSavedPosts: (after?: string, limit = 10): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/users/me/saved-posts', { params: { after, limit } })
      .then((r) => normalizeFeedPage(r.data)),

  getPostById: (postId: string): Promise<PostType> =>
    api.get<Record<string, unknown>>(`/posts/${postId}`).then((r) => normalizePost(r.data)),

  getExplorePosts: (after?: string, limit = 9): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/posts/explore', { params: { after, limit } })
      .then((r) => normalizeFeedPage(r.data)),

  getPostsByHashtag: (
    tag: string,
    after?: string,
    limit = 9,
  ): Promise<FeedPage & { totalCount?: number }> =>
    api
      .get<Record<string, unknown>>(
        `/posts/hashtag/${encodeURIComponent(tag.replace(/^#+/, ''))}`,
        {
          params: { after, limit },
        },
      )
      .then((r) => {
        const page = normalizeFeedPage(r.data);
        return {
          ...page,
          totalCount: r.data?.totalCount as number | undefined,
        };
      }),

  searchPosts: (query: string, after?: string, limit = 10, mediaOnly = false): Promise<FeedPage> =>
    api
      .get<Record<string, unknown>>('/posts/search', {
        params: { q: query, after, limit, mediaOnly: mediaOnly ? 'true' : undefined },
      })
      .then((r) => normalizeFeedPage(r.data)),
};
