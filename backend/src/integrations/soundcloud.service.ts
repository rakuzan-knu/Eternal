import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface SoundCloudTrackDto {
  id: string;
  trackId: string;
  rawId: string;
  title: string;
  artist: string;
  albumArt: string;
  durationMs: number;
  previewUrl: string | null;
  spotifyUrl: string;
  source: 'soundcloud';
  streamUrl: string;
  artistAvatar?: string;
}

export interface SoundCloudStreamResult {
  streamUrl: string;
  isHls: boolean;
  mimeType: string;
}

export interface SoundCloudPlaylistDto {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  creator: string;
  creatorUsername: string;
  creatorAvatar?: string;
  trackCount: number;
  tracks: SoundCloudTrackDto[];
  externalUrl: string;
  source: 'soundcloud';
}

@Injectable()
export class SoundCloudService {
  private readonly logger = new Logger(SoundCloudService.name);
  private cachedClientId: string | null = null;
  private clientIdExpiresAt: number = 0;
  // Known working fallback guest client ID
  private readonly FALLBACK_CLIENT_ID = 'Pb72ranhoyt6gw7hM7TkzUItXlMWSNSo';
  private readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  constructor(private readonly redis: RedisService) {}

  /**
   * Dynamically retrieves guest client_id from soundcloud.com public web assets
   */
  async getClientId(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cachedClientId && this.clientIdExpiresAt > now) {
      return this.cachedClientId;
    }

    if (!forceRefresh) {
      try {
        const fromRedis = await this.redis.get('soundcloud:client_id');
        if (fromRedis) {
          this.cachedClientId = fromRedis;
          this.clientIdExpiresAt = now + 1000 * 60 * 60; // 1 hour memory buffer
          return fromRedis;
        }
      } catch (err) {
        this.logger.warn(`Redis client_id read error: ${(err as Error).message}`);
      }
    }

    try {
      this.logger.log('Scraping dynamic guest client_id from soundcloud.com...');
      const homeRes = await fetch('https://soundcloud.com', {
        headers: { 'User-Agent': this.USER_AGENT },
      });

      if (homeRes.ok) {
        const html = await homeRes.text();
        const scriptUrls: string[] = [];
        const scriptRegex = /<script[^>]+src="([^">]+)"/g;
        let match: RegExpExecArray | null;
        while ((match = scriptRegex.exec(html)) !== null) {
          if (match[1].includes('.js')) {
            scriptUrls.push(match[1]);
          }
        }

        // Search the most recent app bundle scripts
        for (const scriptUrl of scriptUrls.slice(-6)) {
          try {
            const scriptRes = await fetch(scriptUrl, {
              headers: { 'User-Agent': this.USER_AGENT },
            });
            if (scriptRes.ok) {
              const text = await scriptRes.text();
              const cidMatch = text.match(/client_id[:=]\s*["']([a-zA-Z0-9]{32})["']/);
              if (cidMatch && cidMatch[1]) {
                const scrapedId = cidMatch[1];
                this.cachedClientId = scrapedId;
                this.clientIdExpiresAt = now + 1000 * 60 * 60 * 2; // 2 hours

                try {
                  await this.redis.set('soundcloud:client_id', scrapedId, 7200);
                } catch {}

                this.logger.log(
                  `Successfully scraped SoundCloud client_id: ${scrapedId.slice(0, 8)}...`,
                );
                return scrapedId;
              }
            }
          } catch {
            // continue checking next script
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed scraping client_id: ${(err as Error).message}. Using fallback.`);
    }

    // Fallback if scraping is blocked or fails
    this.cachedClientId = this.FALLBACK_CLIENT_ID;
    this.clientIdExpiresAt = now + 1000 * 60 * 30;
    return this.FALLBACK_CLIENT_ID;
  }

  /**
   * Search SoundCloud catalog for tracks via internal API v2 (supports limit up to 50 & offset)
   */
  async searchTracks(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<SoundCloudTrackDto[]> {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    let clientId = await this.getClientId();
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);
    const buildUrl = (cid: string) =>
      `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(
        cleanQuery,
      )}&client_id=${cid}&limit=${safeLimit}&offset=${safeOffset}`;

    try {
      let res = await fetch(buildUrl(clientId), {
        headers: { 'User-Agent': this.USER_AGENT },
      });

      if (res.status === 401) {
        // Invalidate and retry with a fresh client ID
        clientId = await this.getClientId(true);
        res = await fetch(buildUrl(clientId), {
          headers: { 'User-Agent': this.USER_AGENT },
        });
      }

      if (!res.ok) {
        this.logger.warn(`SoundCloud search returned HTTP ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (!Array.isArray(data.collection)) return [];

      return data.collection
        .filter((item: any) => item && item.id && item.title)
        .map((item: any) => this.mapSoundCloudTrack(item));
    } catch (err) {
      this.logger.error(`SoundCloud track search error: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Search SoundCloud catalog for public playlists via internal API v2
   */
  async searchPlaylists(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<SoundCloudPlaylistDto[]> {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    let clientId = await this.getClientId();
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safeOffset = Math.max(offset, 0);
    const buildUrl = (cid: string) =>
      `https://api-v2.soundcloud.com/search/playlists?q=${encodeURIComponent(
        cleanQuery,
      )}&client_id=${cid}&limit=${safeLimit}&offset=${safeOffset}`;

    try {
      let res = await fetch(buildUrl(clientId), {
        headers: { 'User-Agent': this.USER_AGENT },
      });

      if (res.status === 401) {
        clientId = await this.getClientId(true);
        res = await fetch(buildUrl(clientId), {
          headers: { 'User-Agent': this.USER_AGENT },
        });
      }

      if (!res.ok) {
        this.logger.warn(`SoundCloud playlist search returned HTTP ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (!Array.isArray(data.collection)) return [];

      return data.collection
        .filter((item: any) => item && item.id && item.title)
        .map((item: any) => {
          const rawArtwork = item.artwork_url || item.user?.avatar_url || '';
          const coverUrl = rawArtwork
            ? rawArtwork.replace('-large.', '-t500x500.')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';

          const creatorAvatar = item.user?.avatar_url
            ? item.user.avatar_url.replace('-large.', '-t500x500.')
            : undefined;

          const creator = item.user?.username || item.user?.full_name || 'SoundCloud Creator';
          const creatorUsername = item.user?.permalink || item.user?.username || creator;

          const tracks: SoundCloudTrackDto[] = Array.isArray(item.tracks)
            ? item.tracks
                .filter((t: any) => t && t.id && t.title)
                .map((t: any) => this.mapSoundCloudTrack(t))
            : [];

          return {
            id: `sc-pl-${item.id}`,
            title: item.title,
            description: item.description || '',
            coverUrl,
            creator,
            creatorUsername,
            creatorAvatar,
            trackCount: item.track_count || tracks.length || 0,
            tracks,
            externalUrl: item.permalink_url || 'https://soundcloud.com',
            source: 'soundcloud' as const,
          };
        });
    } catch (err) {
      this.logger.error(`SoundCloud playlist search error: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Resolves direct playable audio stream URL (Progressive MP3 or HLS .m3u8)
   */
  async getStreamUrl(
    rawTrackIdOrScId: string,
    bypassCache = false,
  ): Promise<SoundCloudStreamResult | null> {
    const cleanId = rawTrackIdOrScId
      .replace(/^sc-/, '')
      .replace(/^soundcloud-/, '')
      .trim();
    if (!cleanId || !/^\d+$/.test(cleanId)) {
      this.logger.warn(`Invalid SoundCloud raw trackId: ${rawTrackIdOrScId}`);
      return null;
    }

    const cacheKey = `soundcloud:stream:${cleanId}`;
    if (!bypassCache) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {}
    }

    let clientId = await this.getClientId();
    try {
      let trackRes = await fetch(
        `https://api-v2.soundcloud.com/tracks/${cleanId}?client_id=${clientId}`,
        { headers: { 'User-Agent': this.USER_AGENT } },
      );

      if (trackRes.status === 401) {
        clientId = await this.getClientId(true);
        trackRes = await fetch(
          `https://api-v2.soundcloud.com/tracks/${cleanId}?client_id=${clientId}`,
          { headers: { 'User-Agent': this.USER_AGENT } },
        );
      }

      if (!trackRes.ok) {
        this.logger.warn(`SoundCloud track metadata fetch error: ${trackRes.status}`);
        return null;
      }

      const track = await trackRes.json();
      const transcodings: any[] = track.media?.transcodings || [];

      // 1. Prefer progressive MP3
      const progressive = transcodings.find((t) => t.format?.protocol === 'progressive');
      // 2. Fallback to HLS (.m3u8)
      const hls = transcodings.find((t) => t.format?.protocol === 'hls');

      const selected = progressive || hls;
      if (!selected || !selected.url) {
        this.logger.warn(`No playable media transcodings for track ${cleanId}`);
        return null;
      }

      const streamUrlRes = await fetch(`${selected.url}?client_id=${clientId}`, {
        headers: { 'User-Agent': this.USER_AGENT },
      });

      if (!streamUrlRes.ok) {
        this.logger.warn(`SoundCloud stream URL fetch error: ${streamUrlRes.status}`);
        return null;
      }

      const streamData = await streamUrlRes.json();
      if (!streamData?.url) {
        return null;
      }

      const isHls = selected.format?.protocol === 'hls' || streamData.url.includes('.m3u8');
      const result: SoundCloudStreamResult = {
        streamUrl: streamData.url,
        isHls,
        mimeType: isHls ? 'application/x-mpegURL' : 'audio/mpeg',
      };

      // Cache for 10 minutes (SoundCloud tokens expire in ~15-20 min)
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 600);
      } catch {}

      return result;
    } catch (err) {
      this.logger.error(`Error resolving SoundCloud stream URL: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Fetches single track metadata with high-res artwork and author avatar
   */
  async getTrack(rawTrackIdOrScId: string): Promise<SoundCloudTrackDto | null> {
    const cleanId = rawTrackIdOrScId
      .replace(/^sc-/, '')
      .replace(/^soundcloud-/, '')
      .trim();
    if (!cleanId || !/^\d+$/.test(cleanId)) return null;

    let clientId = await this.getClientId();
    try {
      let res = await fetch(
        `https://api-v2.soundcloud.com/tracks/${cleanId}?client_id=${clientId}`,
        {
          headers: { 'User-Agent': this.USER_AGENT },
        },
      );

      if (res.status === 401) {
        clientId = await this.getClientId(true);
        res = await fetch(`https://api-v2.soundcloud.com/tracks/${cleanId}?client_id=${clientId}`, {
          headers: { 'User-Agent': this.USER_AGENT },
        });
      }

      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.id || !data.title) return null;

      return this.mapSoundCloudTrack(data);
    } catch (err) {
      this.logger.error(`Error fetching SoundCloud track ${cleanId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Fetches full SoundCloud playlist details and mapped tracks
   */
  async getPlaylist(rawPlaylistId: string): Promise<{
    id: string;
    title: string;
    description: string;
    coverUrl: string;
    creator: string;
    creatorUsername: string;
    creatorAvatar?: string;
    trackCount: number;
    tracks: SoundCloudTrackDto[];
  } | null> {
    const cleanId = rawPlaylistId
      .replace(/^sc-/, '')
      .replace(/^playlist-/, '')
      .replace(/^pl-/, '')
      .trim();
    if (!cleanId || !/^\d+$/.test(cleanId)) return null;

    let clientId = await this.getClientId();
    try {
      let res = await fetch(
        `https://api-v2.soundcloud.com/playlists/${cleanId}?client_id=${clientId}`,
        {
          headers: { 'User-Agent': this.USER_AGENT },
        },
      );

      if (res.status === 401) {
        clientId = await this.getClientId(true);
        res = await fetch(
          `https://api-v2.soundcloud.com/playlists/${cleanId}?client_id=${clientId}`,
          {
            headers: { 'User-Agent': this.USER_AGENT },
          },
        );
      }

      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.id || !data.title) return null;

      const rawArtwork = data.artwork_url || data.user?.avatar_url || '';
      const coverUrl = rawArtwork
        ? rawArtwork.replace('-large.', '-t500x500.')
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';

      const creatorAvatar = data.user?.avatar_url
        ? data.user.avatar_url.replace('-large.', '-t500x500.')
        : undefined;

      const creator = data.user?.username || data.user?.full_name || 'SoundCloud Creator';
      const creatorUsername = data.user?.permalink || data.user?.username || creator;

      // Extract already full track objects and stub IDs (SoundCloud returns full objects for first 5 tracks and only IDs for the rest)
      const fullTracks: any[] = [];
      const stubIds: number[] = [];
      if (Array.isArray(data.tracks)) {
        for (const t of data.tracks) {
          if (t && t.id) {
            if (t.title) {
              fullTracks.push(t);
            } else {
              stubIds.push(t.id);
            }
          }
        }
      }

      // Fetch remaining track details in parallel batches of 50
      if (stubIds.length > 0) {
        const CHUNK_SIZE = 50;
        const chunks: number[][] = [];
        const targetIds = stubIds.slice(0, 500); // Support up to 500 tracks per playlist
        for (let i = 0; i < targetIds.length; i += CHUNK_SIZE) {
          chunks.push(targetIds.slice(i, i + CHUNK_SIZE));
        }

        const chunkResults = await Promise.all(
          chunks.map(async (chunk) => {
            try {
              const idsParam = chunk.join('%2C');
              let r = await fetch(
                `https://api-v2.soundcloud.com/tracks?ids=${idsParam}&client_id=${clientId}`,
                {
                  headers: { 'User-Agent': this.USER_AGENT },
                },
              );
              if (r.status === 401) {
                clientId = await this.getClientId(true);
                r = await fetch(
                  `https://api-v2.soundcloud.com/tracks?ids=${idsParam}&client_id=${clientId}`,
                  {
                    headers: { 'User-Agent': this.USER_AGENT },
                  },
                );
              }
              if (!r.ok) return [];
              const json = await r.json();
              return Array.isArray(json) ? json : [];
            } catch (err) {
              this.logger.warn(
                `Failed to fetch SoundCloud playlist track chunk: ${(err as Error).message}`,
              );
              return [];
            }
          }),
        );

        for (const chunk of chunkResults) {
          fullTracks.push(...chunk);
        }
      }

      // Preserve exact original playlist track ordering
      const trackMap = new Map<string | number, any>();
      for (const t of fullTracks) {
        if (t && t.id) {
          trackMap.set(t.id, t);
        }
      }

      const tracks: SoundCloudTrackDto[] = Array.isArray(data.tracks)
        ? data.tracks
            .map((t: any) => (t && t.id ? trackMap.get(t.id) : null))
            .filter((t: any) => t && t.id && t.title)
            .map((t: any) => this.mapSoundCloudTrack(t))
        : [];

      return {
        id: `sc-pl-${data.id}`,
        title: data.title,
        description: data.description || '',
        coverUrl,
        creator,
        creatorUsername,
        creatorAvatar,
        trackCount: data.track_count || tracks.length,
        tracks,
      };
    } catch (err) {
      this.logger.error(`Error fetching SoundCloud playlist ${cleanId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Retrieves related / recommended tracks directly from SoundCloud's algorithm for Autoplay
   */
  async getRelatedTracks(
    rawTrackIdOrScId: string,
    excludeIds: string[] = [],
    limit: number = 10,
  ): Promise<SoundCloudTrackDto[]> {
    const cleanId = rawTrackIdOrScId
      .replace(/^sc-/, '')
      .replace(/^soundcloud-/, '')
      .trim();
    if (!cleanId || !/^\d+$/.test(cleanId)) return [];

    let clientId = await this.getClientId();
    const url = `https://api-v2.soundcloud.com/tracks/${cleanId}/related?client_id=${clientId}&limit=${Math.min(
      limit * 2,
      25,
    )}`;

    try {
      let res = await fetch(url, { headers: { 'User-Agent': this.USER_AGENT } });

      if (res.status === 401) {
        clientId = await this.getClientId(true);
        res = await fetch(
          `https://api-v2.soundcloud.com/tracks/${cleanId}/related?client_id=${clientId}&limit=${Math.min(
            limit * 2,
            25,
          )}`,
          { headers: { 'User-Agent': this.USER_AGENT } },
        );
      }

      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data.collection)) return [];

      const normalizedExcludes = new Set(
        [cleanId, ...excludeIds].flatMap((id) => {
          const raw = id
            .replace(/^sc-/, '')
            .replace(/^soundcloud-/, '')
            .trim();
          return [id, raw, `sc-${raw}`, `soundcloud-${raw}`];
        }),
      );

      const seenIds = new Set<string>();
      const artistCounts = new Map<string, number>();
      const mapped: SoundCloudTrackDto[] = [];
      for (const item of data.collection) {
        if (!item || !item.id || !item.title) continue;
        const strId = item.id.toString();
        if (
          normalizedExcludes.has(strId) ||
          normalizedExcludes.has(`sc-${strId}`) ||
          seenIds.has(strId)
        ) {
          continue;
        }

        // Limit tracks from the same creator to max 2 in a batch to avoid artist duplication spam
        const artist = (item.user?.username || item.user?.full_name || '').toLowerCase().trim();
        if (artist && data.collection.length > 5) {
          const count = artistCounts.get(artist) || 0;
          if (count >= 2) continue;
          artistCounts.set(artist, count + 1);
        }

        seenIds.add(strId);
        mapped.push(this.mapSoundCloudTrack(item));
        if (mapped.length >= limit) break;
      }

      return mapped;
    } catch (err) {
      this.logger.warn(`Error fetching related tracks for ${cleanId}: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Maps raw SoundCloud track object to standard application format
   */
  private mapSoundCloudTrack(item: any): SoundCloudTrackDto {
    const rawArtwork = item.artwork_url || item.user?.avatar_url || '';
    const highResArtwork = rawArtwork
      ? rawArtwork.replace('-large.', '-t500x500.')
      : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4';

    const artistAvatar = item.user?.avatar_url
      ? item.user.avatar_url.replace('-large.', '-t500x500.')
      : undefined;

    const artistName = item.user?.username || item.user?.full_name || 'SoundCloud Artist';

    return {
      id: `sc-${item.id}`,
      trackId: `sc-${item.id}`,
      rawId: item.id.toString(),
      title: item.title,
      artist: artistName,
      albumArt: highResArtwork,
      durationMs: item.duration || 180000,
      previewUrl: null,
      spotifyUrl: item.permalink_url || `https://soundcloud.com`,
      source: 'soundcloud',
      streamUrl: `/api/integrations/soundcloud/stream/${item.id}`,
      artistAvatar,
    };
  }
}
