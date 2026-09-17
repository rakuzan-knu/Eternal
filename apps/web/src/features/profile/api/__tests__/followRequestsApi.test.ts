import { describe, it, expect, vi } from 'vitest';
import { followRequestsApi } from '../followRequestsApi';
import { apiClient } from '@/shared/api/httpClient';

describe('followRequestsApi', () => {
  it('calls list, count, accept, reject', async () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
      if (url.includes('count')) return { data: { count: 3 } };
      return {
        data: {
          data: [
            { id: 'usr-1', username: 'alice', displayName: 'Alice', avatar: null, createdAt: '' },
          ],
          meta: { nextCursor: null, hasNextPage: false },
        },
      };
    });
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true } });

    const listRes = await followRequestsApi.list();
    expect(listRes.data).toHaveLength(1);

    const countRes = await followRequestsApi.count();
    expect(countRes).toBe(3);
    expect(getSpy).toHaveBeenCalledTimes(2);

    await followRequestsApi.accept('usr-1');
    expect(postSpy).toHaveBeenCalledWith('/users/me/follow-requests/usr-1/accept');

    await followRequestsApi.reject('usr-1');
    expect(postSpy).toHaveBeenCalledWith('/users/me/follow-requests/usr-1/reject');
  });
});
