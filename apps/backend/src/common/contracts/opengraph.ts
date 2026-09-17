import { z } from 'zod';

export const linkEmbedTypeSchema = z.enum([
  'youtube',
  'github',
  'spotify',
  'soundcloud',
  'twitter',
  'figma',
  'codepen',
  'generic',
]);
export type LinkEmbedType = z.infer<typeof linkEmbedTypeSchema>;

export interface YouTubeEmbedDetails {
  videoId: string;
  author?: string | null | undefined;
  duration?: string | null | undefined;
  startSeconds?: number | null | undefined;
  isShorts?: boolean | undefined;
}

export interface GitHubEmbedDetails {
  owner: string;
  repo: string;
  stars: number;
  forks: number;
  language?: string | null | undefined;
  languageColor?: string | null | undefined;
  avatarUrl?: string | null | undefined;
}

export interface AudioEmbedDetails {
  provider: 'spotify' | 'soundcloud';
  audioType: 'track' | 'album' | 'playlist' | 'episode';
  artist?: string | null | undefined;
  embedUrl?: string | null | undefined;
}

export interface FigmaEmbedDetails {
  title?: string | null | undefined;
  author?: string | null | undefined;
  thumbnailUrl?: string | null | undefined;
}

export interface TwitterEmbedDetails {
  authorName?: string | null | undefined;
  authorHandle?: string | null | undefined;
  text?: string | null | undefined;
}

export interface CodePenEmbedDetails {
  author?: string | null | undefined;
  penId?: string | null | undefined;
}

export interface LinkEmbedData {
  url: string;
  type: LinkEmbedType;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
  favicon: string | null;
  youtube?: YouTubeEmbedDetails | undefined;
  github?: GitHubEmbedDetails | undefined;
  audio?: AudioEmbedDetails | undefined;
  figma?: FigmaEmbedDetails | undefined;
  twitter?: TwitterEmbedDetails | undefined;
  codePen?: CodePenEmbedDetails | undefined;
}

// Backward compatibility alias
export type OpenGraphMetadata = LinkEmbedData;

export const linkPreviewQuerySchema = z.object({
  url: z.string().min(1).max(2048),
});
export type LinkPreviewQueryDto = z.infer<typeof linkPreviewQuerySchema>;
