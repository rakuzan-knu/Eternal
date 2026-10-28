import { expect, it } from 'vitest';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import { reelSource, toggleLike, uniqueReels, updateReels, type ReelsData } from './reels';

const reel = (id: string, extra: Partial<ReelResponseDto> = {}) =>
  ({
    id,
    videoUrl: `https://cdn.example/${id}.mp4`,
    hlsUrl: null,
    likesCount: 2,
    isLiked: false,
    ...extra,
  }) as ReelResponseDto;

const data: ReelsData = {
  pageParams: [undefined, 'c1'],
  pages: [
    { data: [reel('a'), reel('b')], meta: { nextCursor: 'c1', hasNextPage: true } },
    { data: [reel('b'), reel('c')], meta: { nextCursor: null, hasNextPage: false } },
  ],
};

it('removes duplicated reels across pages', () => {
  expect(uniqueReels(data).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  expect(uniqueReels(undefined)).toEqual([]);
});

it('updates a reel on every page it appears', () => {
  const next = updateReels(data, 'b', (item) => ({ ...item, isSaved: true }));
  expect(next?.pages.flatMap((page) => page.data).filter((item) => item.isSaved)).toHaveLength(2);
  expect(updateReels(undefined, 'b', (item) => item)).toBeUndefined();
});

it('toggles likes without going below zero', () => {
  expect(toggleLike(reel('a'))).toMatchObject({ isLiked: true, likesCount: 3 });
  expect(toggleLike(reel('a', { isLiked: true, likesCount: 0 }))).toMatchObject({
    isLiked: false,
    likesCount: 0,
  });
});

it('prefers the adaptive stream when available', () => {
  expect(reelSource(reel('a'))).toBe('https://cdn.example/a.mp4');
  expect(reelSource(reel('a', { hlsUrl: 'https://cdn.example/a.m3u8' }))).toBe(
    'https://cdn.example/a.m3u8',
  );
});
