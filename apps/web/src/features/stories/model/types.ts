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
  zIndex?: number;
  color?: string;
  fontFamily?:
    | 'modern'
    | 'classic'
    | 'signature'
    | 'neon'
    | 'typewriter'
    | 'cyberpunk'
    | 'poster'
    | 'sans'
    | 'serif';
  backgroundStyle?: 'none' | 'solid' | 'neon' | 'glass' | 'highlight';
  backgroundColor?: string;
  fontSize?: number;
  fontSizeCqw?: number;
  textAlign?: 'left' | 'center' | 'right';
  animation?: 'none' | 'typewriter' | 'float' | 'bounce' | 'glow' | 'wave';
  fontStyle?: 'normal' | 'italic';
}

export interface ImageOverlay {
  id: string;
  type: 'image';
  url?: string;
  isMainMedia?: boolean;
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
  aspectRatio?: number;
  borderRadius?: number;
  backgroundColor?: string;
}

export interface CaptionOverlay {
  id: string;
  type: 'caption';
  text: string;
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
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
  zIndex?: number;
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
  zIndex?: number;
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
  zIndex?: number;
}

export interface AudioOverlay {
  id: string;
  type: 'audio';
  title?: string;
  artist?: string;
  albumArt?: string;
  audioUrl?: string;
  spotifyUrl?: string;
  duration?: number;
  waveform?: number[];
  videoVolume?: number;
  musicVolume?: number;
  musicStyle?: 'none' | 'card' | 'cover' | 'vinyl';
  stickerColor?: string;
  startTimeMs?: number;
  clipDurationSeconds?: number;
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

export interface DrawingStroke {
  tool: 'pencil' | 'marker' | 'eraser';
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
}

export interface DrawingOverlay {
  id: string;
  type: 'drawing';
  strokes: DrawingStroke[];
  xPercent: number;
  yPercent: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

export type StoryOverlay =
  | TextOverlay
  | ImageOverlay
  | CaptionOverlay
  | PollOverlay
  | LinkOverlay
  | MentionOverlay
  | AudioOverlay
  | DrawingOverlay;

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
  filter?: string | null;
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
  filter?: string;
}
