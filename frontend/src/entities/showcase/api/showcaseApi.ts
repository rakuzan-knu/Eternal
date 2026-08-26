import { apiClient } from '@/shared/api/httpClient';
import type {
  ProfileShowcaseDto,
  UpdateShowcaseDto,
  MediaSearchResultDto,
  ShowcaseMediaType,
} from '@backend/common/contracts';

export const showcaseApi = {
  async getShowcase(username: string): Promise<ProfileShowcaseDto> {
    const response = await apiClient.get<ProfileShowcaseDto>(
      `/users/${encodeURIComponent(username)}/showcase`,
    );
    return response.data;
  },

  async updateShowcase(dto: UpdateShowcaseDto): Promise<ProfileShowcaseDto> {
    const response = await apiClient.patch<ProfileShowcaseDto>('/users/me/showcase', dto);
    return response.data;
  },

  async searchMedia(query: string, type: ShowcaseMediaType): Promise<MediaSearchResultDto[]> {
    const response = await apiClient.get<MediaSearchResultDto[]>('/users/showcase/search-media', {
      params: { q: query, type },
    });
    return response.data;
  },

  async searchTracks(query: string): Promise<any[]> {
    const response = await apiClient.get<any[]>('/users/showcase/search-tracks', {
      params: { q: query },
    });
    return response.data;
  },
};
