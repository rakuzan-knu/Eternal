import { describe, it, expect, vi } from 'vitest';
import { followApi, normalizeFollowListPage } from '../followApi';
import { apiClient } from '@/shared/api/httpClient';

describe('followApi', () => {
  it('normalizes raw follow list page', () => {
    const raw = {
      items: [{ id: 'usr-1', username: 'alice', displayName: 'Alice', isFollowing: true }],
      meta: { nextCursor: 'cur-123' },
    };

    const normalized = normalizeFollowListPage(raw);
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].username).toBe('alice');
    expect(normalized.nextCursor).toBe('cur-123');
  });

  it('calls follow and unfollow endpoints', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });
    const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });

    await followApi.follow('usr-2');
    expect(postSpy).toHaveBeenCalledWith('/users/usr-2/follow');

    await followApi.unfollow('usr-2');
    expect(deleteSpy).toHaveBeenCalledWith('/users/usr-2/follow');
  });
});
