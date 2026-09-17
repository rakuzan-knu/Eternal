import { describe, it, expect, vi } from 'vitest';
import { postsApi } from '../postsApi';
import { apiClient } from '@/shared/api/httpClient';

describe('postsApi (features)', () => {
  it('calls all post endpoints correctly', async () => {
    const postSpy = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: { id: 'p1', content: 'test' } });
    const patchSpy = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValue({ data: { id: 'p1', content: 'edited' } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    const formData = new FormData();
    const created = await postsApi.createPost(formData);
    expect(postSpy).toHaveBeenCalledWith('/posts', formData);
    expect(created.id).toBe('p1');

    const edited = await postsApi.editPost('p1', 'edited text');
    expect(patchSpy).toHaveBeenCalledWith('/posts/p1', { content: 'edited text' });
    expect(edited.text).toBe('edited');

    await postsApi.deletePost('p1');
    expect(deleteSpy).toHaveBeenCalledWith('/posts/p1');

    await postsApi.like('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/like');

    await postsApi.unlike('post-1');
    expect(deleteSpy).toHaveBeenCalledWith('/posts/post-1/like');

    await postsApi.repost('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/repost');

    await postsApi.unrepost('post-1');
    expect(deleteSpy).toHaveBeenCalledWith('/posts/post-1/repost');

    await postsApi.save('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/save');

    await postsApi.unsave('post-1');
    expect(deleteSpy).toHaveBeenCalledWith('/posts/post-1/save');

    await postsApi.share('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/share');

    await postsApi.report('post-1', 'spam');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/report', { reason: 'spam' });

    await postsApi.votePoll('post-1', 'opt-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/poll/vote', { optionId: 'opt-1' });

    await postsApi.pin('post-1');
    expect(postSpy).toHaveBeenCalledWith('/posts/post-1/pin');

    await postsApi.unpin('post-1');
    expect(deleteSpy).toHaveBeenCalledWith('/posts/post-1/pin');
  });
});
