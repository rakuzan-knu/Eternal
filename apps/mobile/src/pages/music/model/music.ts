import { z } from 'zod';

export const trackSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: z.string(),
  artist: z
    .string()
    .nullish()
    .transform((value) => value || 'Unknown artist'),
  album: z.string().nullish(),
  albumArt: z
    .string()
    .nullish()
    .transform((value) => value || ''),
  durationMs: z
    .number()
    .nullish()
    .transform((value) => Math.max(0, value || 0)),
  previewUrl: z.string().nullish(),
  streamUrl: z.string().nullish(),
  spotifyUrl: z.string().nullish(),
  source: z.enum(['spotify', 'soundcloud', 'platform']).optional(),
  releaseDate: z.string().nullish(),
  addedAt: z.string().nullish(),
});
export type Track = z.infer<typeof trackSchema>;
export const playlistSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  coverUrl: z.string().nullish(),
  creator: z.string().nullish(),
  creatorId: z.string().optional(),
  creatorUsername: z.string().optional(),
  isPrivate: z.boolean().optional(),
  folderId: z.string().nullish(),
  createdAt: z.string().optional(),
  source: z.enum(['spotify', 'soundcloud']).optional(),
  trackCount: z.number().optional(),
  tracks: z.array(trackSchema).default([]),
});
export type Playlist = z.infer<typeof playlistSchema>;
export const folderSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().optional(),
  playlistIds: z.array(z.string()).default([]),
});
export type Folder = z.infer<typeof folderSchema>;
export type Source = 'all' | 'soundcloud' | 'spotify';
export type Repeat = 'off' | 'all' | 'one';
export const preferencesSchema = z.object({
  history: z.array(trackSchema).max(100).default([]),
  saved: z.array(playlistSchema).default([]),
  pinned: z.array(z.string()).default([]),
  volume: z.number().min(0).max(1).default(0.8),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export const emptyPreferences = (): Preferences => ({
  history: [],
  saved: [],
  pinned: [],
  volume: 0.8,
});
export const musicKeys = {
  library: (userId: string) => ['mobile', userId, 'music', 'library'] as const,
};
export function trackSource(track: Track) {
  return track.source || (/^(sc-|soundcloud-)/.test(track.id) ? 'soundcloud' : 'spotify');
}
export function durationLabel(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function nextIndex(index: number, length: number, repeat: Repeat, ended = false) {
  if (!length) return -1;
  if (ended && repeat === 'one') return index;
  return index + 1 < length ? index + 1 : repeat === 'all' ? 0 : -1;
}
export function sortTracks(tracks: Track[], sort: string, query = '') {
  const filtered = tracks.filter((track) =>
    `${track.title} ${track.artist} ${track.album || ''}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  if (sort === 'Title') return filtered.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'Artist') return filtered.sort((a, b) => a.artist.localeCompare(b.artist));
  if (sort === 'Album')
    return filtered.sort((a, b) => (a.album || '').localeCompare(b.album || ''));
  if (sort === 'Duration') return filtered.sort((a, b) => a.durationMs - b.durationMs);
  if (sort === 'Recently added')
    return filtered.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  return filtered;
}
export function parseLyrics(text: string) {
  return text.split('\n').flatMap((line) => {
    const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    return match
      ? [{ timeMs: (Number(match[1]) * 60 + Number(match[2])) * 1000, text: match[3].trim() }]
      : [];
  });
}
export function musicLink(kind: 'track' | 'playlist', id: string, origin: string) {
  return `${origin}/music/${kind}/${encodeURIComponent(id)}`;
}
