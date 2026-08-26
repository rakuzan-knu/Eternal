export type LinkEmbedType =
  'youtube' | 'github' | 'spotify' | 'soundcloud' | 'twitter' | 'figma' | 'codepen' | 'generic';

export interface YouTubeEmbedDetails {
  videoId: string;
  author?: string | null;
  duration?: string | null;
  startSeconds?: number | null;
  isShorts?: boolean;
}

export interface GitHubEmbedDetails {
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  language?: string | null;
  languageColor?: string | null;
  avatarUrl?: string | null;
}

export interface AudioEmbedDetails {
  provider: 'spotify' | 'soundcloud';
  audioType: 'track' | 'album' | 'playlist' | 'episode';
  artist?: string | null;
  embedUrl?: string | null;
}

export interface FigmaEmbedDetails {
  title?: string | null;
  author?: string | null;
  thumbnailUrl?: string | null;
}

export interface TwitterEmbedDetails {
  authorName?: string | null;
  authorHandle?: string | null;
  text?: string | null;
}

export interface CodePenEmbedDetails {
  author?: string | null;
  penId?: string | null;
}

export interface LinkEmbedData {
  url: string;
  type: LinkEmbedType;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
  favicon: string | null;
  youtube?: YouTubeEmbedDetails;
  github?: GitHubEmbedDetails;
  audio?: AudioEmbedDetails;
  figma?: FigmaEmbedDetails;
  twitter?: TwitterEmbedDetails;
  codePen?: CodePenEmbedDetails;
}

// Backward compatibility
export type OpenGraphData = LinkEmbedData;
