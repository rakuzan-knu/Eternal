export const QUEUE_NOTIFICATIONS = 'notifications-queue';
export const QUEUE_MEDIA_PREVIEWS = 'media-previews-queue';
export const QUEUE_SEARCH_INDEXING = 'search-indexing-queue';
export const QUEUE_MESSAGES = 'messages-queue';
export const QUEUE_DEAD_LETTER = 'dead-letter-queue';
export const QUEUE_VIDEO_TRANSCODE = 'video-transcode-queue';

export interface DeadLetterJobData {
  originalQueue: string;
  jobId: string;
  jobName: string;
  data: unknown;
  failedReason: string;
  stackTrace?: string | undefined;
  attemptsMade: number;
  failedAt: string;
  traceId?: string | undefined;
  isPoisonPill?: boolean | undefined;
}

export enum NotificationJobType {
  PUSH = 'push_notification',
  CREATE = 'create_notification',
}

export enum MediaJobType {
  IMAGE_OPTIMIZE = 'optimize_image',
  LINK_PREVIEW = 'scrape_link_preview',
}

export enum SearchJobType {
  INDEX_USER = 'index_user',
  INDEX_HASHTAG = 'index_hashtag',
  INDEX_POST = 'index_post',
}

export enum MessageJobType {
  FANOUT = 'fanout_message',
  NOTIFY_OFFLINE = 'notify_offline_participants',
  GLOBAL_ENTITY_FANOUT = 'global_entity_fanout',
}

export enum VideoJobType {
  HLS_TRANSCODE = 'video_hls_transcode',
}
