import { describe, it, expect, vi, beforeEach } from 'vitest';
import { commentsApi, normalizeComment } from '../commentsApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('commentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes null or incomplete comment objects safely', () => {
    const empty = normalizeComment(null);
    expect(empty.author).toBe('User');
    expect(empty.id).toBe('');

    const partial = normalizeComment({ id: 'c1', user: { username: 'user1' }, text: 'hi' });
    expect(partial.id).toBe('c1');
    expect(partial.author).toBe('user1');
    expect(partial.text).toBe('hi');

    const withReplyTo = normalizeComment({
      id: 'c2',
      replyToUser: { id: 'u2', username: 'bob', displayName: 'Bobby' },
    });
    expect(withReplyTo.replyToUser?.displayName).toBe('Bobby');

    const withReplyToDefault = normalizeComment({
      id: 'c3',
      replyToUser: { id: 'u3', username: 'sarah' },
    });
    expect(withReplyToDefault.replyToUser?.displayName).toBe('sarah');
  });

  it('fetches comments list with pagination params and alternative array formats', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        data: [{ id: 'c1', text: 'comment 1' }],
        meta: { nextCursor: 'next-1' },
      },
    });

    const res = await commentsApi.getComments('post-1', 'cursor-1', 10);
    expect(apiClient.get).toHaveBeenCalledWith('/posts/post-1/comments', {
      params: { after: 'cursor-1', limit: 10 },
    });
    expect(res.comments).toHaveLength(1);
    expect(res.nextCursor).toBe('next-1');

    // comments property and raw array
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { comments: [{ id: 'c2' }], nextCursor: 'nc-2' },
    });
    const res2 = await commentsApi.getComments('post-2');
    expect(res2.comments).toHaveLength(1);
    expect(res2.nextCursor).toBe('nc-2');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ id: 'c3' }],
    });
    const res3 = await commentsApi.getComments('post-3');
    expect(res3.comments).toHaveLength(1);
  });

  it('fetches replies, adds comment, toggles like/pin, and deletes comment', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await commentsApi.getReplies('root-1');
    expect(apiClient.get).toHaveBeenCalledWith('/comments/root-1/replies', {
      params: { after: undefined, limit: 20 },
    });

    // getReplies alternative formats
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { comments: [{ id: 'r2' }], nextCursor: 'rc-2' },
    });
    const rep2 = await commentsApi.getReplies('root-2');
    expect(rep2.comments).toHaveLength(1);

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [{ id: 'r3' }] });
    const rep3 = await commentsApi.getReplies('root-3');
    expect(rep3.comments).toHaveLength(1);

    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: 'c2', text: 'new reply' } });
    const added = await commentsApi.addComment('p1', 'new reply', 'root-1');
    expect(added.id).toBe('c2');

    vi.mocked(apiClient.post).mockResolvedValue({ data: { isLiked: true, likesCount: 5 } });
    const likeRes = await commentsApi.toggleLike('c2');
    expect(likeRes.isLiked).toBe(true);

    vi.mocked(apiClient.post).mockResolvedValue({ data: { isPinned: true } });
    const pinRes = await commentsApi.togglePin('c2');
    expect(pinRes.isPinned).toBe(true);

    vi.mocked(apiClient.delete).mockResolvedValue({ data: null });
    await commentsApi.deleteComment('c2');
    expect(apiClient.delete).toHaveBeenCalledWith('/comments/c2');
  });

  it('uploads media via multipart form data', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { url: 'https://cdn.example.com/img.png' },
    });
    const file = new File(['mock'], 'test.png', { type: 'image/png' });
    const res = await commentsApi.uploadMedia(file);
    expect(res).toEqual({ url: 'https://cdn.example.com/img.png' });
    expect(apiClient.post).toHaveBeenCalledWith('/comments/media', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  });
});
