import { apiClient as api } from '@/shared/api/httpClient';
import type { NameplateDto } from '@social-network/shared-contracts';

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  activeNameplate?: NameplateDto | null;
}

export const userSearchApi = {
  search: (q: string, signal?: AbortSignal) =>
    api.get<UserSearchResult[]>('/users/search', { params: { q }, signal }).then((r) => r.data),
};
