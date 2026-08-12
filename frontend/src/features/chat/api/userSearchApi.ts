import { apiClient as api } from '@/shared/api/httpClient';

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export const userSearchApi = {
  search: (q: string) =>
    api.get<UserSearchResult[]>('/users/search', { params: { q } }).then((r) => r.data),
};
