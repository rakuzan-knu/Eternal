import { describe, it, expect, vi, beforeEach } from 'vitest';
import { postsApi, normalizePost, normalizeFeedPage } from '../postsApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('postsApi and normalizers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('normalizePost', () => {
    it('handles null or undefined input', () => {
      const result = normalizePost(null);
      expect(result.author).toBe('User');
      expect(result.handle).toBe('user');
      expect(result.text).toBe('');
    });

    it('normalizes a full post object with author object and video media', () => {
      const raw = {
        id: 'post-1',
        authorId: 'user-1',
        author: {
          displayName: 'John Doe',
          username: 'johndoe',
          avatar: 'https://avatar.png',
          isVerified: true,
          primaryBadge: 'DEVELOPER',
        },
        content: 'Hello world',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T01:00:00.000Z',
        isPinned: true,
        pinnedAt: '2026-01-01T00:30:00.000Z',
        type: 'POST',
        media: [
          { type: 'VIDEO', url: 'https://video.mp4', poster: 'https://poster.jpg' },
          { type: 'IMAGE', url: 'https://image.jpg' },
        ],
        poll: { id: 'poll-1', question: 'Q', options: [] },
        commentsCount: 5,
        repostsCount: 2,
        likesCount: 10,
        sharesCount: 3,
        isLiked: true,
        isReposted: false,
        isSaved: true,
        isFollowing: true,
        isOwner: true,
      };

      const normalized = normalizePost(raw);
      expect(normalized.id).toBe('post-1');
      expect(normalized.author).toBe('John Doe');
      expect(normalized.handle).toBe('johndoe');
      expect(normalized.avatar).toBe('https://avatar.png');
      expect(normalized.isVerified).toBe(true);
      expect(normalized.primaryBadge).toBe('DEVELOPER');
      expect(normalized.text).toBe('Hello world');
      expect(normalized.editedAt).toBe('2026-01-01T01:00:00.000Z');
      expect(normalized.isPinned).toBe(true);
      expect(normalized.pinnedAt).toBe('2026-01-01T00:30:00.000Z');
      expect(normalized.media).toHaveLength(2);
      expect(normalized.media?.[0]?.type).toBe('video');
      expect(normalized.media?.[1]?.type).toBe('image');
      expect(normalized.image).toBe('https://image.jpg');
      expect(normalized.likes).toBe(10);
      expect(normalized.comments).toBe(5);
      expect(normalized.reposts).toBe(2);
    });

    it('falls back to string author, handle, text, image properties', () => {
      const raw = {
        id: 'post-2',
        authorName: 'Jane',
        handle: 'jane',
        image: 'https://single-image.jpg',
        text: 'Just text',
        isPinned: true,
      };

      const normalized = normalizePost(raw);
      expect(normalized.author).toBe('Jane');
      expect(normalized.handle).toBe('jane');
      expect(normalized.image).toBe('https://single-image.jpg');
      expect(normalized.text).toBe('Just text');
      expect(normalized.pinnedAt).toBeDefined();
    });
  });

  describe('normalizeFeedPage', () => {
    it('handles null/undefined and empty data', () => {
      expect(normalizeFeedPage(null)).toEqual({ posts: [], nextCursor: null });
      expect(normalizeFeedPage({})).toEqual({ posts: [], nextCursor: null });
    });

    it('normalizes response with data array and meta cursor', () => {
      const res = {
        data: [{ id: 'p1', content: 'test' }],
        meta: { nextCursor: 'cursor-123' },
      };
      const normalized = normalizeFeedPage(res);
      expect(normalized.posts).toHaveLength(1);
      expect(normalized.nextCursor).toBe('cursor-123');
    });

    it('normalizes response with raw array', () => {
      const res = [{ id: 'p1', text: 'test' }];
      const normalized = normalizeFeedPage(res as unknown as Record<string, unknown>);
      expect(normalized.posts).toHaveLength(1);
      expect(normalized.nextCursor).toBeNull();
    });
  });

  describe('API methods', () => {
    it('getFeed calls /posts', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [], nextCursor: null } });
      const result = await postsApi.getFeed('c1', 20);
      expect(apiClient.get).toHaveBeenCalledWith('/posts', { params: { after: 'c1', limit: 20 } });
      expect(result.posts).toEqual([]);
    });

    it('getUserPosts calls /users/:id/posts', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [], nextCursor: null } });
      await postsApi.getUserPosts('u1', 'c1');
      expect(apiClient.get).toHaveBeenCalledWith('/users/u1/posts', { params: { after: 'c1' } });
    });

    it('getUserReposts calls /users/:id/reposts', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [], nextCursor: null } });
      await postsApi.getUserReposts('u1', 'c1');
      expect(apiClient.get).toHaveBeenCalledWith('/users/u1/reposts', { params: { after: 'c1' } });
    });

    it('getPollVoters calls /posts/:id/poll/voters', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
      const result = await postsApi.getPollVoters('p1');
      expect(apiClient.get).toHaveBeenCalledWith('/posts/p1/poll/voters');
      expect(result).toEqual([]);
    });

    it('getSavedPosts calls /users/me/saved-posts', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [], nextCursor: null } });
      await postsApi.getSavedPosts('c1', 10);
      expect(apiClient.get).toHaveBeenCalledWith('/users/me/saved-posts', {
        params: { after: 'c1', limit: 10 },
      });
    });

    it('getPostById calls /posts/:id', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 'p1', content: 'hello' } });
      const result = await postsApi.getPostById('p1');
      expect(apiClient.get).toHaveBeenCalledWith('/posts/p1');
      expect(result.id).toBe('p1');
    });

    it('getExplorePosts calls /posts/explore', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [], nextCursor: null } });
      await postsApi.getExplorePosts('c1', 9);
      expect(apiClient.get).toHaveBeenCalledWith('/posts/explore', {
        params: { after: 'c1', limit: 9 },
      });
    });

    it('getPostsByHashtag calls /posts/hashtag/:tag', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [], totalCount: 42 } });
      const result = await postsApi.getPostsByHashtag('#nature', 'c1', 9);
      expect(apiClient.get).toHaveBeenCalledWith('/posts/hashtag/nature', {
        params: { after: 'c1', limit: 9 },
      });
      expect(result.totalCount).toBe(42);
    });

    it('searchPosts calls /posts/search', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { posts: [] } });
      await postsApi.searchPosts('query', 'c1', 10, true);
      expect(apiClient.get).toHaveBeenCalledWith('/posts/search', {
        params: { q: 'query', after: 'c1', limit: 10, mediaOnly: 'true' },
      });
    });

    it('editPost calls patch /posts/:id', async () => {
      vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 'p1', content: 'updated' } });
      const result = await postsApi.editPost('p1', { content: 'updated' });
      expect(apiClient.patch).toHaveBeenCalledWith('/posts/p1', { content: 'updated' });
      expect(result.text).toBe('updated');
    });

    it('deletePost calls delete /posts/:id', async () => {
      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { success: true } });
      const result = await postsApi.deletePost('p1');
      expect(apiClient.delete).toHaveBeenCalledWith('/posts/p1');
      expect(result).toEqual({ success: true });
    });

    it('reportPost calls post /posts/:id/report', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true } });
      const result = await postsApi.reportPost('p1', 'spam');
      expect(apiClient.post).toHaveBeenCalledWith('/posts/p1/report', { reason: 'spam' });
      expect(result).toEqual({ success: true });
    });

    it('pinPost and unpinPost call post and delete on /posts/:id/pin', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 'p1', isPinned: true } });
      const pinResult = await postsApi.pinPost('p1');
      expect(apiClient.post).toHaveBeenCalledWith('/posts/p1/pin');
      expect(pinResult.isPinned).toBe(true);

      vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: { id: 'p1', isPinned: false } });
      const unpinResult = await postsApi.unpinPost('p1');
      expect(apiClient.delete).toHaveBeenCalledWith('/posts/p1/pin');
      expect(unpinResult.isPinned).toBe(false);
    });
  });
});
