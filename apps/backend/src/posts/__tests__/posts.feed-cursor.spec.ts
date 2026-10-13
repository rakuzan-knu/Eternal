import { describe, expect, it } from 'vitest';
import { MediaType } from '@prisma/client';
import { PostsRepository } from '../posts.repository';
import { PostsService } from '../posts.service';
import { FeedBffService } from '../../bff/feed-bff.service';
import type { PrismaService } from '@common/prisma';
import type { PostsMediaService } from '../posts-media.service';
import type { RedisService } from '../../redis/redis.service';

const posts = Array.from({ length: 70 }, (_, index) => ({
  id: `post-${String(index).padStart(3, '0')}`,
  content: `Ordinary post ${index}`,
  authorId: 'author-1',
  createdAt: new Date(Date.UTC(2026, 9, 11, 12, 0, 70 - index)),
  updatedAt: new Date('2026-10-11T12:00:00Z'),
  media: [
    { id: `image-${index}`, type: MediaType.IMAGE, url: `/media/image-${index}.webp`, order: 0 },
    { id: `video-${index}`, type: MediaType.VIDEO, url: `/media/video-${index}.mp4`, order: 1 },
  ],
  author: {
    id: 'author-1',
    username: 'ordinary',
    displayName: 'Ordinary Author',
    avatar: null,
    isVerified: false,
    primaryBadge: null,
    followers: [],
  },
  poll: null,
  likes: [],
  reposts: [],
  savedPosts: [],
  _count: { likes: 0, reposts: 0, comments: 0 },
}));
type Row = { id: string; createdAt: Date };
type Query = {
  cursor?: { id: string };
  skip?: number;
  take?: number;
  where?: { OR?: Array<{ createdAt: Date | { lt: Date }; id?: { lt: string } }> };
};
// Database double interprets the emitted keyset/cursor query, including the
// missing Prisma cursor behavior. All repository mapping and pagination stay real.
function databasePage<T extends Row>(records: T[], query: Query): T[] {
  let filtered = records;
  if (query.where?.OR)
    filtered = filtered.filter((row) =>
      query.where!.OR!.some((condition) =>
        condition.createdAt instanceof Date
          ? row.createdAt.getTime() === condition.createdAt.getTime() &&
            Boolean(condition.id && row.id < condition.id.lt)
          : row.createdAt < condition.createdAt.lt,
      ),
    );
  if (query.cursor) {
    const index = filtered.findIndex((row) => row.id === query.cursor!.id);
    if (index < 0) return [];
    filtered = filtered.slice(index + (query.skip ?? 0));
  }
  return filtered.slice(0, query.take);
}
function setup() {
  let records = structuredClone(posts);
  let saved = records.map((post, index) => ({
    id: `save-${index}`,
    createdAt: new Date(Date.UTC(2026, 9, 11, 13, 0, 70 - index)),
    userId: 'viewer',
    post,
  }));
  let reposted = records.map((post, index) => ({
    id: `repost-${index}`,
    createdAt: new Date(Date.UTC(2026, 9, 11, 14, 0, 70 - index)),
    userId: 'viewer',
    post,
  }));
  const prisma = {
    post: { findMany: async (query: Query) => databasePage(records, query) },
    savedPost: { findMany: async (query: Query) => databasePage(saved, query) },
    repost: { findMany: async (query: Query) => databasePage(reposted, query) },
    userBlock: { findMany: async () => [] },
  };
  const repository = new PostsRepository(prisma as unknown as PrismaService);
  const redis = {
    get: async () => null,
    getOrSet: async (_key: string, _ttl: number, factory: () => unknown) => factory(),
  };
  const service = new PostsService(
    repository,
    {} as PostsMediaService,
    redis as unknown as RedisService,
  );
  const compact = new FeedBffService(repository, redis as unknown as RedisService);
  return {
    service,
    compact,
    remove: (id: string) => {
      records = records.filter((post) => post.id !== id);
      saved = saved.filter((row) => row.post.id !== id);
      reposted = reposted.filter((row) => row.post.id !== id);
    },
  };
}
describe('feed boundaries survive deletion', () => {
  it.each(['home', 'profile', 'saved', 'reposts', 'compact'] as const)(
    '%s restores an evicted page after its boundary post is deleted',
    async (kind) => {
      const { service, compact, remove } = setup();
      const fetchPage = (after?: string) =>
        kind === 'home'
          ? service.getAllPosts(10, after, 'viewer')
          : kind === 'profile'
            ? service.getUserPosts('author-1', 10, after, 'viewer')
            : kind === 'saved'
              ? service.getSavedPosts('viewer', 10, after)
              : kind === 'reposts'
                ? service.getUserReposts('viewer', 10, after, 'viewer')
                : compact.getCompactFeed(10, after, 'viewer');
      const first = await fetchPage();
      const evictedPageCursor = first.meta.nextCursor!;
      let cursor = evictedPageCursor;
      // Move beyond the five-page live window, retaining only the request boundary.
      for (let index = 0; index < 5; index++) cursor = (await fetchPage(cursor)).meta.nextCursor!;
      remove('post-009');
      const restored = await fetchPage(evictedPageCursor);
      expect(restored.data.map((post) => post.id)).toEqual([
        'post-010',
        'post-011',
        'post-012',
        'post-013',
        'post-014',
        'post-015',
        'post-016',
        'post-017',
        'post-018',
        'post-019',
      ]);
      const post = restored.data[0];
      if ('media' in post) expect(post.media).toHaveLength(2);
      else expect(post.mediaPreview?.totalCount).toBe(2);
    },
  );
});
