import { apiClient as api } from '@/shared/api/httpClient';

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export const userSearchApi = {
  search: (q: string, signal?: AbortSignal) =>
    api.get<UserSearchResult[]>('/users/search', { params: { q }, signal }).then((r) => r.data),
};
