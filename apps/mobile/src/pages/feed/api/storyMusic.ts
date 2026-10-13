import { z } from 'zod';
import { getMobileApi } from '@/shared/api/client';
const TrackSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  rawId: z.union([z.string(), z.number()]).transform(String).optional(),
  trackId: z.union([z.string(), z.number()]).transform(String).optional(),
  title: z.string().default('SoundCloud track'),
  artist: z.string().default('Artist'),
  albumArt: z.string().default(''),
  durationMs: z.number().optional(),
  previewUrl: z.string().optional(),
  streamUrl: z.string().optional(),
});
export type StoryTrack = z.infer<typeof TrackSchema>;
export const storyMusicApi = {
  async search(query: string, signal?: AbortSignal) {
    return z.array(TrackSchema).parse(
      (
        await getMobileApi().get<unknown>('/integrations/soundcloud/search', {
          params: { q: query, limit: 15, offset: 0 },
          signal,
        })
      ).data,
    );
  },
  async stream(trackId: string, signal?: AbortSignal) {
    const result = z
      .object({ streamUrl: z.string().url(), isHls: z.boolean().optional() })
      .nullable()
      .parse(
        (
          await getMobileApi().get<unknown>(
            `/integrations/soundcloud/stream/${encodeURIComponent(trackId)}`,
            { signal },
          )
        ).data,
      );
    if (!result) throw new Error('This track cannot be played.');
    return result.streamUrl;
  },
};
export function soundCloudId(track: StoryTrack) {
  const id = (track.rawId || track.trackId || track.id).replace(/^(sc-|soundcloud-)/, '');
  if (!/^\d+$/.test(id)) throw new Error('This track is unavailable.');
  return id;
}
