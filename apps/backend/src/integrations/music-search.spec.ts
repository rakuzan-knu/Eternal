import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SoundCloudService } from './soundcloud.service';
import { SpotifyService } from './spotify.service';

const fetchMock = vi.fn<typeof fetch>();
let soundcloud: SoundCloudService;
let spotify: SpotifyService;
beforeEach(async () => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const module = await Test.createTestingModule({
    providers: [
      SoundCloudService,
      SpotifyService,
      { provide: RedisService, useValue: {} },
      { provide: PrismaService, useValue: {} },
    ],
  }).compile();
  soundcloud = module.get(SoundCloudService);
  spotify = module.get(SpotifyService);
  vi.spyOn(soundcloud, 'getClientId').mockResolvedValue('test-client');
  vi.spyOn(spotify, 'getAppToken').mockResolvedValue('test-token');
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe.each(['soundcloud', 'spotify'] as const)('%s catalog', (provider) => {
  describe.each(['searchTracks', 'searchPlaylists'] as const)('%s', (method) => {
    const payload = () =>
      provider === 'soundcloud'
        ? { collection: [] }
        : { [method === 'searchTracks' ? 'tracks' : 'playlists']: { items: [] } };

    it('preserves a Cyrillic query and pagination without replacing it with recommendations', async () => {
      fetchMock.mockResolvedValue(Response.json(payload()));
      const service = provider === 'soundcloud' ? soundcloud : spotify;
      await expect(service[method]('  Моргенштерн  ', 10, 20)).resolves.toEqual([]);
      const [url, options] = fetchMock.mock.calls[0];
      const params = new URL(url instanceof Request ? url.url : url).searchParams;
      expect(params.get('q')).toBe('Моргенштерн');
      expect(params.get('offset')).toBe('20');
      expect(params.get('limit')).toBe('10');
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    });

    it.each([401, 429, 503])(
      'reports upstream HTTP %s as unavailable, not empty success',
      async (status) => {
        fetchMock.mockResolvedValue(new Response(null, { status }));
        const service = provider === 'soundcloud' ? soundcloud : spotify;
        await expect(service[method]('artist', 10)).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
      },
    );

    it('reports network failures and malformed responses as unavailable', async () => {
      const service = provider === 'soundcloud' ? soundcloud : spotify;
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      await expect(service[method]('artist', 10)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      fetchMock.mockResolvedValueOnce(Response.json({}));
      await expect(service[method]('artist', 10)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('does not contact the provider for a blank query', async () => {
      const service = provider === 'soundcloud' ? soundcloud : spotify;
      await expect(service[method]('   ')).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

it('refreshes SoundCloud access once after an expired client identifier', async () => {
  fetchMock
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ collection: [] }));
  await expect(soundcloud.searchTracks('artist', 10)).resolves.toEqual([]);
  expect(soundcloud.getClientId).toHaveBeenLastCalledWith(true);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('requires configured Spotify credentials instead of using credentials embedded in source', async () => {
  vi.mocked(spotify.getAppToken).mockRestore();
  vi.stubEnv('SPOTIFY_CLIENT_ID', '');
  vi.stubEnv('SPOTIFY_CLIENT_SECRET', '');
  await expect(spotify.getAppToken()).rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(fetchMock).not.toHaveBeenCalled();
});
