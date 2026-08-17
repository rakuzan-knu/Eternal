import { describe, it, expect, vi } from 'vitest';
import { postsApi } from '../postsApi';
import { apiClient } from '@/shared/api/httpClient';

describe('postsApi (features)', () => {
  it('calls like, unlike, repost, save endpoints', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    await postsApi.like('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/like');

    await postsApi.unlike('post-1');
    expect(deleteSpy).toHaveBeenCalledWith('/posts/post-1/like');

    await postsApi.repost('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/repost');

    await postsApi.save('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/save');

    await postsApi.votePoll('post-1', 'opt-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/poll/vote', { optionId: 'opt-1' });
  });
});
