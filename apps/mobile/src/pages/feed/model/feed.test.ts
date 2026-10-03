import { describe, expect, it } from 'vitest';
import type { PostResponseDto } from '@social-network/shared-contracts';
import {
  applyPostAction,
  nextCursor,
  relativeTime,
  uniquePosts,
  updateFeed,
  type FeedData,
  type Page,
} from './feed';

const post: PostResponseDto = {
  id: 'p1',
  authorId: 'u1',
  author: 'Ada',
  handle: 'ada',
  avatar: null,
  content: 'Hello',
  text: 'Hello',
  media: [],
  isVerified: false,
  primaryBadge: null,
  createdAt: '2026-10-02T12:00:00Z',
  updatedAt: '2026-10-02T12:00:00Z',
  isFollowing: true,
  isSaved: false,
  isLiked: false,
  isReposted: false,
  isOwner: false,
  likes: 0,
  likesCount: 0,
  comments: 0,
  commentsCount: 0,
  reposts: 0,
  repostsCount: 0,
  sharesCount: 0,
};
const page = (data: PostResponseDto[], cursor: string | null = null): Page<PostResponseDto> => ({
  data,
  meta: { nextCursor: cursor, hasNextPage: !!cursor },
});

describe('feed pagination and cache updates', () => {
  it('deduplicates overlapping pages while retaining server order', () => {
    const data: FeedData = {
      pages: [page([post], 'p1'), page([post, { ...post, id: 'p2' }])],
      pageParams: [undefined, 'p1'],
    };
    expect(uniquePosts(data).map((item) => item.id)).toEqual(['p1', 'p2']);
    expect(uniquePosts(undefined)).toEqual([]);
  });
  it('stops pagination for exhausted and repeating cursors', () => {
    const first = page([post], 'p1');
    expect(nextCursor(first, [first])).toBe('p1');
    expect(nextCursor(first, [first, first])).toBeUndefined();
    expect(nextCursor(page([]), [first, page([])])).toBeUndefined();
    expect(
      nextCursor({ data: [], meta: { nextCursor: 'p1', hasNextPage: false } }, []),
    ).toBeUndefined();
  });
  it('applies confirmed reactions idempotently and keeps count aliases aligned', () => {
    const liked = applyPostAction(post, 'like', true);
    expect(liked).toMatchObject({ likes: 1, likesCount: 1, isLiked: true });
    expect(applyPostAction(liked, 'like', true)).toEqual(liked);
    expect(applyPostAction(liked, 'like', false)).toMatchObject({ likes: 0, likesCount: 0 });
    expect(applyPostAction({ ...post, isLiked: true }, 'like', false).likesCount).toBe(0);
    expect(applyPostAction(post, 'repost', true)).toMatchObject({
      reposts: 1,
      repostsCount: 1,
      isReposted: true,
    });
  });
  it('updates every cached occurrence without losing a concurrent saved state', () => {
    const original: FeedData = {
      pages: [page([post]), page([post])],
      pageParams: [undefined, 'p1'],
    };
    const saved = updateFeed(original, 'p1', (item) => applyPostAction(item, 'save', true));
    const liked = updateFeed(saved, 'p1', (item) => applyPostAction(item, 'like', true));
    expect(liked?.pages.every((p) => p.data[0]?.isSaved && p.data[0]?.isLiked)).toBe(true);
    expect(original.pages[0]?.data[0]?.isSaved).toBe(false);
    expect(updateFeed(undefined, 'p1', (item) => item)).toBeUndefined();
  });
});

it('handles invalid and future timestamps without misleading negative ages', () => {
  expect(relativeTime('invalid', Date.parse(post.createdAt))).toBe('');
  expect(relativeTime('2026-10-03T12:00:00Z', Date.parse(post.createdAt))).toBe('now');
  expect(relativeTime(post.createdAt, Date.parse(post.createdAt) + 3_600_000)).toBe('1h');
});
