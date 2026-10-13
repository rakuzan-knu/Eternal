import { beforeEach, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ getMobileApi: () => http }));
import { feedApi } from './feedApi';

beforeEach(() => {
  http.get.mockResolvedValue({
    data: { data: [], meta: { nextCursor: null, hasNextPage: false } },
  });
  http.post.mockResolvedValue({ data: { success: true } });
  http.delete.mockResolvedValue({ data: undefined });
});

it('opens a notification post target with encoded ID and request cancellation', async () => {
  const signal = new AbortController().signal;
  await feedApi.post('p/1', signal);
  expect(http.get).toHaveBeenCalledWith('/posts/p%2F1', { signal });
});

it('uses the authenticated feed and saved endpoints with cancellation and cursor', async () => {
  const signal = new AbortController().signal;
  await feedApi.posts('home', 'cursor', signal);
  expect(http.get).toHaveBeenCalledWith('/posts', {
    params: { after: 'cursor', limit: 10 },
    signal,
  });
  await feedApi.posts('saved', undefined, signal);
  expect(http.get).toHaveBeenLastCalledWith('/users/me/saved-posts', {
    params: { after: undefined, limit: 10 },
    signal,
  });
});

it('uses POST to enable a reaction and DELETE to disable it', async () => {
  await feedApi.action('p/1', 'like', true);
  expect(http.post).toHaveBeenCalledWith('/posts/p%2F1/like');
  await feedApi.action('p1', 'save', false);
  expect(http.delete).toHaveBeenCalledWith('/posts/p1/save');
});

it('does not pretend a failed create succeeded', async () => {
  http.post.mockRejectedValueOnce(new Error('offline'));
  const body = new FormData();
  body.append('content', 'draft');
  await expect(feedApi.create(body)).rejects.toThrow('offline');
});

it('posts comments using the existing nested endpoint and text contract', async () => {
  await feedApi.comment('p1', 'Hello');
  expect(http.post).toHaveBeenCalledWith('/posts/p1/comments', { text: 'Hello' });
});

it('uses the user follow boundary for follow and unfollow', async () => {
  http.post.mockResolvedValueOnce({ data: { status: 'PENDING' } });
  await expect(feedApi.follow('author/1')).resolves.toEqual({ status: 'PENDING' });
  expect(http.post).toHaveBeenLastCalledWith('/users/author%2F1/follow');
  await feedApi.unfollow('author/1');
  expect(http.delete).toHaveBeenLastCalledWith('/users/author%2F1/follow');
});
