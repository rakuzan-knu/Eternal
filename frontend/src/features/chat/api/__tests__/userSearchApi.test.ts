import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userSearchApi } from '../userSearchApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('userSearchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches users by query', async () => {
    const mockUsers = [{ id: 'u1', username: 'alice', displayName: 'Alice', avatar: null }];
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockUsers });

    const res = await userSearchApi.search('alice');
    expect(apiClient.get).toHaveBeenCalledWith('/users/search', { params: { q: 'alice' } });
    expect(res).toEqual(mockUsers);
  });
});
