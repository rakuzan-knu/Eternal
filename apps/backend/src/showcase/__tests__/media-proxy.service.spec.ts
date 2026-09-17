import { Logger } from '@nestjs/common';
import { MediaProxyService, type ShowcaseTrackItem } from '../media-proxy.service';
import type { RedisService } from '../../redis/redis.service';
import type { SoundCloudService } from '../../integrations/soundcloud.service';
import { ShowcaseMediaType } from '@common/contracts';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MediaProxyService', () => {
  let service: MediaProxyService;
  let redis: {
    getOrSet: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    redis = {
      getOrSet: jest
        .fn()
        .mockImplementation((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
    };
    service = new MediaProxyService(
      redis as unknown as RedisService,
      { searchTracks: jest.fn().mockResolvedValue([]) } as unknown as SoundCloudService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchMedia - ANIME', () => {
    it('searches anime locally and queries AniList if needed', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          data: {
            Page: {
              media: [
                {
                  id: 101,
                  title: { english: 'Solo Leveling', romaji: 'Ore dake Level Up na Ken' },
                  coverImage: { extraLarge: 'https://example.com/solo.jpg' },
                  averageScore: 88,
                  seasonYear: 2024,
                  siteUrl: 'https://anilist.co/anime/101',
                },
              ],
            },
          },
        },
      });

      const results = await service.searchMedia('solo', ShowcaseMediaType.ANIME);
      expect(results.length).toBeGreaterThan(0);
      expect(redis.getOrSet).toHaveBeenCalled();
    });

    it('returns empty/default local anime when query is empty', async () => {
      const results = await service.searchMedia('', ShowcaseMediaType.ANIME);
      expect(results.length).toBeGreaterThan(0);
    });

    it('handles AniList API failures gracefully with fallback', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
      const results = await service.searchMedia('nonexistentanimexyz', ShowcaseMediaType.ANIME);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Nonexistentanimexyz');
    });
  });

  describe('searchMedia - GAME', () => {
    const originalRawg = process.env.RAWG_API_KEY;

    afterEach(() => {
      process.env.RAWG_API_KEY = originalRawg;
    });

    it('searches games via RAWG when API key is set', async () => {
      process.env.RAWG_API_KEY = 'test-rawg-key';
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 3498,
              name: 'Grand Theft Auto V',
              background_image: 'https://example.com/gtav.jpg',
              released: '2013-09-17',
              rating: 4.47,
              slug: 'grand-theft-auto-v',
            },
          ],
        },
      });

      const results = await service.searchMedia('gta', ShowcaseMediaType.GAME);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe('Grand Theft Auto V');
    });

    it('falls back to local curated database if RAWG search fails or key missing', async () => {
      process.env.RAWG_API_KEY = 'test-rawg-key';
      mockedAxios.get.mockRejectedValueOnce(new Error('RAWG error'));

      const results = await service.searchMedia('dota', ShowcaseMediaType.GAME);
      expect(results.some((g) => g.title.toLowerCase().includes('dota'))).toBe(true);
    });

    it('returns custom game item if not found in curated list', async () => {
      delete process.env.RAWG_API_KEY;
      const results = await service.searchMedia('superunknownindiegame123', ShowcaseMediaType.GAME);
      expect(results[0].title).toBe('Superunknownindiegame123');
    });

    it('returns popular games when query is empty', async () => {
      const results = await service.searchMedia('', ShowcaseMediaType.GAME);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchMedia - MOVIE & SERIES', () => {
    const originalTmdb = process.env.TMDB_API_KEY;

    afterEach(() => {
      process.env.TMDB_API_KEY = originalTmdb;
    });

    it('searches movies via TMDB when key is set', async () => {
      process.env.TMDB_API_KEY = 'test-tmdb-key';
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 550,
              title: 'Fight Club',
              poster_path: '/poster.jpg',
              release_date: '1999-10-15',
              vote_average: 8.4,
            },
          ],
        },
      });

      const results = await service.searchMedia('fight club', ShowcaseMediaType.MOVIE);
      expect(results.length).toBeGreaterThan(0);
    });

    it('searches series with local fallback', async () => {
      delete process.env.TMDB_API_KEY;
      const results = await service.searchMedia('breaking bad', ShowcaseMediaType.SERIES);
      expect(results.length).toBeGreaterThan(0);
    });

    it('handles empty cinema query', async () => {
      const results = await service.searchMedia('', ShowcaseMediaType.MOVIE);
      expect(results.length).toBeGreaterThan(0);
    });

    it('handles unknown cinema fallback', async () => {
      delete process.env.TMDB_API_KEY;
      const results = await service.searchMedia('unlistedcinemamovie999', ShowcaseMediaType.MOVIE);
      expect(results[0].title).toBe('Unlistedcinemamovie999');
    });
  });

  describe('searchMedia - default branch', () => {
    it('returns empty array for unsupported media type', async () => {
      const results = await service.searchMedia('test', 'UNKNOWN' as unknown as ShowcaseMediaType);
      expect(results).toEqual([]);
    });
  });

  describe('searchTracks', () => {
    it('searches tracks via iTunes API', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          resultCount: 1,
          results: [
            {
              trackName: 'In the End',
              artistName: 'Linkin Park',
              artworkUrl100: 'https://example.com/100x100bb.jpg',
              previewUrl: 'https://example.com/preview.m4a',
              trackViewUrl: 'https://music.apple.com/track',
              trackTimeMillis: 216000,
            },
          ],
        },
      });

      const tracks: ShowcaseTrackItem[] = await service.searchTracks('linkin park');
      expect(tracks).toHaveLength(1);
      const firstTrack = tracks[0];
      expect(firstTrack?.title).toBe('In the End');
      expect(firstTrack?.albumArt).toContain('600x600bb');
    });

    it('falls back to popular tracks if query is empty or iTunes search fails', async () => {
      const defaultTracks = await service.searchTracks('');
      expect(defaultTracks.length).toBeGreaterThan(0);

      mockedAxios.get.mockRejectedValueOnce(new Error('iTunes error'));
      const fallbackTracks = await service.searchTracks('Starboy');
      expect(fallbackTracks.length).toBeGreaterThan(0);
    });

    it('returns custom synthesized track on unfound query', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('iTunes error'));
      const tracks: ShowcaseTrackItem[] = await service.searchTracks('unknownindiebandxyz');
      const firstTrack = tracks[0];
      expect(firstTrack?.title).toBe('Unknownindiebandxyz');
    });
  });
});
