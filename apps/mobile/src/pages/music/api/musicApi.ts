import { z } from 'zod';
import { getMobileApi } from '@/shared/api/client';
import {
  trackSchema,
  playlistSchema,
  folderSchema,
  trackSource,
  type Track,
  type Source,
  type Playlist,
} from '../model/music';

const root = '/integrations';
const segment = encodeURIComponent;
async function get(path: string, signal?: AbortSignal) {
  return (await getMobileApi().get<unknown>(`${root}${path}`, { signal })).data;
}
export const musicApi = {
  tracks: async (
    query: string,
    source: Exclude<Source, 'all'>,
    offset = 0,
    signal?: AbortSignal,
  ) => {
    const data = await get(
      `/${source}/search?q=${segment(query)}&limit=20&offset=${offset}`,
      signal,
    );
    return z
      .array(trackSchema)
      .parse(data)
      .map((track) => ({ ...track, source }));
  },
  playlists: async (
    query: string,
    source: Exclude<Source, 'all'>,
    offset = 0,
    signal?: AbortSignal,
  ) => {
    const data = await get(
      `/${source}/search/playlists?q=${segment(query)}&limit=12&offset=${offset}`,
      signal,
    );
    return z
      .array(playlistSchema)
      .parse(data)
      .map((playlist) => ({ ...playlist, source }));
  },
  playlist: async (playlist: Playlist, signal?: AbortSignal) => {
    const source =
      playlist.source ||
      (playlist.id.startsWith('sc-pl-')
        ? 'soundcloud'
        : playlist.id.startsWith('sp-pl-')
          ? 'spotify'
          : null);
    const id = playlist.id.replace(/^(sc-pl-|sp-pl-|playlist-|pl-)/, '');
    return playlistSchema.parse(
      await get(
        source ? `/${source}/playlists/${segment(id)}` : `/music/playlists/${segment(playlist.id)}`,
        signal,
      ),
    );
  },
  liked: async (signal?: AbortSignal) =>
    z.array(trackSchema).parse(await get('/music/liked-tracks', signal)),
  library: async (signal?: AbortSignal) =>
    z.array(playlistSchema).parse(await get('/music/playlists', signal)),
  folders: async (signal?: AbortSignal) =>
    z.array(folderSchema).parse(await get('/music/folders', signal)),
  like: async (track: Track, liked: boolean) =>
    liked
      ? getMobileApi().post(`${root}/music/liked-tracks`, { track })
      : getMobileApi().delete(`${root}/music/liked-tracks/${segment(track.id)}`),
  create: async (input: {
    title: string;
    description?: string;
    coverUrl?: string;
    isPublic: boolean;
    folderId?: string | null;
  }) => playlistSchema.parse((await getMobileApi().post(`${root}/music/playlists`, input)).data),
  update: async (
    id: string,
    input: {
      title?: string;
      description?: string;
      coverUrl?: string;
      isPublic?: boolean;
      folderId?: string | null;
    },
  ) =>
    playlistSchema.parse(
      (await getMobileApi().patch(`${root}/music/playlists/${segment(id)}`, input)).data,
    ),
  remove: async (id: string) => getMobileApi().delete(`${root}/music/playlists/${segment(id)}`),
  addTrack: async (id: string, track: Track) =>
    getMobileApi().post(`${root}/music/playlists/${segment(id)}/tracks`, { track }),
  removeTrack: async (id: string, trackId: string) =>
    getMobileApi().delete(`${root}/music/playlists/${segment(id)}/tracks/${segment(trackId)}`),
  createFolder: async (name: string) =>
    folderSchema.parse((await getMobileApi().post(`${root}/music/folders`, { name })).data),
  renameFolder: async (id: string, name: string) =>
    getMobileApi().patch(`${root}/music/folders/${segment(id)}`, { name }),
  removeFolder: async (id: string) => getMobileApi().delete(`${root}/music/folders/${segment(id)}`),
  stream: async (
    track: Track,
    signal?: AbortSignal,
    bypassCache = false,
  ): Promise<{ uri: string; preview: boolean; isHls: boolean }> => {
    if (trackSource(track) === 'soundcloud') {
      const id = track.id.replace(/^(sc-|soundcloud-)/, '');
      const data = z
        .object({ streamUrl: z.string().url(), isHls: z.boolean().optional() })
        .nullable()
        .parse(await get(`/soundcloud/stream/${segment(id)}?bypassCache=${bypassCache}`, signal));
      if (!data) throw new Error('This track is currently unavailable.');
      return {
        uri: data.streamUrl,
        preview: false,
        isHls: data.isHls || data.streamUrl.includes('.m3u8'),
      };
    }
    const uri = trackSource(track) === 'platform' ? track.streamUrl : track.previewUrl;
    if (!uri || !/^https?:\/\//.test(uri))
      throw new Error(
        'This Spotify track has no preview. Open it in Spotify to listen with your account.',
      );
    return { uri, preview: trackSource(track) === 'spotify', isHls: uri.includes('.m3u8') };
  },
  lyrics: async (track: Track, signal?: AbortSignal) =>
    z
      .object({
        synced: z.boolean(),
        lines: z.array(z.object({ timeMs: z.number(), text: z.string() })),
      })
      .nullable()
      .parse(
        await get(
          `/spotify/lyrics?title=${segment(track.title)}&artist=${segment(track.artist)}&duration=${track.durationMs}`,
          signal,
        ),
      ),
  recommendations: async (track: Track, signal?: AbortSignal) => {
    const data = z
      .object({ tracks: z.array(trackSchema), hasMore: z.boolean().optional() })
      .parse(
        await get(
          `/spotify/queue?trackId=${segment(track.id)}&artist=${segment(track.artist)}&title=${segment(track.title)}`,
          signal,
        ),
      );
    return data.tracks;
  },
};
