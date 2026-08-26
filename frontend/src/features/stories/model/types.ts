export type StoryMediaType = 'IMAGE' | 'VIDEO' | 'VOICE';
export type StoryPrivacy = 'ALL_FOLLOWERS' | 'CLOSE_FRIENDS';

export interface TextOverlay {
  id: string;
  type: 'text';
  text: string;
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  scale?: number;
  rotation?: number;
  color?: string;
  fontFamily?: 'sans' | 'neon' | 'cyberpunk' | 'serif' | 'typewriter';
  backgroundStyle?: 'none' | 'solid' | 'neon' | 'glass';
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
}

export interface PollOption {
  text: string;
}

export interface PollOverlay {
  id: string;
  type: 'poll';
  question: string;
  options: PollOption[];
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
}

export interface LinkOverlay {
  id: string;
  type: 'link';
  url: string;
  title: string;
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
}

export interface MentionOverlay {
  id: string;
  type: 'mention';
  username: string;
  displayName?: string;
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
}

export interface AudioOverlay {
  id: string;
  type: 'audio';
  title?: string;
  audioUrl?: string;
  duration?: number;
  waveform?: number[];
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
}

export type StoryOverlay = TextOverlay | PollOverlay | LinkOverlay | MentionOverlay | AudioOverlay;

export interface StoryViewerUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean;
}

export interface StoryPollOptionResult {
  text: string;
  voteCount: number;
  percentage: number;
}

export interface StoryPollResult {
  question: string;
  totalVotes: number;
  userVotedIndex: number | null;
  options: StoryPollOptionResult[];
}

export interface StoryViewResponse {
  id: string;
  authorId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption: string | null;
  overlays: StoryOverlay[] | null;
  privacy: StoryPrivacy;
  createdAt: string;
  expiresAt: string;
  viewsCount: number;
  hasViewed: boolean;
  userReaction: string | null;
  reactionsCount: Record<string, number>;
  pollResult: StoryPollResult | null;
  author: StoryViewerUser;
}

export interface UserStoriesGroup {
  user: StoryViewerUser;
  hasUnviewed: boolean;
  hasCloseFriendsStory: boolean;
  stories: StoryViewResponse[];
  latestStoryTimestamp: string;
}

export interface StoryViewersListResponse {
  totalViews: number;
  viewers: {
    user: StoryViewerUser;
    viewedAt: string;
    reaction: string | null;
    pollVoteOption: number | null;
  }[];
}

export interface CreateStoryPayload {
  file?: File;
  mediaType?: StoryMediaType;
  caption?: string;
  overlays?: StoryOverlay[];
  privacy?: StoryPrivacy;
  backgroundColor?: string;
}
