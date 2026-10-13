import { beforeEach, expect, it, vi } from 'vitest';
import { musicApi } from './musicApi';
import { trackSchema, folderSchema } from '../model/music';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock('@/shared/api/client', () => ({ getMobileApi: () => api }));
beforeEach(() => vi.clearAllMocks());
const track = trackSchema.parse({
  id: 'sc-123',
  title: 'Song',
  artist: 'Artist',
  durationMs: 60_000,
});
it('resolves SoundCloud audio from JSON and bypasses an expired cached URL when retrying', async () => {
  api.get.mockResolvedValue({ data: { streamUrl: 'https://cdn.example/song.m3u8', isHls: true } });
  expect(await musicApi.stream(track, undefined, true)).toEqual({
    uri: 'https://cdn.example/song.m3u8',
    preview: false,
    isHls: true,
  });
  expect(api.get).toHaveBeenCalledWith('/integrations/soundcloud/stream/123?bypassCache=true', {
    signal: undefined,
  });
});
it('uses the structured synced lyrics contract and preserves millisecond timestamps', async () => {
  const data = { synced: true, lines: [{ timeMs: 12_500, text: 'A line' }] };
  api.get.mockResolvedValue({ data });
  expect(await musicApi.lyrics(track)).toEqual(data);
});
it('does not treat Spotify URLs as playable streams without a preview', async () => {
  await expect(
    musicApi.stream({
      ...track,
      id: 'spotify-id',
      source: 'spotify',
      spotifyUrl: 'https://open.spotify.com/track/id',
    }),
  ).rejects.toThrow('no preview');
  expect(api.get).not.toHaveBeenCalled();
});
it('sends server privacy and folder fields unchanged', async () => {
  api.patch.mockResolvedValue({ data: { id: 'private', title: 'Private', isPrivate: true } });
  await musicApi.update('private', { isPublic: false, folderId: null });
  expect(api.patch).toHaveBeenCalledWith('/integrations/music/playlists/private', {
    isPublic: false,
    folderId: null,
  });
});

it('preserves optional folder creation dates for sorting and accepts older responses', () => {
  expect(
    folderSchema.parse({ id: 'one', name: 'New', createdAt: '2026-10-12T10:00:00Z' }).createdAt,
  ).toBe('2026-10-12T10:00:00Z');
  expect(folderSchema.parse({ id: 'old', name: 'Existing' })).toEqual({
    id: 'old',
    name: 'Existing',
    playlistIds: [],
  });
});
