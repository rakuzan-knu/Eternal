import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WatchTogetherService } from '../watch-together.service';
import { BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '../../../redis/redis.service';

describe('WatchTogetherService', () => {
  let service: WatchTogetherService;
  let mockConfigService: any;
  let mockRedisService: any;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn().mockReturnValue(null),
    };
    mockRedisService = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
    };

    service = new WatchTogetherService(mockConfigService, mockRedisService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('getTrending', () => {
    it('returns trending videos with genuine IDs, thumbnails and durations', async () => {
      // Mock fetch to return invidious items
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            videoId: 'dQw4w9WgXcQ',
            title: 'Rick Astley - Never Gonna Give You Up',
            author: 'Rick Astley',
            videoThumbnails: [
              { quality: 'high', url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' },
            ],
            lengthSeconds: 213,
            viewCount: 1500000000,
            publishedText: '14 years ago',
          },
        ],
      } as any);

      const items = await service.getTrending('US');
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('title');
      expect(items[0]).toHaveProperty('thumbnailUrl');
      expect(items[0]).toHaveProperty('duration');
      expect(items[0].source).toBe('youtube');
    });

    it('falls back to popular curated videos if external instances fail', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const items = await service.getTrending('US');
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].source).toBe('youtube');
    });
  });

  describe('search', () => {
    it('searches videos for a given query', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            type: 'video',
            videoId: 'jfKfPfyJRdk',
            title: 'lofi hip hop radio',
            author: 'Lofi Girl',
            videoThumbnails: [
              { quality: 'high', url: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg' },
            ],
            lengthSeconds: 0,
            viewCount: 65000000,
            publishedText: 'Streaming live',
          },
        ],
      } as any);

      const res = await service.search('lofi');
      expect(res).toHaveProperty('items');
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items[0].source).toBe('youtube');
    });

    it('falls back to matching curated list if external instances fail', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const res = await service.search('lofi');
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
    });
  });

  describe('resolveUrl & Security / SSRF Protection', () => {
    it('rejects URLs that do not use https protocol', async () => {
      await expect(service.resolveUrl('http://example.com/video.mp4')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resolveUrl('javascript:alert(1)')).rejects.toThrow(BadRequestException);
      await expect(service.resolveUrl('data:text/html,test')).rejects.toThrow(BadRequestException);
    });

    it('rejects loopback and localhost URLs (SSRF protection)', async () => {
      await expect(service.resolveUrl('https://localhost/video.mp4')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resolveUrl('https://127.0.0.1/video.mp4')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resolveUrl('https://127.0.0.2/video.mp4')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('resolves YouTube URL correctly', async () => {
      const res = await service.resolveUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk');
      expect(res.type).toBe('youtube');
      expect(res.id).toBe('jfKfPfyJRdk');
      expect(res.thumbnailUrl).toContain('jfKfPfyJRdk');
    });

    it('resolves direct MP4 video stream correctly', async () => {
      const res = await service.resolveUrl(
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      );
      expect(res.type).toBe('direct');
      expect(res.url).toBe(
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      );
      expect(res.title).toBe('BigBuckBunny.mp4');
    });

    it('resolves Twitch URL correctly', async () => {
      const res = await service.resolveUrl('https://www.twitch.tv/shroud');
      expect(res.type).toBe('twitch');
      expect(res.id).toBe('shroud');
      expect(res.channelTitle).toBe('shroud');
    });
  });

  describe('recordWatchEvent', () => {
    it('rejects recording if engagement threshold is not met (< 30s and < 30%)', async () => {
      const res = await service.recordWatchEvent('user_1', {
        videoId: 'short_v',
        title: 'Random short preview',
        channelTitle: 'Creator',
        durationSec: 300,
        watchedSec: 15, // Only 15s out of 300s (5%)
      });

      expect(res.recorded).toBe(false);
      expect(res.reason).toContain('Threshold not met');
    });

    it('records event when watched >= 30 seconds and updates profile with time-decay', async () => {
      const res = await service.recordWatchEvent('user_1', {
        videoId: 'game_vid_1',
        title: 'Elden Ring Boss Fight Gameplay 4K',
        channelTitle: 'GamerGuy',
        durationSec: 600,
        watchedSec: 120, // 2 minutes (exceeds 30s)
        completedRatio: 0.2,
      });

      expect(res.recorded).toBe(true);
      expect(res.category).toBe('gaming');
      expect(res.watchFactor).toBeGreaterThan(0);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'watchtogether:profile:user_1',
        expect.stringContaining('gaming'),
        expect.any(Number),
      );
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'watchtogether:history:user_1',
        expect.stringContaining('game_vid_1'),
        expect.any(Number),
      );
    });

    it('records event when watched >= 30% of total duration even if total is under 30s', async () => {
      const res = await service.recordWatchEvent('user_1', {
        videoId: 'short_trailer',
        title: 'Teaser animation video',
        channelTitle: 'Studio',
        durationSec: 20,
        watchedSec: 10, // 50% of 20s
        completedRatio: 0.5,
      });

      expect(res.recorded).toBe(true);
    });
  });

  describe('getRecommendedRails', () => {
    it('applies hard-filter to exclude videos watched in the last 30 days', async () => {
      // Simulate user watched 'dQw4w9WgXcQ'
      mockRedisService.get = vi.fn().mockImplementation((key: string) => {
        if (key === 'watchtogether:history:user_1') {
          return Promise.resolve(
            JSON.stringify([
              {
                id: 'dQw4w9WgXcQ',
                title: 'Never Gonna Give You Up',
                channelTitle: 'Rick Astley',
                thumbnailUrl: 'https://example.com/thumb.jpg',
                duration: '3:33',
                durationSec: 213,
                watchedSec: 200,
                progress: 0.94,
                watchedAt: Date.now() - 3600000,
                source: 'youtube',
                url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
              },
            ]),
          );
        }
        if (key === 'watchtogether:profile:user_1') {
          return Promise.resolve(
            JSON.stringify({
              categories: { music: 5.2 },
              channels: { 'Rick Astley': 4.1 },
              keywords: { song: 2.0 },
              lastUpdated: Date.now(),
            }),
          );
        }
        return Promise.resolve(null);
      });

      // Mock fetch to reject so it falls back to curated items instantly without real network timeouts
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const response = await service.getRecommendedRails('user_1');
      expect(response).toHaveProperty('rails');
      expect(response.rails.length).toBeGreaterThan(0);

      // Verify that 'dQw4w9WgXcQ' is excluded from 'for-you' and 'trending' due to hard filter
      const forYouRail = response.rails.find((r) => r.id === 'for-you');
      expect(forYouRail).toBeDefined();
      const hasWatchedInForYou = forYouRail?.items.some((item) => item.id === 'dQw4w9WgXcQ');
      expect(hasWatchedInForYou).toBe(false);

      // But it SHOULD appear in the 'continue' watching rail!
      const continueRail = response.rails.find((r) => r.id === 'continue');
      expect(continueRail).toBeDefined();
      expect(continueRail?.items.some((item) => item.id === 'dQw4w9WgXcQ')).toBe(true);
    });

    it('returns rich discovery rails on cold start when user has no watch history', async () => {
      mockRedisService.get = vi.fn().mockResolvedValue(null);
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const response = await service.getRecommendedRails('new_user');
      expect(response.hasHistory).toBe(false);
      expect(response.rails.length).toBeGreaterThanOrEqual(3);

      const railIds = response.rails.map((r) => r.id);
      expect(railIds).toContain('for-you');
      expect(railIds).toContain('trending');
    });
  });
});
