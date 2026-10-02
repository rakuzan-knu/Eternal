export type WatchTogetherMediaType = 'youtube' | 'direct' | 'twitch';

export interface WatchTogetherVideoItem {
  id: string; // YouTube videoId or direct stream identifier
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string; // e.g. "3:45"
  durationSec: number;
  viewCount?: string | undefined;
  publishedAt?: string | undefined;
  source: WatchTogetherMediaType;
  url: string;
  progress?: number | undefined; // 0..1 watch progress (for resume rail)
  watchedSec?: number | undefined;
}

export interface ResolveUrlDto {
  url: string;
}

export interface ResolvedMediaResponse {
  type: WatchTogetherMediaType;
  url: string;
  id?: string | undefined;
  title?: string | undefined;
  channelTitle?: string | undefined;
  thumbnailUrl?: string | undefined;
  durationSec?: number | undefined;
  duration?: string | undefined;
  isLive?: boolean | undefined;
}

export interface WatchTogetherSyncEventDto {
  conversationId: string;
  action: 'play' | 'pause' | 'seek' | 'change_media' | 'queue_update';
  timestamp: number;
  media?: WatchTogetherVideoItem | undefined;
  queue?: WatchTogetherVideoItem[] | undefined;
  senderUserId?: string | undefined;
}

export interface WatchTogetherSearchResponse {
  items: WatchTogetherVideoItem[];
  nextPageToken?: string | undefined;
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

export interface UserInterestProfile {
  categories: Record<string, number>;
  channels: Record<string, number>;
  keywords: Record<string, number>;
  lastUpdated: number;
}

export interface UserWatchHistoryItem {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  duration: string;
  durationSec: number;
  watchedSec: number;
  progress: number;
  watchedAt: number;
  source: WatchTogetherMediaType;
  url: string;
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
