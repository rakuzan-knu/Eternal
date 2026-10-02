import { apiClient as api } from '@/shared/api/httpClient';

export type WatchTogetherMediaType = 'youtube' | 'direct' | 'twitch';

export interface WatchTogetherVideoItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;
  durationSec: number;
  viewCount?: string;
  publishedAt?: string;
  source: WatchTogetherMediaType;
  url: string;
  progress?: number; // 0..1 for watch progress
  watchedSec?: number;
}

export interface WatchTogetherSearchResponse {
  items: WatchTogetherVideoItem[];
  nextPageToken?: string;
}

export interface ResolvedMediaResponse {
  type: WatchTogetherMediaType;
  url: string;
  id?: string;
  title?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  duration?: string;
  isLive?: boolean;
}

export interface RecordWatchEventDto {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  categoryId?: string;
  tags?: string[];
  durationSec: number;
  watchedSec: number;
  completedRatio?: number;
  thumbnailUrl?: string;
  source?: WatchTogetherMediaType;
}

export interface UserWatchHistoryItem extends WatchTogetherVideoItem {
  progress: number;
  watchedAt: number;
  watchedSec: number;
}

export interface WatchTogetherRail {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  icon?: string;
  items: WatchTogetherVideoItem[];
}

export interface WatchTogetherRailsResponse {
  rails: WatchTogetherRail[];
  topCategory?: string | undefined;
  hasHistory: boolean;
}

export const watchTogetherApi = {
  getTrending: (regionCode = 'US'): Promise<WatchTogetherVideoItem[]> =>
    api
      .get<WatchTogetherVideoItem[]>('/watch-together/youtube/trending', {
        params: { regionCode },
      })
      .then((res) => res.data),

  search: (query: string, pageToken?: string): Promise<WatchTogetherSearchResponse> =>
    api
      .get<WatchTogetherSearchResponse>('/watch-together/youtube/search', {
        params: { q: query, ...(pageToken ? { pageToken } : {}) },
      })
      .then((res) => res.data),

  resolveUrl: (url: string): Promise<ResolvedMediaResponse> =>
    api.post<ResolvedMediaResponse>('/watch-together/resolve-url', { url }).then((res) => res.data),

  recordWatchTime: (
    dto: RecordWatchEventDto,
  ): Promise<{ recorded: boolean; category?: string; watchFactor?: number }> =>
    api.post('/watch-together/history/record', dto).then((res) => res.data),

  getHistory: (): Promise<UserWatchHistoryItem[]> =>
    api.get<UserWatchHistoryItem[]>('/watch-together/history').then((res) => res.data),

  getRecommendations: (): Promise<WatchTogetherRailsResponse> =>
    api
      .get<WatchTogetherRailsResponse>('/watch-together/recommendations/rails')
      .then((res) => res.data),
};
