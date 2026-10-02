import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import dns from 'node:dns/promises';
import type {
  WatchTogetherVideoItem,
  ResolvedMediaResponse,
  RecordWatchEventDto,
  UserInterestProfile,
  UserWatchHistoryItem,
  WatchTogetherRail,
  WatchTogetherRailsResponse,
} from './watch-together.types';

function parseIso8601Duration(iso: string): { formatted: string; totalSeconds: number } {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return { formatted: '0:00', totalSeconds: 0 };
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const formatted =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${minutes}:${String(seconds).padStart(2, '0')}`;
  return { formatted, totalSeconds };
}

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const remSec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
  }
  return `${m}:${String(remSec).padStart(2, '0')}`;
}

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === 'localhost') return true;
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
    if (parts[0] === 0) return true;
  }
  if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) return true;
  return false;
}

// Resilient default trending items (100% genuine YouTube IDs with real high-res thumbnails & streams)
const POPULAR_CURATED_VIDEOS: WatchTogetherVideoItem[] = [
  {
    id: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio 📚 - beats to relax/study to',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 'LIVE',
    durationSec: 0,
    viewCount: '65M+',
    publishedAt: '2024-01-01',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    id: 'aqz-KE-bpKQ',
    title: 'Big Buck Bunny 4K 60fps',
    channelTitle: 'Blender Foundation',
    thumbnailUrl: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
    duration: '10:34',
    durationSec: 634,
    viewCount: '15M+',
    publishedAt: '2022-01-01',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  },
  {
    id: '4xDzrJKXOOY',
    title: 'synthwave radio - chill synth / retro beats',
    channelTitle: 'Lofi Girl',
    thumbnailUrl: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    duration: 'LIVE',
    durationSec: 0,
    viewCount: '8M+',
    publishedAt: '2024-01-01',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
    channelTitle: 'Rick Astley',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    duration: '3:33',
    durationSec: 213,
    viewCount: '1.5B',
    publishedAt: '2009-10-25',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    channelTitle: 'Luis Fonsi',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    duration: '4:42',
    durationSec: 282,
    viewCount: '8.4B',
    publishedAt: '2017-01-13',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Queen – Bohemian Rhapsody (Official Video Remastered)',
    channelTitle: 'Queen Official',
    thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    duration: '5:59',
    durationSec: 359,
    viewCount: '1.7B',
    publishedAt: '2008-08-01',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
  },
  {
    id: 'JGwWNGJdvx8',
    title: 'Ed Sheeran - Shape of You (Official Music Video)',
    channelTitle: 'Ed Sheeran',
    thumbnailUrl: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
    duration: '4:24',
    durationSec: 264,
    viewCount: '6.2B',
    publishedAt: '2017-01-30',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
  },
  {
    id: 'CevxZvSJLk8',
    title: 'Katy Perry - Roar (Official)',
    channelTitle: 'Katy Perry',
    thumbnailUrl: 'https://i.ytimg.com/vi/CevxZvSJLk8/hqdefault.jpg',
    duration: '4:30',
    durationSec: 270,
    viewCount: '3.9B',
    publishedAt: '2013-09-05',
    source: 'youtube',
    url: 'https://www.youtube.com/watch?v=CevxZvSJLk8',
  },
];

@Injectable()
export class WatchTogetherService {
  private readonly logger = new Logger(WatchTogetherService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /* -------------------------------------------------------------------------- */
  /*                            YOUTUBE TRENDING                                */
  /* -------------------------------------------------------------------------- */

  async getTrending(regionCode = 'US'): Promise<WatchTogetherVideoItem[]> {
    const cacheKey = `watchtogether:trending:${regionCode}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Continue to fresh fetch
      }
    }

    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');

    // 1. If official API key is provided, query YouTube Data API v3
    if (apiKey && apiKey !== 'mock' && apiKey.length > 10) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=24&key=${apiKey}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SocialNetwork-WatchTogether/1.0' },
        });
        if (res.ok) {
          const data = (await res.json()) as any;
          if (Array.isArray(data.items)) {
            const items: WatchTogetherVideoItem[] = data.items.map((item: any) => {
              const dur = parseIso8601Duration(item.contentDetails?.duration || 'PT0S');
              return {
                id: item.id,
                title: item.snippet?.title || 'YouTube Video',
                channelTitle: item.snippet?.channelTitle || 'YouTube',
                thumbnailUrl:
                  item.snippet?.thumbnails?.maxres?.url ||
                  item.snippet?.thumbnails?.high?.url ||
                  item.snippet?.thumbnails?.medium?.url ||
                  `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                duration: dur.formatted,
                durationSec: dur.totalSeconds,
                viewCount: item.statistics?.viewCount
                  ? Number(item.statistics.viewCount).toLocaleString()
                  : undefined,
                publishedAt: item.snippet?.publishedAt,
                source: 'youtube',
                url: `https://www.youtube.com/watch?v=${item.id}`,
              };
            });

            if (items.length > 0) {
              await this.redisService.set(cacheKey, JSON.stringify(items), 3600);
              return items;
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `YouTube Data API trending fetch error, falling back to public mirrors: ${String(err)}`,
        );
      }
    }

    // 2. Resilient Invidious / Piped public instance fetch
    const publicInstances = [
      'https://vid.puffyan.us',
      'https://inv.tux.pizza',
      'https://invidious.jing.rocks',
    ];

    for (const inst of publicInstances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${inst}/api/v1/trending?region=${regionCode}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          if (Array.isArray(data) && data.length > 0) {
            const items: WatchTogetherVideoItem[] = data.slice(0, 24).map((item: any) => {
              const sec = Number(item.lengthSeconds) || 0;
              return {
                id: item.videoId,
                title: item.title,
                channelTitle: item.author || 'YouTube',
                thumbnailUrl:
                  item.videoThumbnails?.find((t: any) => t.quality === 'high')?.url ||
                  `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                duration: formatSeconds(sec),
                durationSec: sec,
                viewCount:
                  item.viewCountText ||
                  (item.viewCount ? Number(item.viewCount).toLocaleString() : undefined),
                publishedAt: item.publishedText,
                source: 'youtube',
                url: `https://www.youtube.com/watch?v=${item.videoId}`,
              };
            });

            if (items.length > 0) {
              await this.redisService.set(cacheKey, JSON.stringify(items), 3600);
              return items;
            }
          }
        }
      } catch {
        // Try next instance
      }
    }

    // 3. Fallback to verified popular curated items (guaranteed 100% genuine real videos)
    await this.redisService.set(cacheKey, JSON.stringify(POPULAR_CURATED_VIDEOS), 3600);
    return POPULAR_CURATED_VIDEOS;
  }

  /* -------------------------------------------------------------------------- */
  /*                             YOUTUBE SEARCH                                 */
  /* -------------------------------------------------------------------------- */

  async search(
    query: string,
    pageToken?: string,
  ): Promise<{ items: WatchTogetherVideoItem[]; nextPageToken?: string }> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      const trending = await this.getTrending();
      return { items: trending };
    }

    const cacheKey = `watchtogether:search:${cleanQuery.toLowerCase()}:${pageToken || ''}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.items?.length) return parsed;
      } catch {
        // Continue
      }
    }

    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');

    // 1. YouTube Data API v3 if API key available
    if (apiKey && apiKey !== 'mock' && apiKey.length > 10) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(
          cleanQuery,
        )}${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`;
        const searchRes = await fetch(searchUrl);
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as any;
          const videoIds = (searchData.items || []).map((i: any) => i.id?.videoId).filter(Boolean);

          if (videoIds.length > 0) {
            // Batch videos.list to get exact duration and statistics
            const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,statistics&id=${videoIds.join(
              ',',
            )}&key=${apiKey}`;
            const detailsRes = await fetch(detailsUrl);
            if (detailsRes.ok) {
              const detailsData = (await detailsRes.json()) as any;
              const items: WatchTogetherVideoItem[] = (detailsData.items || []).map((item: any) => {
                const dur = parseIso8601Duration(item.contentDetails?.duration || 'PT0S');
                return {
                  id: item.id,
                  title: item.snippet?.title || 'YouTube Video',
                  channelTitle: item.snippet?.channelTitle || 'YouTube',
                  thumbnailUrl:
                    item.snippet?.thumbnails?.maxres?.url ||
                    item.snippet?.thumbnails?.high?.url ||
                    item.snippet?.thumbnails?.medium?.url ||
                    `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
                  duration: dur.formatted,
                  durationSec: dur.totalSeconds,
                  viewCount: item.statistics?.viewCount
                    ? Number(item.statistics.viewCount).toLocaleString()
                    : undefined,
                  publishedAt: item.snippet?.publishedAt,
                  source: 'youtube',
                  url: `https://www.youtube.com/watch?v=${item.id}`,
                };
              });

              const result = { items, nextPageToken: searchData.nextPageToken };
              await this.redisService.set(cacheKey, JSON.stringify(result), 1800);
              return result;
            }
          }
        }
      } catch (err) {
        this.logger.warn(`YouTube search API error, falling back: ${String(err)}`);
      }
    }

    // 2. Invidious Search Fallback
    const publicInstances = [
      'https://vid.puffyan.us',
      'https://inv.tux.pizza',
      'https://invidious.jing.rocks',
    ];

    for (const inst of publicInstances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `${inst}/api/v1/search?q=${encodeURIComponent(cleanQuery)}&type=video`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          },
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = (await res.json()) as any;
          if (Array.isArray(data) && data.length > 0) {
            const items: WatchTogetherVideoItem[] = data.slice(0, 20).map((item: any) => {
              const sec = Number(item.lengthSeconds) || 0;
              return {
                id: item.videoId,
                title: item.title,
                channelTitle: item.author || 'YouTube',
                thumbnailUrl:
                  item.videoThumbnails?.find((t: any) => t.quality === 'high')?.url ||
                  `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`,
                duration: formatSeconds(sec),
                durationSec: sec,
                viewCount: item.viewCountText,
                publishedAt: item.publishedText,
                source: 'youtube',
                url: `https://www.youtube.com/watch?v=${item.videoId}`,
              };
            });

            const result = { items };
            await this.redisService.set(cacheKey, JSON.stringify(result), 1800);
            return result;
          }
        }
      } catch {
        // Try next mirror
      }
    }

    // 3. Smart filter on curated list matching query
    const filtered = POPULAR_CURATED_VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(cleanQuery.toLowerCase()) ||
        v.channelTitle.toLowerCase().includes(cleanQuery.toLowerCase()),
    );
    const result = { items: filtered.length > 0 ? filtered : POPULAR_CURATED_VIDEOS };
    return result;
  }

  /* -------------------------------------------------------------------------- */
  /*                         RESOLVE ARBITRARY URL                              */
  /* -------------------------------------------------------------------------- */

  async resolveUrl(rawUrl: string): Promise<ResolvedMediaResponse> {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new BadRequestException('URL is required');
    }

    const trimmed = rawUrl.trim();

    // 1. Strict Protocol Whitelist: ONLY https:// is permitted
    if (!trimmed.startsWith('https://')) {
      throw new BadRequestException('Only secure HTTPS URLs are permitted (https://)');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException('Invalid URL format');
    }

    // 2. SSRF Protection: Resolve hostname and block internal/private networks
    try {
      const lookup = await dns.lookup(parsed.hostname);
      if (isPrivateIp(lookup.address)) {
        throw new BadRequestException('Access to private or local network resources is forbidden');
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`Could not resolve hostname ${parsed.hostname}`);
    }

    const host = parsed.hostname.toLowerCase();

    // 3. YouTube detection (youtube.com, youtu.be)
    const ytMatch =
      trimmed.match(
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
      ) || trimmed.match(/youtube\.com\/shorts\/([^"&?\/\s]{11})/);

    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      let title = 'YouTube Video';
      let channelTitle = 'YouTube';

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        );
        if (oembedRes.ok) {
          const oembedData = (await oembedRes.json()) as any;
          title = oembedData.title || title;
          channelTitle = oembedData.author_name || channelTitle;
        }
      } catch {
        // Non-blocking fallback
      }

      return {
        type: 'youtube',
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        channelTitle,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }

    // 4. Twitch detection (twitch.tv/username)
    if (host === 'twitch.tv' || host === 'www.twitch.tv') {
      const channelMatch = parsed.pathname.match(/^\/([a-zA-Z0-9_]{3,25})$/);
      if (channelMatch && channelMatch[1]) {
        const channel = channelMatch[1];
        return {
          type: 'twitch',
          id: channel,
          url: `https://www.twitch.tv/${channel}`,
          title: `Twitch: ${channel}`,
          channelTitle: channel,
          isLive: true,
        };
      }
    }

    // 5. Direct Video Streams (.mp4, .webm, .m3u8, .mpd)
    const pathname = parsed.pathname.toLowerCase();
    const isDirectExtension =
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.webm') ||
      pathname.endsWith('.m3u8') ||
      pathname.endsWith('.mpd');

    if (isDirectExtension) {
      const fileName = parsed.pathname.split('/').pop() || 'Video Stream';
      return {
        type: 'direct',
        url: trimmed,
        title: decodeURIComponent(fileName),
      };
    }

    // 6. Safe Content-Type Verification for unknown paths
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const headRes = await fetch(trimmed, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'SocialNetwork-WatchTogether/1.0' },
      });
      clearTimeout(timeout);

      const contentType = headRes.headers.get('content-type') || '';
      if (
        contentType.includes('video/') ||
        contentType.includes('application/x-mpegURL') ||
        contentType.includes('application/vnd.apple.mpegurl')
      ) {
        const fileName = parsed.pathname.split('/').pop() || 'Direct Video';
        return {
          type: 'direct',
          url: trimmed,
          title: decodeURIComponent(fileName),
        };
      }
    } catch {
      // Rejection
    }

    throw new BadRequestException(
      'Only HTTPS YouTube links, Twitch streams, and direct video files (.mp4, .webm, .m3u8) are permitted',
    );
  }

  /* -------------------------------------------------------------------------- */
  /*                    RECOMMENDATIONS PIPELINE & WATCH HISTORY                */
  /* -------------------------------------------------------------------------- */

  /**
   * Infer video category from title and channel metadata
   */
  private inferCategory(title: string, channelTitle?: string): string {
    const text = `${title} ${channelTitle || ''}`.toLowerCase();
    if (
      text.includes('game') ||
      text.includes('gaming') ||
      text.includes('gameplay') ||
      text.includes('walkthrough') ||
      text.includes('roblox') ||
      text.includes('minecraft') ||
      text.includes('gta') ||
      text.includes('esports') ||
      text.includes('steam') ||
      text.includes('playstation') ||
      text.includes('xbox') ||
      text.includes('nintendo')
    ) {
      return 'gaming';
    }
    if (
      text.includes('music') ||
      text.includes('song') ||
      text.includes('audio') ||
      text.includes('track') ||
      text.includes('band') ||
      text.includes('album') ||
      text.includes('lofi') ||
      text.includes('beats') ||
      text.includes('synthwave') ||
      text.includes('rap') ||
      text.includes('rock') ||
      text.includes('pop') ||
      text.includes('orchestra') ||
      text.includes('singer')
    ) {
      return 'music';
    }
    if (
      text.includes('code') ||
      text.includes('programming') ||
      text.includes('tech') ||
      text.includes('ai ') ||
      text.includes('science') ||
      text.includes('computer') ||
      text.includes('review') ||
      text.includes('tutorial') ||
      text.includes('physics') ||
      text.includes('engine')
    ) {
      return 'tech';
    }
    if (
      text.includes('movie') ||
      text.includes('film') ||
      text.includes('trailer') ||
      text.includes('cinema') ||
      text.includes('animation') ||
      text.includes('anime') ||
      text.includes('episode')
    ) {
      return 'cinema';
    }
    return 'entertainment';
  }

  /**
   * Extract meaningful keywords from title, filtering stop words
   */
  private extractKeywords(title: string): string[] {
    const stopWords = new Set([
      'the',
      'and',
      'a',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'is',
      'it',
      'an',
      'this',
      'that',
      'official',
      'video',
      'hd',
      '4k',
      'mv',
      'ft',
      'feat',
      'music',
      'live',
      'stream',
      'part',
      'ep',
      'trailer',
      'remix',
      'mix',
      'full',
      'new',
      'version',
      'audio',
      'lyrics',
      'watch',
      'episode',
    ]);
    return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .slice(0, 5);
  }

  /**
   * Records a user's watch session with engagement threshold check (>=30s or >=30% duration)
   * Updates interest profile in Redis with time-decay (Weight_new = Weight_old * 0.95 + WatchDurationFactor)
   * Appends to 30-day watch history (used as hard filter)
   */
  async recordWatchEvent(
    userId: string,
    dto: RecordWatchEventDto,
  ): Promise<{ recorded: boolean; category?: string; watchFactor?: number; reason?: string }> {
    if (!userId || !dto?.videoId) {
      return { recorded: false, reason: 'Invalid payload: userId and videoId required' };
    }

    // 1. Engagement threshold: record ONLY if user watched >= 30 seconds OR >= 30% of total duration
    const isEngaged =
      dto.watchedSec >= 30 || (dto.durationSec > 0 && dto.watchedSec / dto.durationSec >= 0.3);

    if (!isEngaged) {
      return {
        recorded: false,
        reason: 'Threshold not met: user must watch >= 30s or >= 30% of total video duration',
      };
    }

    // 2. Identify category & extract keywords
    const category = dto.categoryId || this.inferCategory(dto.title, dto.channelTitle);
    const keywords = this.extractKeywords(dto.title);

    // 3. Calculate WatchDurationFactor: scaled with duration, bonus for completion >= 80%
    const baseFactor = Math.min(3.0, Math.max(0.5, dto.watchedSec / 60));
    const completionBonus = dto.completedRatio && dto.completedRatio >= 0.8 ? 1.25 : 1.0;
    const watchDurationFactor = Number((baseFactor * completionBonus).toFixed(3));

    // 4. Update Interest Profile with Time-Decay:
    // Weight_new = Weight_old * 0.95 + WatchDurationFactor
    const profile = await this.getUserProfile(userId);

    // Apply 0.95 time-decay to all existing weights
    for (const k of Object.keys(profile.categories)) {
      profile.categories[k] = Number((profile.categories[k] * 0.95).toFixed(3));
    }
    for (const k of Object.keys(profile.channels)) {
      profile.channels[k] = Number((profile.channels[k] * 0.95).toFixed(3));
    }
    for (const k of Object.keys(profile.keywords)) {
      profile.keywords[k] = Number((profile.keywords[k] * 0.95).toFixed(3));
    }

    // Accumulate new weights
    profile.categories[category] = Number(
      ((profile.categories[category] || 0) + watchDurationFactor).toFixed(3),
    );

    if (dto.channelTitle) {
      profile.channels[dto.channelTitle] = Number(
        ((profile.channels[dto.channelTitle] || 0) + watchDurationFactor).toFixed(3),
      );
    }

    for (const kw of keywords) {
      profile.keywords[kw] = Number(
        ((profile.keywords[kw] || 0) + watchDurationFactor * 0.5).toFixed(3),
      );
    }

    profile.lastUpdated = Date.now();
    await this.redisService.set(
      `watchtogether:profile:${userId}`,
      JSON.stringify(profile),
      7776000, // 90 days TTL
    );

    // 5. Update Watch History (30-day window, also acts as Hard Filter against repeats)
    const history = await this.getUserWatchHistory(userId);
    const filteredHistory = history.filter((item) => item.id !== dto.videoId);
    const historyItem: UserWatchHistoryItem = {
      id: dto.videoId,
      title: dto.title,
      channelTitle: dto.channelTitle,
      thumbnailUrl: dto.thumbnailUrl || `https://i.ytimg.com/vi/${dto.videoId}/hqdefault.jpg`,
      duration: formatSeconds(dto.durationSec),
      durationSec: dto.durationSec,
      watchedSec: dto.watchedSec,
      progress: Math.min(
        1,
        Math.max(0, Number((dto.watchedSec / (dto.durationSec || 1)).toFixed(2))),
      ),
      watchedAt: Date.now(),
      source: dto.source || 'youtube',
      url:
        dto.source === 'youtube'
          ? `https://www.youtube.com/watch?v=${dto.videoId}`
          : (dto as any).url || `https://www.youtube.com/watch?v=${dto.videoId}`,
    };

    filteredHistory.unshift(historyItem);
    const cappedHistory = filteredHistory.slice(0, 50);

    await this.redisService.set(
      `watchtogether:history:${userId}`,
      JSON.stringify(cappedHistory),
      2592000, // 30 days TTL (Hard filter window)
    );

    return {
      recorded: true,
      category,
      watchFactor: watchDurationFactor,
    };
  }

  /**
   * Get interest profile for user from Redis
   */
  async getUserProfile(userId: string): Promise<UserInterestProfile> {
    const raw = await this.redisService.get(`watchtogether:profile:${userId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            categories: parsed.categories || {},
            channels: parsed.channels || {},
            keywords: parsed.keywords || {},
            lastUpdated: parsed.lastUpdated || Date.now(),
          };
        }
      } catch {
        // ignore
      }
    }
    return {
      categories: {},
      channels: {},
      keywords: {},
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get 30-day watch history for user
   */
  async getUserWatchHistory(userId: string): Promise<UserWatchHistoryItem[]> {
    const raw = await this.redisService.get(`watchtogether:history:${userId}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore
      }
    }
    return [];
  }

  /**
   * Fetch category candidate videos
   */
  async getCategoryVideos(category: string): Promise<WatchTogetherVideoItem[]> {
    const cleanCat = category.toLowerCase().trim();
    const queryMap: Record<string, string> = {
      gaming: 'gaming gameplay walkthrough trailer',
      music: 'official music video song lofi',
      tech: 'technology science computer programming',
      cinema: 'movie trailer teaser cinema official',
      relax: 'lofi chill beats retro relax',
      entertainment: 'popular entertainment video show',
    };

    const query = queryMap[cleanCat] || cleanCat;
    const cacheKey = `watchtogether:cat_feed:${cleanCat}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // continue
      }
    }

    const { items } = await this.search(query);
    const result = items.length > 0 ? items : POPULAR_CURATED_VIDEOS;
    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  /**
   * Generates ranked recommendation rails:
   * - Hard Filter: Excludes videos watched within the last 30 days
   * - 70 / 30 Exploitation / Exploration balance
   * - Rails breakdown:
   *   1. «Рекомендовано вам» (70/30 ranked mix)
   *   2. «Продолжить просмотр» / «Недавнее в звонках» (watch history with progress)
   *   3. «Популярное в категории: [Топ-категория]»
   *   4. «Новое от каналов, которые вы смотрели»
   *   5. «В тренде прямо сейчас»
   */
  async getRecommendedRails(userId: string): Promise<WatchTogetherRailsResponse> {
    const [profile, history, trending] = await Promise.all([
      this.getUserProfile(userId),
      this.getUserWatchHistory(userId),
      this.getTrending(),
    ]);

    // Hard filter: set of video IDs watched in the last 30 days
    const historyVideoIds = new Set(history.map((h) => h.id));

    // Sort categories, channels, keywords by weight
    const sortedCats = Object.entries(profile.categories).sort((a, b) => b[1] - a[1]);
    const sortedChannels = Object.entries(profile.channels).sort((a, b) => b[1] - a[1]);
    const sortedKeywords = Object.entries(profile.keywords).sort((a, b) => b[1] - a[1]);

    const topCategoryKey = sortedCats[0]?.[0] || null;
    const topChannel = sortedChannels[0]?.[0] || null;
    const topKeyword = sortedKeywords[0]?.[0] || null;

    const hasHistory = history.length > 0;

    // 1. Exploitation Candidates (70%): based on user's top categories, channels, and keywords
    const exploitationPool: WatchTogetherVideoItem[] = [];
    if (topCategoryKey) {
      const catVids = await this.getCategoryVideos(topCategoryKey);
      exploitationPool.push(...catVids);
    }
    if (topChannel) {
      const { items: channelVids } = await this.search(topChannel);
      exploitationPool.push(...channelVids);
    }
    if (topKeyword) {
      const { items: kwVids } = await this.search(topKeyword);
      exploitationPool.push(...kwVids);
    }

    // Hard-filter: remove any watched videos and deduplicate
    const cleanExploitation: WatchTogetherVideoItem[] = [];
    const expSeen = new Set<string>();
    for (const v of exploitationPool) {
      if (!expSeen.has(v.id) && !historyVideoIds.has(v.id)) {
        expSeen.add(v.id);
        cleanExploitation.push(v);
      }
    }

    // 2. Exploration Candidates (30%): fresh trending + complementary categories
    const explorationPool: WatchTogetherVideoItem[] = [];
    for (const v of trending) {
      if (!expSeen.has(v.id) && !historyVideoIds.has(v.id)) {
        explorationPool.push(v);
      }
    }

    const secondaryCat = sortedCats[1]?.[0] || (topCategoryKey === 'gaming' ? 'music' : 'gaming');
    const secondaryVids = await this.getCategoryVideos(secondaryCat);
    for (const v of secondaryVids) {
      if (!expSeen.has(v.id) && !historyVideoIds.has(v.id)) {
        explorationPool.push(v);
      }
    }

    // 3. Interleave for Rail 1 ("Для вас"): 70% Exploitation + 30% Exploration
    const forYouItems: WatchTogetherVideoItem[] = [];
    const forYouSeen = new Set<string>();
    let expIdx = 0;
    let explIdx = 0;

    while (
      (expIdx < cleanExploitation.length || explIdx < explorationPool.length) &&
      forYouItems.length < 24
    ) {
      // 70% exploitation: take up to 2 items
      for (let i = 0; i < 2 && expIdx < cleanExploitation.length; i++) {
        const item = cleanExploitation[expIdx++];
        if (item && !forYouSeen.has(item.id)) {
          forYouSeen.add(item.id);
          forYouItems.push(item);
        }
      }
      // 30% exploration: take 1 item
      if (explIdx < explorationPool.length) {
        const item = explorationPool[explIdx++];
        if (item && !forYouSeen.has(item.id)) {
          forYouSeen.add(item.id);
          forYouItems.push(item);
        }
      }
    }

    const finalForYou = forYouItems.length > 0 ? forYouItems : trending.slice(0, 16);

    const rails: WatchTogetherRail[] = [];

    // Rail 1: Recommended For You
    rails.push({
      id: 'for-you',
      title: 'Рекомендовано вам',
      subtitle: hasHistory
        ? '70% любимое + 30% новое на основе ваших просмотров'
        : 'Популярное и интересное для знакомства с платформой',
      icon: 'Sparkles',
      items: finalForYou,
    });

    // Rail 2: Continue Watching / Recent in calls (only if user has history)
    if (history.length > 0) {
      rails.push({
        id: 'continue',
        title: 'Продолжить просмотр',
        subtitle: 'Недавно просмотренные видео с прогрессом',
        icon: 'Clock',
        items: history.slice(0, 12).map((h) => ({
          ...h,
          progress: h.progress,
        })),
      });
    }

    // Rail 3: Top Category Deep Dive
    const categoryLabels: Record<string, string> = {
      gaming: 'Игры и киберспорт',
      music: 'Музыка и треки',
      tech: 'Технологии и наука',
      cinema: 'Кино и трейлеры',
      relax: 'Релакс и lofi',
      entertainment: 'Развлечения',
    };

    if (topCategoryKey && cleanExploitation.length > 0) {
      rails.push({
        id: `category-${topCategoryKey}`,
        title: `Популярное: ${categoryLabels[topCategoryKey] || topCategoryKey}`,
        subtitle: 'Рекомендовано на основе ваших любимых жанров',
        category: topCategoryKey,
        icon:
          topCategoryKey === 'gaming'
            ? 'Gamepad2'
            : topCategoryKey === 'music'
              ? 'Music2'
              : 'Compass',
        items: cleanExploitation.slice(0, 16),
      });
    }

    // Rail 4: New from channels you watched
    if (topChannel) {
      const channelItems = cleanExploitation.filter((v) =>
        v.channelTitle.toLowerCase().includes(topChannel.toLowerCase()),
      );
      if (channelItems.length > 0) {
        rails.push({
          id: 'channels',
          title: `Новое от: ${topChannel}`,
          subtitle: 'Свежие видео авторов, которых вы выбирали',
          icon: 'Tv',
          items: channelItems.slice(0, 14),
        });
      }
    }

    // Rail 5: Trending Now (Filtered by hard filter)
    const filteredTrending = trending.filter((v) => !historyVideoIds.has(v.id));
    rails.push({
      id: 'trending',
      title: 'В тренде прямо сейчас',
      subtitle: 'Самые популярные видео в сообществе',
      icon: 'Flame',
      items: filteredTrending.length > 0 ? filteredTrending.slice(0, 16) : trending.slice(0, 16),
    });

    // If cold start, also append category rails so discovery is immediate & rich
    if (!hasHistory) {
      const [musicVids, gamingVids] = await Promise.all([
        this.getCategoryVideos('music'),
        this.getCategoryVideos('gaming'),
      ]);
      rails.push({
        id: 'category-music',
        title: 'Музыка и клипы',
        subtitle: 'Хиты, клипы и живые выступления',
        icon: 'Music2',
        category: 'music',
        items: musicVids.slice(0, 14),
      });
      rails.push({
        id: 'category-gaming',
        title: 'Игры и стримы',
        subtitle: 'Геймплеи, анонсы и популярные игры',
        icon: 'Gamepad2',
        category: 'gaming',
        items: gamingVids.slice(0, 14),
      });
    }

    return {
      rails,
      topCategory: topCategoryKey || undefined,
      hasHistory,
    };
  }
}
