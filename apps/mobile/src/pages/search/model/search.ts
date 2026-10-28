import type { PostResponseDto, UserProfileDto } from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import { feedKeys } from '../../feed/model/queries';
import type { Page } from '../../feed/model/feed';
import { msg } from '@/shared/lib/i18n';

export const searchTabs = [
  msg('All'),
  msg('People'),
  msg('Posts'),
  msg('Hashtags'),
  msg('Media'),
] as const;
export type SearchTab = (typeof searchTabs)[number];
export interface Hashtag {
  tag: string;
  count: number;
}

export const searchKeys = {
  all: feedKeys.search,
  people: (userId: string, term: string) => [...searchKeys.all(userId), 'people', term] as const,
  tags: (userId: string, term: string) => [...searchKeys.all(userId), 'tags', term] as const,
  // Use the same paginated post cache boundary as Feed so actions update both screens.
  posts: (userId: string, term: string, media: boolean) =>
    [...feedKeys.feeds(userId), 'search', term, media] as const,
};

export function searchPostRequest(term: string, media: boolean, after?: string) {
  const q = term.trim().slice(0, 100);
  const params = { after, limit: media ? 18 : 10 };
  if (media && q.startsWith('#') && q.slice(1).trim())
    return { path: `/posts/hashtag/${encodeURIComponent(q.slice(1).trim())}`, params };
  if (!q) return { path: '/posts/explore', params };
  return { path: '/posts/search', params: { ...params, q, mediaOnly: media } };
}

export const searchApi = {
  people: async (term: string, signal: AbortSignal) =>
    (await getMobileApi().get<UserProfileDto[]>('/users/search', { params: { q: term }, signal }))
      .data,
  tags: async (term: string, signal: AbortSignal) =>
    (
      await getMobileApi().get<Hashtag[]>('/users/hashtags', {
        params: { q: term.replace(/^#/, '').trim() },
        signal,
      })
    ).data,
  trending: async (signal: AbortSignal) =>
    (
      await getMobileApi().get<Hashtag[]>('/users/trending-hashtags', {
        params: { limit: 6 },
        signal,
      })
    ).data,
  top: async (signal: AbortSignal) =>
    (await getMobileApi().get<UserProfileDto[]>('/users/top', { params: { limit: 5 }, signal }))
      .data,
  posts: async (term: string, media: boolean, after: string | undefined, signal: AbortSignal) => {
    const { path, params } = searchPostRequest(term, media, after);
    return (await getMobileApi().get<Page<PostResponseDto>>(path, { params, signal })).data;
  },
};

export function addRecentSearch(recent: string[], term: string): string[] {
  const value = term.trim().slice(0, 100);
  return value
    ? [
        value,
        ...recent.filter((item) => item.toLocaleLowerCase() !== value.toLocaleLowerCase()),
      ].slice(0, 10)
    : recent;
}

export function parseRecentSearches(value: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]');
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is string =>
              typeof item === 'string' && !!item.trim() && item.length <= 100,
          )
          .slice(0, 10)
      : [];
  } catch {
    return [];
  }
}
