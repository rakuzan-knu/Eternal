import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import type { Response } from 'express';
import crypto from 'crypto';

export interface SpotifyTrackDto {
  id: string;
  title: string;
  artist: string;
  albumArt: string | null;
  durationMs: number;
  previewUrl: string | null;
  spotifyUrl: string;
  source?: 'spotify' | 'soundcloud';
  streamUrl?: string;
  album?: string;
}

export interface SpotifyPlaylistDto {
  id: string;
  name: string;
  coverUrl: string | null;
  tracksCount: number;
  externalUrl: string;
}

export interface SpotifyLiveActivity {
  type: 'spotify';
  title: string;
  subtitle: string;
  artist: string;
  imageUrl: string | null;
  externalUrl: string;
  trackId: string;
  progressMs: number;
  durationMs: number;
  startedAt: string;
  updatedAt: number;
  isPaused?: boolean;
  pausedAt?: number;
}

export interface SpotifyConnectedAccount {
  verified?: boolean;
  authenticatedAt?: string;
  id?: string;
  username?: string;
  avatarUrl?: string | null;
  spotifyUrl?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: number | null;
  likedSongs?: SpotifyTrackDto[];
  likedSongsCount?: number;
  playlists?: SpotifyPlaylistDto[];
  topTracks?: SpotifyTrackDto[];
  displayOnProfile?: boolean;
  displayMode?: string;
  favoriteTracks?: string[];
  favoritePlaylists?: string[];
  currentActivity?: SpotifyLiveActivity;
}

export interface SpotifyItemArtist {
  name?: string;
}

export interface SpotifyTrackResponseItem {
  id?: string;
  name?: string;
  artists?: SpotifyItemArtist[];
  album?: { images?: Array<{ url?: string }> };
  duration_ms?: number;
  preview_url?: string | null;
  external_urls?: { spotify?: string };
}

export interface SpotifyPlaylistResponseItem {
  id?: string;
  name?: string;
  images?: Array<{ url?: string }>;
  tracks?: { total?: number };
  external_urls?: { spotify?: string };
}

export interface SpotifyCurrentlyPlayingResponse {
  item?: SpotifyTrackResponseItem | null;
  currently_playing_type?: string;
  is_playing?: boolean;
  progress_ms?: number;
}

export interface SpotifyLikedTracksResponse {
  total?: number;
  items?: Array<{ track?: SpotifyTrackResponseItem }>;
}

export interface SpotifyPlaylistsResponse {
  total?: number;
  items?: SpotifyPlaylistResponseItem[];
}

export interface SpotifySearchTracksResponse {
  tracks?: {
    items?: SpotifyTrackResponseItem[];
  };
}

export interface SpotifyMeResponse {
  id?: string;
  display_name?: string;
  images?: Array<{ url?: string }>;
  external_urls?: { spotify?: string };
}

export interface LrclibLyricsResponse {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

export interface LyricsOvhResponse {
  lyrics?: string;
}

export interface SpotifyTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface SpotifyPlaylistExtendedDto {
  id: string;
  rawId: string;
  title: string;
  description: string;
  coverUrl: string;
  creator: string;
  creatorUsername: string;
  trackCount: number;
  tracks: SpotifyTrackDto[];
  externalUrl: string;
  source: 'spotify';
}

export interface SpotifySearchPlaylistsResponse {
  playlists?: {
    items?: Array<{
      id?: string;
      name?: string;
      description?: string;
      images?: Array<{ url?: string }>;
      owner?: { id?: string; display_name?: string };
      tracks?: { total?: number };
      items?: { total?: number };
      external_urls?: { spotify?: string };
    }>;
  };
}

export interface SpotifyPlaylistDetailsResponse {
  name?: string;
  description?: string;
  images?: Array<{ url?: string }>;
  owner?: { display_name?: string; id?: string };
  tracks?: { total?: number };
  items?: { total?: number };
  external_urls?: { spotify?: string };
}

export interface SpotifyNextDataTrack {
  uri?: string;
  id?: string;
  title?: string;
  name?: string;
  subtitle?: string;
  artists?: Array<{ name?: string }>;
  duration?: number;
  audioPreview?: { url?: string };
}

export interface SpotifyNextDataEntity {
  name?: string;
  title?: string;
  description?: string;
  visualIdentity?: { image?: Array<{ url?: string }> };
  coverArt?: { sources?: Array<{ url?: string }> };
  images?: Array<{ url?: string }>;
  subtitle?: string;
  authors?: Array<{ name?: string }>;
  trackList?: SpotifyNextDataTrack[];
}

const SPOTIFY_HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

export function cleanSpotifyText(text: string): string {
  if (!text) return '';
  return text.replace(
    /&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi,
    (match) => SPOTIFY_HTML_ENTITIES[match.toLowerCase()] || match,
  );
}

import { SoundCloudService } from './soundcloud.service';

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);

  // In-memory cache for App Token (Client Credentials) used in track search
  private cachedAppToken: string | null = null;
  private cachedAppTokenExpiresAt: number = 0;

  // In-memory cache for track lyrics to make playback and UI transitions instantaneous
  private lyricsCache = new Map<
    string,
    { synced: boolean; lines: { timeMs: number; text: string }[]; timestamp: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly soundCloudService: SoundCloudService,
  ) {}

  private getClientId(): string {
    return process.env.SPOTIFY_CLIENT_ID || 'b3627072f2ec49d48d1ad97f901b24c3';
  }

  private getClientSecret(): string {
    return process.env.SPOTIFY_CLIENT_SECRET || 'f5b8151538af4b87b3e405351c01a129';
  }

  private getCallbackUrl(): string {
    return process.env.SPOTIFY_CALLBACK_URL || 'http://127.0.0.1:3000/api/auth/spotify/callback';
  }

  private getBasicAuthHeader(): string {
    const creds = `${this.getClientId()}:${this.getClientSecret()}`;
    return `Basic ${Buffer.from(creds).toString('base64')}`;
  }

  /**
   * Generates official Spotify OAuth Authorization URL with state (csrf:userId)
   */
  getAuthorizationUrl(userId: string): string {
    const clientId = this.getClientId();
    const callbackUrl = this.getCallbackUrl();
    const csrf = crypto.randomBytes(16).toString('hex');
    const state = `${csrf}:${userId}`;

    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-library-modify',
      'playlist-read-private',
      'playlist-read-collaborative',
      'user-read-playback-state',
      'user-modify-playback-state',
      'streaming',
      'user-read-currently-playing',
      'user-top-read',
    ].join(' ');

    const url = new URL('https://accounts.spotify.com/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('state', state);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('show_dialog', 'true');

    return url.toString();
  }

  /**
   * Exchanges authorization code for Spotify Access & Refresh Tokens
   */
  async exchangeCode(
    code: string,
    redirectUriOverride?: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const redirectUri = redirectUriOverride || this.getCallbackUrl();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: this.getBasicAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`Spotify code exchange failed (${res.status}): ${errText}`);
      throw new BadRequestException(`Spotify code exchange failed: ${errText}`);
    }

    return (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
  }

  /**
   * Proactively refreshes a user's Spotify Access Token before calling Spotify Web API
   */
  async refreshUserAccessToken(userId: string, refreshToken: string): Promise<string | null> {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Failed to refresh Spotify token for user ${userId}: ${errText}`);
        return null;
      }

      const data = (await res.json()) as SpotifyTokenResponse;
      const newAccessToken = typeof data.access_token === 'string' ? data.access_token : null;
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      const newRefreshToken =
        typeof data.refresh_token === 'string' ? data.refresh_token : refreshToken;

      // Update in database
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId },
      });

      if (showcase) {
        const connected = (showcase.connectedAccounts as Record<string, unknown> | null) || {};
        if (connected.spotify) {
          const spotify = connected.spotify as SpotifyConnectedAccount;
          connected.spotify = {
            ...spotify,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenExpiresAt: Date.now() + expiresIn * 1000,
          };

          await this.prisma.profileShowcase.update({
            where: { userId },
            data: { connectedAccounts: connected as Prisma.InputJsonValue },
          });
          await this.redis.del(`showcase:user:${userId}`);
        }
      }

      return newAccessToken;
    } catch (err) {
      this.logger.error(`Error refreshing Spotify token: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Retrieves a valid user access token, refreshing it proactively if within 60 seconds of expiration
   */
  async getValidUserToken(
    userId: string,
    spotifyAccount: SpotifyConnectedAccount | Record<string, unknown>,
  ): Promise<string | null> {
    const accessToken =
      typeof spotifyAccount.accessToken === 'string' ? spotifyAccount.accessToken : null;
    const refreshToken =
      typeof spotifyAccount.refreshToken === 'string' ? spotifyAccount.refreshToken : null;
    const tokenExpiresAt =
      typeof spotifyAccount.tokenExpiresAt === 'number' ? spotifyAccount.tokenExpiresAt : null;
    if (!accessToken) return null;

    if (!tokenExpiresAt || tokenExpiresAt <= Date.now() + 60000) {
      if (!refreshToken) return null;
      return this.refreshUserAccessToken(userId, refreshToken);
    }

    return accessToken;
  }

  /**
   * Obtains or returns cached App Token (Client Credentials) for searching tracks
   * Caches for ~55 minutes in memory to prevent rate-limiting
   */
  async getAppToken(): Promise<string> {
    if (this.cachedAppToken && this.cachedAppTokenExpiresAt > Date.now() + 120000) {
      return this.cachedAppToken;
    }

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch app token (${res.status}): ${await res.text()}`);
      }

      const data = (await res.json()) as SpotifyTokenResponse;
      this.cachedAppToken = typeof data.access_token === 'string' ? data.access_token : '';
      const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
      this.cachedAppTokenExpiresAt = Date.now() + expiresIn * 1000 - 300000; // 55 mins
      return this.cachedAppToken;
    } catch (err) {
      this.logger.error(`Error acquiring Spotify App Token: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Searches Spotify catalog for tracks with artist, title, albumArt, and direct track link.
   * Handles Spotify's max 10-item limit per request with parallel offset batching.
   */
  async searchTracks(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<SpotifyTrackDto[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      const token = await this.getAppToken();
      const safeLimit = Math.min(Math.max(limit, 1), 50);
      const startOffset = Math.max(offset, 0);

      // Generate batch chunk offsets (Spotify client credentials enforces limit <= 10)
      const chunkOffsets: number[] = [];
      for (let o = startOffset; o < startOffset + safeLimit; o += 10) {
        chunkOffsets.push(o);
      }

      const requests = chunkOffsets.map(async (off) => {
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQuery)}&type=track&limit=10&offset=${off}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          this.logger.warn(`Spotify search tracks chunk error (offset=${off}): ${res.status}`);
          return [];
        }
        const data = (await res.json()) as SpotifySearchTracksResponse;
        return Array.isArray(data.tracks?.items) ? data.tracks.items : [];
      });

      const chunkResults = await Promise.all(requests);
      const allItems = chunkResults.flat();

      const seenIds = new Set<string>();
      const mapped: SpotifyTrackDto[] = [];

      for (const t of allItems) {
        if (!t || !t.id || !t.name || seenIds.has(t.id)) continue;
        seenIds.add(t.id);
        mapped.push({
          id: t.id,
          title: cleanSpotifyText(t.name),
          artist: cleanSpotifyText(
            t.artists
              ?.map((a) => a.name)
              .filter(Boolean)
              .join(', ') || 'Unknown Artist',
          ),
          albumArt: t.album?.images?.[0]?.url || null,
          durationMs: t.duration_ms || 0,
          previewUrl: t.preview_url || null,
          spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
        });
        if (mapped.length >= safeLimit) break;
      }

      return mapped;
    } catch (err) {
      this.logger.warn(`Spotify catalog search failed: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Searches public Spotify playlists using Spotify Web API with parallel chunk batching
   */
  async searchPlaylists(
    query: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<SpotifyPlaylistExtendedDto[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    try {
      const token = await this.getAppToken();
      const safeLimit = Math.min(Math.max(limit, 1), 50);
      const startOffset = Math.max(offset, 0);

      const chunkOffsets: number[] = [];
      for (let o = startOffset; o < startOffset + safeLimit; o += 10) {
        chunkOffsets.push(o);
      }

      const requests = chunkOffsets.map(async (off) => {
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQuery)}&type=playlist&limit=10&offset=${off}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          this.logger.warn(`Spotify search playlists chunk error (offset=${off}): ${res.status}`);
          return [];
        }
        const data = (await res.json()) as SpotifySearchPlaylistsResponse;
        return Array.isArray(data.playlists?.items) ? data.playlists.items : [];
      });

      const chunkResults = await Promise.all(requests);
      const allItems = chunkResults.flat();

      const seenIds = new Set<string>();
      const mapped: SpotifyPlaylistExtendedDto[] = [];

      for (const p of allItems) {
        if (!p || !p.id || !p.name || seenIds.has(p.id)) continue;
        seenIds.add(p.id);

        const coverUrl = p.images?.[0]?.url || '';
        const creator = p.owner?.display_name || 'Spotify';
        const trackCount = p.tracks?.total ?? p.items?.total ?? 0;

        mapped.push({
          id: `sp-pl-${p.id}`,
          rawId: p.id,
          title: cleanSpotifyText(p.name),
          description: cleanSpotifyText(p.description || ''),
          coverUrl,
          creator,
          creatorUsername: p.owner?.id || 'spotify',
          trackCount,
          tracks: [],
          externalUrl: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
          source: 'spotify',
        });

        if (mapped.length >= safeLimit) break;
      }

      return mapped;
    } catch (err) {
      this.logger.warn(`Spotify playlist search failed: ${(err as Error).message}`);
      return [];
    }
  }

  /**
   * Retrieves full Spotify playlist metadata & playable tracks via embed metadata extraction
   */
  async getPlaylist(rawPlaylistId: string): Promise<SpotifyPlaylistExtendedDto | null> {
    const cleanId = rawPlaylistId
      .replace(/^sp-pl-/, '')
      .replace(/^spotify:playlist:/, '')
      .replace(/^pl-/, '')
      .trim();
    if (!cleanId || !/^[a-zA-Z0-9]{15,40}$/.test(cleanId)) return null;
    const safeId = encodeURIComponent(cleanId);

    try {
      // 1. Fetch public embed HTML to extract full tracklist without user login
      const embedUrl = new URL(`https://open.spotify.com/embed/playlist/${safeId}`);
      if (embedUrl.origin !== 'https://open.spotify.com') return null;

      const res = await fetch(embedUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (res.ok) {
        const html = await res.text();
        const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (match && match[1]) {
          const data = JSON.parse(match[1]) as {
            props?: {
              pageProps?: {
                state?: {
                  data?: {
                    entity?: SpotifyNextDataEntity;
                  };
                };
              };
            };
          };
          const entity = data.props?.pageProps?.state?.data?.entity;
          if (entity) {
            const title = cleanSpotifyText(entity.name || entity.title || 'Spotify Playlist');
            const description = cleanSpotifyText(entity.description || '');
            const coverUrl =
              entity.visualIdentity?.image?.[1]?.url ||
              entity.coverArt?.sources?.[0]?.url ||
              entity.images?.[0]?.url ||
              '';
            const creator = entity.subtitle || entity.authors?.[0]?.name || 'Spotify';

            const rawTracks = Array.isArray(entity.trackList) ? entity.trackList : [];
            const tracks = rawTracks.map((t) => {
              const rawTrackId = t.uri ? t.uri.replace('spotify:track:', '') : t.id || '';
              return {
                id: rawTrackId,
                title: cleanSpotifyText(t.title || t.name || 'Unknown Track'),
                artist: cleanSpotifyText(t.subtitle || t.artists?.[0]?.name || 'Unknown Artist'),
                album: title,
                albumArt: coverUrl,
                durationMs: t.duration || 180000,
                previewUrl: t.audioPreview?.url || null,
                spotifyUrl: `https://open.spotify.com/track/${rawTrackId}`,
                contextName: title,
                source: 'spotify' as const,
              };
            });

            return {
              id: `sp-pl-${cleanId}`,
              rawId: cleanId,
              title,
              description,
              coverUrl,
              creator,
              creatorUsername: creator.toLowerCase().replace(/\s+/g, '_'),
              trackCount: tracks.length,
              tracks,
              externalUrl: `https://open.spotify.com/playlist/${cleanId}`,
              source: 'spotify' as const,
            };
          }
        }
      }

      // 2. Fallback: query Web API metadata
      const token = await this.getAppToken();
      const apiUrl = new URL(`https://api.spotify.com/v1/playlists/${safeId}`);
      if (apiUrl.origin !== 'https://api.spotify.com') return null;

      const metaRes = await fetch(apiUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (metaRes.ok) {
        const data = (await metaRes.json()) as SpotifyPlaylistDetailsResponse;
        return {
          id: `sp-pl-${cleanId}`,
          rawId: cleanId,
          title: cleanSpotifyText(data.name || 'Spotify Playlist'),
          description: cleanSpotifyText(data.description || ''),
          coverUrl: data.images?.[0]?.url || '',
          creator: data.owner?.display_name || 'Spotify',
          creatorUsername: data.owner?.id || 'spotify',
          trackCount: data.tracks?.total || data.items?.total || 0,
          tracks: [],
          externalUrl:
            data.external_urls?.spotify || `https://open.spotify.com/playlist/${cleanId}`,
          source: 'spotify' as const,
        };
      }

      return null;
    } catch (err) {
      this.logger.error(`Error fetching Spotify playlist ${cleanId}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Fetches user's authentic Spotify library (liked songs, playlists, top tracks)
   * Supports pagination for 100+ tracks and playlists, auto-refreshes token, and updates DB.
   */
  async getUserLibrary(userId: string): Promise<{
    likedSongs: SpotifyTrackDto[];
    playlists: SpotifyPlaylistDto[];
    topTracks: SpotifyTrackDto[];
    totalLiked: number;
    totalPlaylists: number;
    user: { id: string; username: string; avatarUrl: string | null; spotifyUrl: string } | null;
  }> {
    const showcase = await this.prisma.profileShowcase.findUnique({
      where: { userId },
    });

    const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
    const spotifyAccount = connected.spotify as SpotifyConnectedAccount | undefined;

    if (!spotifyAccount || !spotifyAccount.verified) {
      throw new BadRequestException('Spotify account is not connected or verified.');
    }

    const token = await this.getValidUserToken(userId, spotifyAccount);
    if (!token) {
      throw new BadRequestException('Unable to obtain a valid Spotify access token.');
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Fetch Liked Songs (up to 100 with pagination)
    const likedSongs: SpotifyTrackDto[] = [];
    let totalLiked = 0;
    try {
      const res1 = await fetch('https://api.spotify.com/v1/me/tracks?limit=50&offset=0', {
        headers,
      });
      if (res1.ok) {
        const data1 = (await res1.json()) as SpotifyLikedTracksResponse;
        totalLiked = data1.total || 0;
        const page1Items = (data1.items || [])
          .map((i) => this.mapSpotifyTrack(i.track))
          .filter((t): t is SpotifyTrackDto => Boolean(t));
        likedSongs.push(...page1Items);

        if (totalLiked > 50) {
          const res2 = await fetch('https://api.spotify.com/v1/me/tracks?limit=50&offset=50', {
            headers,
          });
          if (res2.ok) {
            const data2 = (await res2.json()) as SpotifyLikedTracksResponse;
            const page2Items = (data2.items || [])
              .map((i) => this.mapSpotifyTrack(i.track))
              .filter((t): t is SpotifyTrackDto => Boolean(t));
            likedSongs.push(...page2Items);
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch liked songs: ${(err as Error).message}`);
    }

    // 2. Fetch Playlists (up to 100 with pagination)
    const playlists: SpotifyPlaylistDto[] = [];
    let totalPlaylists = 0;
    try {
      const res1 = await fetch('https://api.spotify.com/v1/me/playlists?limit=50&offset=0', {
        headers,
      });
      if (res1.ok) {
        const data1 = (await res1.json()) as SpotifyPlaylistsResponse;
        totalPlaylists = data1.total || 0;
        const page1Items = (data1.items || [])
          .map((p) => this.mapSpotifyPlaylist(p))
          .filter((p): p is SpotifyPlaylistDto => Boolean(p));
        playlists.push(...page1Items);

        if (totalPlaylists > 50) {
          const res2 = await fetch('https://api.spotify.com/v1/me/playlists?limit=50&offset=50', {
            headers,
          });
          if (res2.ok) {
            const data2 = (await res2.json()) as SpotifyPlaylistsResponse;
            const page2Items = (data2.items || [])
              .map((p) => this.mapSpotifyPlaylist(p))
              .filter((p): p is SpotifyPlaylistDto => Boolean(p));
            playlists.push(...page2Items);
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch playlists: ${(err as Error).message}`);
    }

    // 3. Fetch Top Tracks (up to 50)
    let topTracks: SpotifyTrackDto[] = [];
    try {
      const topRes = await fetch(
        'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=short_term',
        { headers },
      );
      if (topRes.ok) {
        const topData = (await topRes.json()) as { items?: SpotifyTrackResponseItem[] };
        topTracks = (topData.items || [])
          .map((t) => this.mapSpotifyTrack(t))
          .filter((t): t is SpotifyTrackDto => Boolean(t));
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch top tracks: ${(err as Error).message}`);
    }

    // 4. Update ProfileShowcase DB with live counts and library
    connected.spotify = {
      ...spotifyAccount,
      likedSongs,
      playlists,
      topTracks,
      likedSongsCount: totalLiked || likedSongs.length,
      playlistsCount: totalPlaylists || playlists.length,
      librarySyncedAt: new Date().toISOString(),
    };

    await this.prisma.profileShowcase.update({
      where: { userId },
      data: { connectedAccounts: connected as Prisma.InputJsonValue },
    });
    await this.redis.del(`showcase:user:${userId}`);

    return {
      likedSongs,
      playlists,
      topTracks,
      totalLiked: totalLiked || likedSongs.length,
      totalPlaylists: totalPlaylists || playlists.length,
      user: {
        id: spotifyAccount.id || '',
        username: spotifyAccount.username || 'Spotify User',
        avatarUrl: spotifyAccount.avatarUrl || null,
        spotifyUrl: spotifyAccount.spotifyUrl || '',
      },
    };
  }

  private mapSpotifyTrack(t: SpotifyTrackResponseItem | null | undefined): SpotifyTrackDto | null {
    if (!t || !t.id || !t.name) return null;
    return {
      id: t.id,
      title: t.name,
      artist:
        t.artists
          ?.map((a) => a.name)
          .filter(Boolean)
          .join(', ') || 'Unknown Artist',
      albumArt: t.album?.images?.[0]?.url || null,
      durationMs: t.duration_ms || 0,
      previewUrl: t.preview_url || null,
      spotifyUrl: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
      source: 'spotify',
    };
  }

  private mapSpotifyPlaylist(
    p: SpotifyPlaylistResponseItem | null | undefined,
  ): SpotifyPlaylistDto | null {
    if (!p || !p.id || !p.name) return null;
    return {
      id: p.id,
      name: p.name,
      coverUrl: p.images?.[0]?.url || null,
      tracksCount: p.tracks?.total || 0,
      externalUrl: p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
    };
  }

  /**
   * Fetches the user's currently playing track from Spotify API
   * Handles paused playback (keeps paused state for up to 5 minutes),
   * HTTP 204 No Content, and continuous listening duration.
   */
  async getCurrentlyPlayingTrack(
    userId: string,
    spotifyAccount: SpotifyConnectedAccount | Record<string, unknown>,
  ): Promise<SpotifyLiveActivity | null> {
    const token = await this.getValidUserToken(userId, spotifyAccount);
    if (!token) return null;

    const previousActivity: SpotifyLiveActivity | undefined = (
      spotifyAccount as SpotifyConnectedAccount
    ).currentActivity;
    const now = Date.now();

    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Strict HTTP 204 / 202 check: player closed or idle
      if (res.status === 204 || res.status === 202 || !res.ok) {
        // If track was recently active or paused within the last 5 minutes (300,000 ms),
        // keep displaying it in paused state instead of disappearing immediately!
        if (previousActivity && previousActivity.type === 'spotify') {
          const pausedSince = previousActivity.pausedAt || previousActivity.updatedAt || 0;
          if (now - pausedSince < 300_000) {
            return {
              ...previousActivity,
              isPaused: true,
              pausedAt: previousActivity.pausedAt || now,
              updatedAt: now,
            };
          }
        }
        return null;
      }

      const data = (await res.json()) as SpotifyCurrentlyPlayingResponse;

      // If data or item is missing:
      if (!data || !data.item || !data.item.id) {
        if (previousActivity && previousActivity.type === 'spotify') {
          const pausedSince = previousActivity.pausedAt || previousActivity.updatedAt || 0;
          if (now - pausedSince < 300_000) {
            return {
              ...previousActivity,
              isPaused: true,
              pausedAt: previousActivity.pausedAt || now,
              updatedAt: now,
            };
          }
        }
        return null;
      }

      // Check if item is a track (exclude podcasts / episodes)
      if (data.currently_playing_type && data.currently_playing_type !== 'track') {
        return null;
      }

      const isPlaying = Boolean(data.is_playing);
      const isPaused = !isPlaying;

      const item = data.item;
      const title = cleanSpotifyText(item.name || 'Unknown Track');
      const artist = cleanSpotifyText(
        item.artists
          ?.map((a) => a.name)
          .filter(Boolean)
          .join(', ') || 'Unknown Artist',
      );
      const imageUrl = item.album?.images?.[0]?.url ?? null;
      const externalUrl =
        item.external_urls?.spotify || `https://open.spotify.com/track/${item.id}`;
      const progressMs =
        typeof data.progress_ms === 'number' ? data.progress_ms : previousActivity?.progressMs || 0;
      const durationMs = item.duration_ms || 0;

      // Handle PAUSED track state:
      if (isPaused) {
        const pausedAt =
          previousActivity && previousActivity.trackId === item.id && previousActivity.pausedAt
            ? previousActivity.pausedAt
            : now;

        // If paused for 5 minutes (300,000 ms) without user resuming, clear activity
        if (now - pausedAt >= 300_000) {
          return null;
        }

        return {
          type: 'spotify',
          title,
          subtitle: artist,
          artist,
          imageUrl,
          externalUrl,
          trackId: item.id || '',
          progressMs,
          durationMs,
          startedAt: previousActivity?.startedAt || new Date(now - progressMs).toISOString(),
          updatedAt: now,
          isPaused: true,
          pausedAt,
        };
      }

      // Handle PLAYING track state:
      const lastActiveTime = previousActivity?.updatedAt || 0;

      // Continuous Listening Session Continuity:
      // If the user was already listening on Spotify within the last 5 minutes (300,000 ms),
      // preserve continuous session startedAt so switching tracks or playlists doesn't reset to 00:00!
      const isContinuousSession =
        previousActivity &&
        previousActivity.type === 'spotify' &&
        Boolean(previousActivity.startedAt) &&
        (previousActivity.trackId === item.id || now - lastActiveTime < 300_000);

      const startedAt = isContinuousSession
        ? previousActivity.startedAt
        : new Date(now - progressMs).toISOString();

      return {
        type: 'spotify',
        title,
        subtitle: artist,
        artist,
        imageUrl,
        externalUrl,
        trackId: item.id || '',
        progressMs,
        durationMs,
        startedAt,
        updatedAt: now,
        isPaused: false,
      };
    } catch (err) {
      this.logger.warn(
        `Error querying currently playing track for user ${userId}: ${(err as Error).message}`,
      );
      if (previousActivity && previousActivity.type === 'spotify') {
        const pausedSince = previousActivity.pausedAt || previousActivity.updatedAt || 0;
        if (now - pausedSince < 300_000) {
          return {
            ...previousActivity,
            isPaused: true,
            pausedAt: previousActivity.pausedAt || now,
            updatedAt: now,
          };
        }
      }
      return null;
    }
  }

  /**
   * Completes OAuth callback, fetches profile, liked songs, and playlists, then saves to Showcase
   */
  async handleOAuthCallback(query: Record<string, unknown>, res: Response): Promise<void> {
    const code = typeof query.code === 'string' ? query.code : undefined;
    const state = typeof query.state === 'string' ? query.state : '';

    if (!code) {
      this.renderHtmlMessage(
        res,
        false,
        'Missing authorization code from Spotify. Please try again.',
      );
      return;
    }

    let userId = typeof query.userId === 'string' ? query.userId : undefined;
    if (!userId && state && state.includes(':')) {
      userId = state.split(':')[1];
    }

    if (!userId) {
      this.renderHtmlMessage(res, false, 'Could not identify user from OAuth state.');
      return;
    }

    try {
      // Exchange code with resilient redirect_uri retry
      let tokenData: { access_token: string; refresh_token: string; expires_in: number };
      try {
        tokenData = await this.exchangeCode(code);
      } catch (primaryErr) {
        this.logger.warn(
          `Primary redirect_uri failed, attempting secondary fallbacks: ${(primaryErr as Error).message}`,
        );
        const fallbacks = [
          'http://127.0.0.1:3000/integrations/spotify/callback',
          'http://127.0.0.1:5173/api/auth/spotify/callback',
          'http://localhost:3000/api/auth/spotify/callback',
          'https://eternalnet.vercel.app/api/auth/spotify/callback',
          'https://eternalnet.vercel.app/oauth/callback',
          'https://eternalnet.vercel.app/callback',
          'https://eternalnet.vercel.app',
        ];
        let resolved = false;
        for (const fallback of fallbacks) {
          try {
            tokenData = await this.exchangeCode(code, fallback);
            resolved = true;
            break;
          } catch {
            // continue trying
          }
        }
        if (!resolved) {
          const existingShowcase = await this.prisma.profileShowcase.findUnique({
            where: { userId },
          });
          const existingConnected = existingShowcase?.connectedAccounts as Record<
            string,
            unknown
          > | null;
          const existingSpotify = existingConnected?.spotify as SpotifyConnectedAccount | undefined;
          if (existingSpotify?.verified) {
            this.renderSuccessHtml(res, existingSpotify.username || 'Spotify User');
            return;
          }
          throw primaryErr;
        }
      }

      const accessToken = tokenData!.access_token;
      const refreshToken = tokenData!.refresh_token;
      const tokenExpiresAt = Date.now() + tokenData!.expires_in * 1000;

      // Fetch user profile
      let me: SpotifyMeResponse = {};
      try {
        const meRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (meRes.ok) {
          me = (await meRes.json()) as SpotifyMeResponse;
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch /v1/me: ${(err as Error).message}`);
      }

      // Fetch user's liked tracks
      let likedSongs: SpotifyTrackDto[] = [];
      try {
        const likedRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=20', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (likedRes.ok) {
          const likedData = (await likedRes.json()) as SpotifyLikedTracksResponse;
          if (Array.isArray(likedData.items)) {
            likedSongs = likedData.items
              .filter((i): i is { track: SpotifyTrackResponseItem } =>
                Boolean(i && i.track && i.track.id),
              )
              .map((i) => {
                const t = i.track;
                return {
                  id: t.id || '',
                  title: t.name || 'Unknown Track',
                  artist:
                    t.artists
                      ?.map((a) => a.name)
                      .filter(Boolean)
                      .join(', ') || 'Unknown Artist',
                  albumArt: t.album?.images?.[0]?.url || null,
                  durationMs: t.duration_ms || 0,
                  previewUrl: t.preview_url || null,
                  spotifyUrl:
                    t.external_urls?.spotify || `https://open.spotify.com/track/${t.id || ''}`,
                  source: 'spotify' as const,
                };
              });
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch liked tracks: ${(err as Error).message}`);
      }

      // Fetch user's playlists
      let playlists: SpotifyPlaylistDto[] = [];
      try {
        const plRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (plRes.ok) {
          const plData = (await plRes.json()) as SpotifyPlaylistsResponse;
          if (Array.isArray(plData.items)) {
            playlists = plData.items
              .filter((p): p is SpotifyPlaylistResponseItem & { id: string; name: string } =>
                Boolean(p && p.id && p.name),
              )
              .map((p) => ({
                id: p.id,
                name: p.name,
                coverUrl: p.images?.[0]?.url || null,
                tracksCount: p.tracks?.total || 0,
                externalUrl:
                  p.external_urls?.spotify || `https://open.spotify.com/playlist/${p.id}`,
              }));
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch playlists: ${(err as Error).message}`);
      }

      // Save into ProfileShowcase
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId },
      });

      const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
      const existingSpotify = (connected.spotify as SpotifyConnectedAccount | undefined) || {};

      connected.spotify = {
        ...existingSpotify,
        verified: true,
        authenticatedAt: new Date().toISOString(),
        id: me.id || 'spotify_user',
        username: me.display_name || me.id || 'Spotify User',
        avatarUrl: me.images?.[0]?.url || null,
        spotifyUrl: me.external_urls?.spotify || `https://open.spotify.com/user/${me.id || 'me'}`,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        likedSongs,
        playlists,
        displayOnProfile: existingSpotify.displayOnProfile ?? true,
        displayMode: existingSpotify.displayMode ?? 'tracks',
        favoriteTracks:
          existingSpotify.favoriteTracks && existingSpotify.favoriteTracks.length > 0
            ? existingSpotify.favoriteTracks
            : likedSongs.slice(0, 3).map((t) => t.id),
        favoritePlaylists: existingSpotify.favoritePlaylists || [],
      };

      await this.prisma.profileShowcase.upsert({
        where: { userId },
        create: {
          userId,
          connectedAccounts: connected as Prisma.InputJsonValue,
        },
        update: {
          connectedAccounts: connected as Prisma.InputJsonValue,
        },
      });

      await this.redis.del(`showcase:user:${userId}`);

      const username = me.display_name || me.id || 'Spotify User';
      this.renderSuccessHtml(res, username);
    } catch (err) {
      this.logger.error(`Spotify OAuth callback error: ${(err as Error).message}`);
      this.renderHtmlMessage(
        res,
        false,
        `Authentication failed: ${(err as Error).message}. Please return to settings and try again.`,
      );
    }
  }

  private renderSuccessHtml(res: Response, username: string) {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spotify Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { background: #0e0e11; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; user-select: none; }
            .card { text-align: center; padding: 32px 36px; border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; background: #141417; box-shadow: 0 25px 60px rgba(0,0,0,0.8); max-width: 380px; width: 90%; }
            .icon { width: 56px; height: 56px; margin: 0 auto 16px; background: #18181b; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #1DB954; box-shadow: 0 0 24px rgba(29,185,84,0.4); }
            h2 { font-size: 18px; margin: 0 0 8px; font-weight: 700; color: #fff; }
            p { font-size: 13px; color: #a1a1aa; margin: 0 0 20px; line-height: 1.4; }
            .btn { background: #1DB954; color: #fff; border: none; border-radius: 12px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
            .btn:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
            </div>
            <h2>Spotify Connected!</h2>
            <p>Logged in as <b style="color:#fff;">${username}</b>.<br>Your liked tracks and playlists are now synced.</p>
            <button class="btn" onclick="window.close()">Close Window</button>
          </div>
          <script>
            function broadcast() {
              if (window.opener) {
                try {
                  window.opener.postMessage({
                    type: 'INTEGRATION_AUTH_SUCCESS',
                    platform: 'spotify',
                    username: ${JSON.stringify(username)}
                  }, '*');
                } catch (e) {}
              }
            }
            broadcast();
            var interval = setInterval(broadcast, 400);
            setTimeout(function() {
              clearInterval(interval);
              broadcast();
              window.close();
            }, 2500);
          </script>
        </body>
      </html>
    `);
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private renderHtmlMessage(res: Response, success: boolean, message: string) {
    const safeMessage = this.escapeHtml(message);
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spotify Connection</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { background: #0e0e11; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; user-select: none; }
            .card { text-align: center; padding: 32px 36px; border: 1px solid rgba(255,255,255,0.12); border-radius: 24px; background: #141417; box-shadow: 0 25px 60px rgba(0,0,0,0.8); max-width: 380px; width: 90%; }
            h2 { font-size: 18px; margin: 0 0 8px; font-weight: 700; color: ${success ? '#1DB954' : '#ef4444'}; }
            p { font-size: 13px; color: #a1a1aa; margin: 0 0 20px; line-height: 1.4; }
            .btn { background: #27272a; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; }
            .btn:hover { background: #3f3f46; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${success ? 'Success' : 'Notice'}</h2>
            <p>${safeMessage}</p>
            <button class="btn" onclick="window.close()">Close Window</button>
          </div>
        </body>
      </html>
    `);
  }

  /**
   * Updates user's Spotify showcase options (favorite tracks, playlists, display mode, visibility)
   */
  async updateSpotifyPreferences(
    userId: string,
    dto: {
      displayOnProfile?: boolean;
      displayMode?: 'tracks' | 'playlists' | 'none';
      favoriteTracks?: string[];
      favoritePlaylists?: string[];
    },
  ): Promise<Record<string, unknown>> {
    const showcase = await this.prisma.profileShowcase.findUnique({
      where: { userId },
    });
    if (!showcase) {
      throw new BadRequestException('Profile showcase not found');
    }

    const connected = (showcase.connectedAccounts as Record<string, unknown>) || {};
    const existingSpotify = (connected.spotify as SpotifyConnectedAccount | undefined) || {};

    const updatedSpotify: Record<string, unknown> = {
      ...existingSpotify,
      ...(dto.displayOnProfile !== undefined && { displayOnProfile: dto.displayOnProfile }),
      ...(dto.displayMode !== undefined && { displayMode: dto.displayMode }),
      ...(dto.favoriteTracks !== undefined && { favoriteTracks: dto.favoriteTracks.slice(0, 3) }),
      ...(dto.favoritePlaylists !== undefined && {
        favoritePlaylists: dto.favoritePlaylists.slice(0, 3),
      }),
    };
    connected.spotify = updatedSpotify;

    await this.prisma.profileShowcase.update({
      where: { userId },
      data: { connectedAccounts: connected as Prisma.InputJsonValue },
    });

    await this.redis.del(`showcase:user:${userId}`);
    return updatedSpotify;
  }

  private extractPureSpotifyTrackId(trackId: string): string {
    if (!trackId) return '';
    const urlMatch = trackId.match(/spotify\.com\/track\/([a-zA-Z0-9]{22})/);
    if (urlMatch) return urlMatch[1];
    const uriMatch = trackId.match(/spotify:track:([a-zA-Z0-9]{22})/);
    if (uriMatch) return uriMatch[1];
    const plainMatch = trackId.match(/([a-zA-Z0-9]{22})/);
    if (plainMatch) return plainMatch[1];
    return trackId
      .replace('spotify:track:', '')
      .replace(/^anthem-/, '')
      .trim();
  }

  /**
   * Saves or removes a track in the user's Spotify "Liked Songs" library (PUT/DELETE /v1/me/library or /v1/me/tracks)
   */
  async saveTrackToLibrary(
    userId: string,
    trackId: string,
    like: boolean,
  ): Promise<{ success: boolean; isLiked: boolean }> {
    try {
      const isSoundCloud = trackId.startsWith('sc-') || trackId.startsWith('soundcloud-');
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId },
      });
      const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};

      if (isSoundCloud) {
        const soundcloud = (connected.soundcloud as { likedTracks?: string[] } | undefined) || {};
        let likedTracks: string[] = Array.isArray(soundcloud.likedTracks)
          ? [...soundcloud.likedTracks]
          : [];
        if (like) {
          if (!likedTracks.includes(trackId)) likedTracks.unshift(trackId);
        } else {
          likedTracks = likedTracks.filter((id: string) => id !== trackId);
        }
        connected.soundcloud = { ...soundcloud, likedTracks };
        await this.prisma.profileShowcase.update({
          where: { userId },
          data: { connectedAccounts: connected as Prisma.InputJsonValue },
        });
        await this.redis.del(`showcase:user:${userId}`);
        return { success: true, isLiked: like };
      }

      const spotify = connected.spotify as SpotifyConnectedAccount | undefined;

      if (!spotify) {
        return { success: true, isLiked: like };
      }

      const token = await this.getValidUserToken(userId, spotify);
      if (!token) {
        return { success: true, isLiked: like };
      }

      const cleanId = this.extractPureSpotifyTrackId(trackId);
      const spotifyUri = `spotify:track:${cleanId}`;
      const method = like ? 'PUT' : 'DELETE';

      // 1. Try modern unified library endpoint (/v1/me/library)
      let res = await fetch(
        `https://api.spotify.com/v1/me/library?uris=${encodeURIComponent(spotifyUri)}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // 2. Fallback to legacy endpoint (/v1/me/tracks)
      if (!res.ok && res.status !== 200) {
        res = await fetch(
          `https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(cleanId)}`,
          {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        );
      }

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(
          `Spotify saveTrackToLibrary API returned status ${res.status}: ${errText}`,
        );
      }

      // Update cached liked songs
      let likedSongs: SpotifyTrackDto[] = Array.isArray(spotify.likedSongs)
        ? [...spotify.likedSongs]
        : [];
      if (like) {
        if (!likedSongs.some((t) => t.id === cleanId)) {
          const trackInfo = await this.fetchSingleTrack(cleanId);
          if (trackInfo) {
            likedSongs.unshift(trackInfo);
          }
        }
      } else {
        likedSongs = likedSongs.filter((t) => t.id !== cleanId);
      }

      const currentCount =
        typeof spotify.likedSongsCount === 'number' ? spotify.likedSongsCount : likedSongs.length;
      connected.spotify = {
        ...spotify,
        likedSongs,
        likedSongsCount: Math.max(0, currentCount + (like ? 1 : -1)),
      };

      await this.prisma.profileShowcase.update({
        where: { userId },
        data: { connectedAccounts: connected as Prisma.InputJsonValue },
      });
      await this.redis.del(`showcase:user:${userId}`);
    } catch (err) {
      this.logger.error(`Error saving track to Spotify library: ${(err as Error).message}`);
    }

    return { success: true, isLiked: like };
  }

  /**
   * Checks if a track is in user's Spotify "Liked Songs" library
   */
  async checkTrackLiked(userId: string, trackId: string): Promise<{ isLiked: boolean }> {
    try {
      const isSoundCloud = trackId.startsWith('sc-') || trackId.startsWith('soundcloud-');
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId },
      });
      const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};

      if (isSoundCloud) {
        const soundcloud = (connected.soundcloud as { likedTracks?: string[] } | undefined) || {};
        const likedTracks: string[] = Array.isArray(soundcloud.likedTracks)
          ? soundcloud.likedTracks
          : [];
        return { isLiked: likedTracks.includes(trackId) };
      }

      const spotify = connected.spotify as SpotifyConnectedAccount | undefined;
      if (!spotify) return { isLiked: false };

      const token = await this.getValidUserToken(userId, spotify);
      if (!token) return { isLiked: false };

      const cleanId = this.extractPureSpotifyTrackId(trackId);
      const spotifyUri = `spotify:track:${cleanId}`;

      // 1. Check modern unified library
      const res = await fetch(
        `https://api.spotify.com/v1/me/library/contains?uris=${encodeURIComponent(spotifyUri)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = (await res.json()) as boolean[];
        if (Array.isArray(data) && typeof data[0] === 'boolean') {
          return { isLiked: data[0] };
        }
      }

      // 2. Fallback to /v1/me/tracks/contains
      const legacyRes = await fetch(
        `https://api.spotify.com/v1/me/tracks/contains?ids=${encodeURIComponent(cleanId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (legacyRes.ok) {
        const data = (await legacyRes.json()) as boolean[];
        if (Array.isArray(data) && typeof data[0] === 'boolean') {
          return { isLiked: data[0] };
        }
      }

      // 3. Fallback to cached library
      if (Array.isArray(spotify.likedSongs)) {
        return {
          isLiked: spotify.likedSongs.some(
            (t) => t.id === cleanId || (t as { trackId?: string }).trackId === cleanId,
          ),
        };
      }
    } catch (err) {
      this.logger.warn(`checkTrackLiked error: ${(err as Error).message}`);
    }
    return { isLiked: false };
  }

  /**
   * Sets player repeat mode on user's active Spotify session (PUT /v1/me/player/repeat?state=context|track|off)
   */
  async setRepeatMode(
    userId: string,
    state: 'track' | 'context' | 'off',
    deviceId?: string,
  ): Promise<{ success: boolean }> {
    try {
      const showcase = await this.prisma.profileShowcase.findUnique({ where: { userId } });
      const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
      const spotify = connected.spotify as SpotifyConnectedAccount | undefined;
      if (!spotify) return { success: false };

      const token = await this.getValidUserToken(userId, spotify);
      if (!token) return { success: false };

      const url = new URL('https://api.spotify.com/v1/me/player/repeat');
      url.searchParams.set('state', state);
      if (deviceId) {
        url.searchParams.set('device_id', deviceId);
      }

      const res = await fetch(url.toString(), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  }

  /**
   * Sets player shuffle mode on user's active Spotify session (PUT /v1/me/player/shuffle?state=true|false)
   */
  async setShuffle(
    userId: string,
    state: boolean,
    deviceId?: string,
  ): Promise<{ success: boolean }> {
    try {
      const showcase = await this.prisma.profileShowcase.findUnique({ where: { userId } });
      const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
      const spotify = connected.spotify as SpotifyConnectedAccount | undefined;
      if (!spotify) return { success: false };

      const token = await this.getValidUserToken(userId, spotify);
      if (!token) return { success: false };

      const url = new URL('https://api.spotify.com/v1/me/player/shuffle');
      url.searchParams.set('state', state ? 'true' : 'false');
      if (deviceId) {
        url.searchParams.set('device_id', deviceId);
      }

      const res = await fetch(url.toString(), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      return { success: res.ok };
    } catch {
      return { success: false };
    }
  }

  /**
   * Fetches single track details from Spotify Catalog
   */
  private async fetchSingleTrack(trackId: string): Promise<SpotifyTrackDto | null> {
    try {
      const appToken = await this.getAppToken();
      if (!appToken) return null;

      const res = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(trackId)}`, {
        headers: { Authorization: `Bearer ${appToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as SpotifyTrackResponseItem;
        return this.mapSpotifyTrack(data);
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * Fetches synchronized LRC lyrics for a song (via LRCLIB open synced lyrics with lyrics.ovh fallback)
   * with smart tag stripping, multilingual alternate title extraction, and in-memory caching.
   */
  async getTrackLyrics(
    title: string,
    artist: string,
    durationMs?: number,
  ): Promise<{
    synced: boolean;
    lines: { timeMs: number; text: string }[];
  }> {
    const rawTitle = cleanSpotifyText(title || '').trim();
    const rawArtist = cleanSpotifyText(artist || '').trim();

    if (!rawTitle) {
      return { synced: false, lines: [] };
    }

    const cacheKey = `${rawTitle.toLowerCase()}::${rawArtist.toLowerCase()}`;
    const cached = this.lyricsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      return { synced: cached.synced, lines: cached.lines };
    }

    const cacheAndReturn = (result: {
      synced: boolean;
      lines: { timeMs: number; text: string }[];
    }) => {
      this.lyricsCache.set(cacheKey, { ...result, timestamp: Date.now() });
      if (this.lyricsCache.size > 500) {
        const firstKey = this.lyricsCache.keys().next().value;
        if (firstKey) this.lyricsCache.delete(firstKey);
      }
      return result;
    };

    // 1. Extract content inside parentheses/brackets as candidate alternate titles
    const parenMatches: string[] = [];
    const parenRegex = /[([{}]([^)\]}]+)[)\]}]/g;
    let pm: RegExpExecArray | null;
    while ((pm = parenRegex.exec(rawTitle)) !== null) {
      parenMatches.push(pm[1].trim());
    }

    // 2. Comprehensive audio / remix / genre / slowed tag filter
    const tagFilter =
      /\b(hardtekk|hardstyle|slowed(\s*\+?\s*reverb)?|speed\s*up|sped\s*up|reverb|remix|nightcore|bass\s*boosted|official(\s*(audio|video|music\s*video|visualizer))?|lyrics|edit|prod\.?|instrumental|clean|extended(\s*mix)?|drill|phonk|radio\s*edit|vip|original\s*mix|club\s*mix|8d|16d|tiktok|soundtrack|ost|cover)\b/gi;

    const cleanTitle = rawTitle
      .replace(/[([{}][^)\]}]*[)\]}]/g, ' ')
      .replace(tagFilter, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 3. Detect "Artist - Track" or "Artist / Track" formatting common on SoundCloud
    let extractedArtist = '';
    let extractedTrack = '';

    const dashMatch = rawTitle.match(/^(.+?)\s+[-–—:]\s+(.+)$/);
    if (dashMatch) {
      extractedArtist = dashMatch[1].replace(tagFilter, ' ').replace(/\s+/g, ' ').trim();
      extractedTrack = dashMatch[2]
        .replace(/[([{}][^)\]}]*[)\]}]/g, ' ')
        .replace(tagFilter, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const cleanArtist = rawArtist
      .replace(/[([{}][^)\]}]*[)\]}]/g, ' ')
      .replace(tagFilter, ' ')
      .replace(/\b(feat\.|ft\.|prod\.)\b.*$/i, '')
      .replace(/\s+/g, ' ')
      .split('&')[0]
      .split(',')[0]
      .trim();

    // Alternate titles from parens (e.g. 'holy war' from 'sacred war (holy war) HARDTEKK slowed')
    const validParenTitles = parenMatches
      .map((p) => p.replace(tagFilter, ' ').replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 2 && !tagFilter.test(p));

    // Helper: direct fetch from LRCLIB
    const tryGetLyrics = async (trackName: string, artistName: string) => {
      if (!trackName) return null;
      try {
        const url = new URL('https://lrclib.net/api/get');
        url.searchParams.set('track_name', trackName);
        if (artistName) url.searchParams.set('artist_name', artistName);
        if (durationMs) {
          url.searchParams.set('duration', Math.round(durationMs / 1000).toString());
        }

        const res = await fetch(url.toString(), {
          headers: { 'User-Agent': 'AntigravitySocialMedia/1.0' },
        });

        if (res.ok) {
          const data = (await res.json()) as LrclibLyricsResponse;
          if (data.syncedLyrics) {
            const parsed = this.parseLrc(data.syncedLyrics);
            if (parsed.length > 0) return { synced: true, lines: parsed };
          }
          if (data.plainLyrics) {
            const plainLines = data.plainLyrics
              .split('\n')
              .map((l: string) => l.trim())
              .filter(Boolean);
            if (plainLines.length > 0) {
              const totalDur = durationMs || 180000;
              const step = Math.floor(totalDur / Math.max(1, plainLines.length));
              return {
                synced: true,
                lines: plainLines.map((text: string, i: number) => ({
                  timeMs: i * step,
                  text,
                })),
              };
            }
          }
        }
      } catch {
        // Continue to search
      }
      return null;
    };

    // Helper: search LRCLIB and score candidates
    const trySearchLyrics = async (query: string, targetTrack: string, targetArtist: string) => {
      if (!query.trim()) return null;
      try {
        const searchRes = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
          { headers: { 'User-Agent': 'AntigravitySocialMedia/1.0' } },
        );
        if (searchRes.ok) {
          const items = (await searchRes.json()) as LrclibLyricsResponse[];
          if (Array.isArray(items) && items.length > 0) {
            const targetLower = targetTrack.toLowerCase();
            const artistLower = targetArtist.toLowerCase();

            let bestItem: LrclibLyricsResponse | null = null;
            let bestScore = -1;

            for (const item of items) {
              if (!item.syncedLyrics && !item.plainLyrics) continue;

              let score = 0;
              const itemTrack = (item.trackName || '').toLowerCase().trim();
              const itemArtist = (item.artistName || '').toLowerCase().trim();

              if (itemTrack === targetLower) {
                score += 50;
              } else if (itemTrack.includes(targetLower) || targetLower.includes(itemTrack)) {
                score += 25;
              }

              if (artistLower && itemArtist) {
                if (itemArtist === artistLower) {
                  score += 40;
                } else if (itemArtist.includes(artistLower) || artistLower.includes(itemArtist)) {
                  score += 20;
                }
              }

              if (item.syncedLyrics) score += 20;
              if (item.plainLyrics) score += 10;

              if (durationMs && item.duration) {
                const durSec = Math.round(durationMs / 1000);
                if (Math.abs(item.duration - durSec) <= 20) {
                  score += 15;
                }
              }

              if (score > bestScore) {
                bestScore = score;
                bestItem = item;
              }
            }

            if (bestItem) {
              if (bestItem.syncedLyrics) {
                const parsed = this.parseLrc(bestItem.syncedLyrics);
                if (parsed.length > 0) return { synced: true, lines: parsed };
              }
              if (bestItem.plainLyrics) {
                const plainLines = bestItem.plainLyrics
                  .split('\n')
                  .map((l: string) => l.trim())
                  .filter(Boolean);
                if (plainLines.length > 0) {
                  const totalDur = durationMs || 180000;
                  const step = Math.floor(totalDur / Math.max(1, plainLines.length));
                  return {
                    synced: true,
                    lines: plainLines.map((text: string, i: number) => ({
                      timeMs: i * step,
                      text,
                    })),
                  };
                }
              }
            }
          }
        }
      } catch {
        // Continue
      }
      return null;
    };

    // Helper: fallback to lyrics.ovh
    const tryLyricsOvh = async (artistName: string, trackName: string) => {
      if (!artistName || !trackName) return null;
      try {
        const res = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`,
          { headers: { 'User-Agent': 'AntigravitySocialMedia/1.0' } },
        );
        if (res.ok) {
          const data = (await res.json()) as LyricsOvhResponse;
          if (data.lyrics && typeof data.lyrics === 'string') {
            const plainLines = data.lyrics
              .split('\n')
              .map((l: string) => l.trim())
              .filter(Boolean)
              .filter((l: string) => !l.toLowerCase().startsWith('paroles de la chanson'));
            if (plainLines.length > 0) {
              const totalDur = durationMs || 180000;
              const step = Math.floor(totalDur / Math.max(1, plainLines.length));
              return {
                synced: true,
                lines: plainLines.map((text: string, i: number) => ({
                  timeMs: i * step,
                  text,
                })),
              };
            }
          }
        }
      } catch {
        // Ignore
      }
      return null;
    };

    try {
      // 1. If SoundCloud format "Artist - Track"
      if (extractedArtist && extractedTrack) {
        const directExtracted = await tryGetLyrics(extractedTrack, extractedArtist);
        if (directExtracted) return cacheAndReturn(directExtracted);

        const searchExtracted = await trySearchLyrics(
          `${extractedArtist} ${extractedTrack}`,
          extractedTrack,
          extractedArtist,
        );
        if (searchExtracted) return cacheAndReturn(searchExtracted);
      }

      // 2. Direct lookup with cleanTitle & cleanArtist
      if (cleanTitle && cleanArtist) {
        const directClean = await tryGetLyrics(cleanTitle, cleanArtist);
        if (directClean) return cacheAndReturn(directClean);
      }

      // 3. Priority multi-query search
      const candidateQueries: { q: string; targetTrack: string; targetArtist: string }[] = [];

      if (cleanArtist && cleanTitle) {
        candidateQueries.push({
          q: `${cleanArtist} ${cleanTitle}`,
          targetTrack: cleanTitle,
          targetArtist: cleanArtist,
        });
      }
      if (cleanTitle) {
        candidateQueries.push({
          q: cleanTitle,
          targetTrack: cleanTitle,
          targetArtist: cleanArtist,
        });
      }
      for (const p of validParenTitles) {
        if (cleanArtist) {
          candidateQueries.push({
            q: `${cleanArtist} ${p}`,
            targetTrack: p,
            targetArtist: cleanArtist,
          });
        }
        candidateQueries.push({
          q: p,
          targetTrack: p,
          targetArtist: cleanArtist,
        });
      }
      if (extractedTrack) {
        candidateQueries.push({
          q: extractedTrack,
          targetTrack: extractedTrack,
          targetArtist: extractedArtist,
        });
      }

      for (const cand of candidateQueries) {
        const searchResult = await trySearchLyrics(cand.q, cand.targetTrack, cand.targetArtist);
        if (searchResult) return cacheAndReturn(searchResult);
      }

      // 4. Fallback to lyrics.ovh
      if (cleanArtist && cleanTitle) {
        const ovh = await tryLyricsOvh(cleanArtist, cleanTitle);
        if (ovh) return cacheAndReturn(ovh);
      }
      if (extractedArtist && extractedTrack) {
        const ovh = await tryLyricsOvh(extractedArtist, extractedTrack);
        if (ovh) return cacheAndReturn(ovh);
      }
    } catch (err) {
      this.logger.warn(`Lyrics resolution error: ${(err as Error).message}`);
    }

    return cacheAndReturn({ synced: false, lines: [] });
  }

  private parseLrc(lrcText: string): { timeMs: number; text: string }[] {
    const lines = lrcText.split('\n');
    const result: { timeMs: number; text: string }[] = [];
    const timeReg = /\[(\d{2}):(\d{2})\.?(\d{0,3})\](.*)/;

    for (const rawLine of lines) {
      const match = rawLine.match(timeReg);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const msStr = match[3] || '0';
        const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
        const totalMs = min * 60000 + sec * 1000 + ms;
        const text = match[4].trim();
        if (text) {
          result.push({ timeMs: totalMs, text });
        }
      }
    }

    return result.sort((a, b) => a.timeMs - b.timeMs);
  }

  /**
   * Retrieves fresh OAuth access token for Spotify Web Playback SDK
   */
  async getUserSpotifyToken(
    userId: string,
  ): Promise<{ accessToken: string | null; expiresIn: number }> {
    const showcase = await this.prisma.profileShowcase.findUnique({
      where: { userId },
    });
    const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
    const spotify = connected.spotify as SpotifyConnectedAccount | undefined;
    if (!spotify) {
      return { accessToken: null, expiresIn: 0 };
    }
    const token = await this.getValidUserToken(userId, spotify);
    const expiresIn =
      typeof spotify.tokenExpiresAt === 'number'
        ? Math.max(0, Math.floor((spotify.tokenExpiresAt - Date.now()) / 1000))
        : 3600;
    return { accessToken: token, expiresIn };
  }

  /**
   * Plays track via Spotify Web API on a specific device (e.g. Web Playback SDK device)
   */
  async playTrackOnDevice(
    userId: string,
    deviceId: string,
    trackId: string,
    positionMs?: number,
  ): Promise<{
    success: boolean;
    error?: string;
    permissionsMissing?: boolean;
  }> {
    const { accessToken } = await this.getUserSpotifyToken(userId);
    if (!accessToken) {
      return { success: false, error: 'Spotify account not connected or token expired' };
    }

    try {
      let cleanId = trackId.replace(/^spotify:track:/, '').trim();

      // If cleanId contains a URL (e.g. open.spotify.com/track/48TKaLj9x4L329teHsLngL)
      const urlMatch = cleanId.match(/(?:track\/|track:)([a-zA-Z0-9]{22})/);
      if (urlMatch) {
        cleanId = urlMatch[1];
      }

      // If cleanId is NOT a valid 22-char Spotify ID (e.g. synthetic ID or search term)
      if (!/^[a-zA-Z0-9]{22}$/.test(cleanId)) {
        this.logger.warn(
          `Non-standard Spotify trackId received: "${cleanId}". Attempting catalog resolution...`,
        );
        const query = cleanId
          .replace(/^anthem-/, '')
          .replace(/^spotify-search-/, '')
          .replace(/&amp;/g, '&')
          .replace(/-/g, ' ')
          .trim();

        if (query) {
          try {
            const resolved = await this.searchTracks(query);
            if (resolved.length > 0 && resolved[0].id) {
              cleanId = resolved[0].id;
              this.logger.log(`Resolved track "${query}" to authentic Spotify ID: ${cleanId}`);
            }
          } catch (resErr) {
            this.logger.warn(`Failed resolving track "${query}": ${(resErr as Error).message}`);
          }
        }
      }

      if (!/^[a-zA-Z0-9]{22}$/.test(cleanId)) {
        this.logger.warn(`Cannot play invalid track identifier: ${trackId}`);
        return {
          success: false,
          error: `Invalid Spotify track URI or ID: ${trackId}`,
        };
      }

      // 1. Direct device playback command to target device
      let currentToken = accessToken;
      let res = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: [`spotify:track:${cleanId}`],
            position_ms: positionMs || 0,
          }),
        },
      );

      // If 401 (token expired/invalidated), auto-refresh token and retry once
      if (res.status === 401) {
        const showcase = await this.prisma.profileShowcase.findUnique({ where: { userId } });
        const connected = showcase?.connectedAccounts as Record<string, unknown> | null;
        const spotify = connected?.spotify as SpotifyConnectedAccount | undefined;
        if (spotify?.refreshToken) {
          const freshToken = await this.refreshUserAccessToken(userId, spotify.refreshToken);
          if (freshToken) {
            currentToken = freshToken;
            res = await fetch(
              `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${currentToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  uris: [`spotify:track:${cleanId}`],
                  position_ms: positionMs || 0,
                }),
              },
            );
          }
        }
      }

      // If 404 (Device not active in Spotify Connect list), transfer device with play: true
      if (res.status === 404) {
        await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ device_ids: [deviceId], play: true }),
        });

        // Retry play
        res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${currentToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uris: [`spotify:track:${cleanId}`],
              position_ms: positionMs || 0,
            }),
          },
        );
      }

      if (!res.ok && res.status !== 204) {
        const text = await res.text();
        const isPermissionsMissing =
          text.includes('Permissions missing') || (res.status === 403 && text.includes('scope'));
        this.logger.warn(`Spotify play on device error (${res.status}): ${text}`);

        return {
          success: false,
          error: text,
          permissionsMissing: isPermissionsMissing,
        };
      }

      return { success: true };
    } catch (err) {
      this.logger.error(`Error playing track on Spotify device: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Retrieves upcoming playback queue from active Spotify session (if playlist/album is playing)
   * or intelligently generates Spotify Infinite Audio recommendations based on current track/artist.
   */
  async getPlaybackQueueOrInfiniteAudio(
    userId?: string,
    currentTrackId?: string,
    artist?: string,
    title?: string,
    offset: number = 0,
    historyIds: string[] = [],
  ): Promise<{
    source: 'playlist' | 'infinite-audio';
    tracks: SpotifyTrackDto[];
    hasMore: boolean;
  }> {
    const isSoundCloud = Boolean(
      currentTrackId &&
      (currentTrackId.startsWith('sc-') ||
        currentTrackId.startsWith('soundcloud-') ||
        /^\d+$/.test(currentTrackId)),
    );

    // 1. If SoundCloud track: STRICTLY SoundCloud tracks only! Never Spotify.
    if (isSoundCloud && currentTrackId) {
      const cleanScId = currentTrackId
        .replace(/^sc-/, '')
        .replace(/^soundcloud-/, '')
        .trim();
      const excludes = [
        currentTrackId,
        `sc-${cleanScId}`,
        cleanScId,
        ...(historyIds || []).slice(0, 15),
      ];

      const related = await this.soundCloudService.getRelatedTracks(currentTrackId, excludes, 10);
      const mapped: SpotifyTrackDto[] = related.map((t) => ({
        id: t.id.startsWith('sc-') ? t.id : `sc-${t.id}`,
        title: t.title,
        artist: t.artist,
        albumArt: t.albumArt,
        durationMs: t.durationMs,
        previewUrl: t.previewUrl,
        spotifyUrl: t.spotifyUrl,
        source: 'soundcloud' as const,
        streamUrl: t.streamUrl || `/api/integrations/soundcloud/stream/${t.id.replace(/^sc-/, '')}`,
      }));

      // Fallback: If related returned fewer than 10 tracks, search SoundCloud for more by artist/genre
      if (mapped.length < 10) {
        const searchQuery = `${artist || ''} ${title || ''}`.trim() || artist || title || '';
        if (searchQuery) {
          const scSearch = await this.soundCloudService.searchTracks(searchQuery, 15, 0);
          for (const t of scSearch) {
            const trackIdWithPrefix = t.id.startsWith('sc-') ? t.id : `sc-${t.id}`;
            if (
              !excludes.includes(t.id) &&
              !excludes.includes(trackIdWithPrefix) &&
              !mapped.some((m) => m.id === trackIdWithPrefix)
            ) {
              mapped.push({
                id: trackIdWithPrefix,
                title: t.title,
                artist: t.artist,
                albumArt: t.albumArt,
                durationMs: t.durationMs,
                previewUrl: t.previewUrl,
                spotifyUrl: t.spotifyUrl,
                source: 'soundcloud' as const,
                streamUrl:
                  t.streamUrl || `/api/integrations/soundcloud/stream/${t.id.replace(/^sc-/, '')}`,
              });
              if (mapped.length >= 10) break;
            }
          }
        }
      }

      return {
        source: 'infinite-audio',
        tracks: mapped.slice(0, 10),
        hasMore: mapped.length >= 10,
      };
    }

    // 2. Track is from Spotify: generate similar tracks from BOTH Spotify and SoundCloud simultaneously with high accuracy!
    const cleanId = currentTrackId ? this.extractPureSpotifyTrackId(currentTrackId) : '';

    const rawArtist = (artist || '').trim();
    const rawTitle = (title || '').trim();

    const cleanArtist = cleanSpotifyText(rawArtist)
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .split('&')[0]
      .split(',')[0]
      .replace(/\s+feat\.?.*$/i, '')
      .trim();

    const cleanTitle = cleanSpotifyText(rawTitle)
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .trim();

    const fullText = `${rawArtist} ${rawTitle}`.toLowerCase();
    let detectedStyle = '';
    if (/hardtekk|tekk|larptekk|tekkno|hardstyle|schranz/i.test(fullText)) {
      detectedStyle = 'hardtekk';
    } else if (/phonk|drift|memphis|kordhell|giga|dxrk|ghostface|playaphonk/i.test(fullText)) {
      detectedStyle = 'drift phonk';
    } else if (/slowed|reverb|speed up|nightcore|sped up|super slowed/i.test(fullText)) {
      detectedStyle = 'slowed reverb';
    } else if (
      /hyperpop|digicore|glitchcore|vyzee|sophie|brakence|glaive|charli xcx/i.test(fullText)
    ) {
      detectedStyle = 'hyperpop';
    } else if (/synthwave|retrowave|cyberpunk|outrun|chillwave|vaporwave/i.test(fullText)) {
      detectedStyle = 'synthwave';
    } else if (
      /rap|hip[- ]?hop|trap|drill|carti|lil |yeat|ken carson|destroy lonely|kankan|lucki|playboi/i.test(
        fullText,
      )
    ) {
      detectedStyle = 'trap hip hop';
    } else if (
      /rock|metal|punk|grunge|alternative|linkin park|nirvana|deftones|metallica|slipknot/i.test(
        fullText,
      )
    ) {
      detectedStyle = 'alternative rock';
    } else if (/edm|house|techno|dance|electronic|dnb|drum and bass|dubstep/i.test(fullText)) {
      detectedStyle = 'electronic dance';
    } else if (/lo[- ]?fi|lofi|chillhop|ambient/i.test(fullText)) {
      detectedStyle = 'lo-fi beats';
    } else if (/indie|bedroom pop|dreampop|shoegaze|mac demarco|boy pablo/i.test(fullText)) {
      detectedStyle = 'indie pop';
    } else if (/pop|r&b|soul|the weeknd|billie eilish|dua lipa|ariana/i.test(fullText)) {
      detectedStyle = 'pop';
    }

    let spotifyTracks: SpotifyTrackDto[] = [];
    let soundCloudTracks: SpotifyTrackDto[] = [];

    // Search Spotify tracks matching artist & style
    try {
      const appToken = await this.getAppToken();
      let query = '';
      if (cleanArtist) {
        if (offset === 0) {
          query = detectedStyle ? `${cleanArtist} ${detectedStyle}` : cleanArtist;
        } else if (offset <= 10) {
          query = `${cleanArtist} ${cleanTitle}`.trim();
        } else {
          query = detectedStyle ? `${cleanArtist} ${detectedStyle}` : cleanArtist;
        }
      } else if (cleanTitle) {
        query = detectedStyle ? `${cleanTitle} ${detectedStyle}` : cleanTitle;
      } else if (detectedStyle) {
        query = detectedStyle;
      }

      if (query) {
        const searchOffset = Math.min(offset, 40);
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10&offset=${searchOffset}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${appToken}` },
        });

        if (res.ok) {
          const data = (await res.json()) as SpotifySearchTracksResponse;
          const items = data.tracks?.items;
          if (Array.isArray(items) && items.length > 0) {
            spotifyTracks = items
              .map((t) => this.mapSpotifyTrack(t))
              .filter((t): t is SpotifyTrackDto => Boolean(t))
              .filter(
                (t) =>
                  t.id !== cleanId &&
                  (!cleanTitle || t.title.toLowerCase() !== cleanTitle.toLowerCase()),
              );

            if (spotifyTracks.length === 0) {
              spotifyTracks = items
                .map((t) => this.mapSpotifyTrack(t))
                .filter((t): t is SpotifyTrackDto => Boolean(t))
                .filter((t) => t.id !== cleanId);
            }
          }
        }

        // If artist query with style was empty or had no tracks, try cleanArtist directly
        if (spotifyTracks.length === 0 && cleanArtist && query !== cleanArtist) {
          const fbUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanArtist)}&type=track&limit=10`;
          const fbRes = await fetch(fbUrl, { headers: { Authorization: `Bearer ${appToken}` } });
          if (fbRes.ok) {
            const fbData = (await fbRes.json()) as SpotifySearchTracksResponse;
            const fbItems = fbData.tracks?.items;
            if (Array.isArray(fbItems) && fbItems.length > 0) {
              spotifyTracks = fbItems
                .map((t) => this.mapSpotifyTrack(t))
                .filter((t): t is SpotifyTrackDto => Boolean(t))
                .filter((t) => t.id !== cleanId);
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Spotify search recommendation error: ${(err as Error).message}`);
    }

    // Parallel: Search SoundCloud tracks matching the style & artist!
    try {
      const scQuery =
        cleanArtist && cleanTitle
          ? `${cleanArtist} ${cleanTitle}`
          : cleanArtist || cleanTitle || detectedStyle || '';
      if (scQuery) {
        const scResults = await this.soundCloudService.searchTracks(scQuery, 10, offset);
        if (Array.isArray(scResults) && scResults.length > 0) {
          soundCloudTracks = scResults
            .filter((t) => !historyIds.includes(t.id) && t.id !== currentTrackId)
            .map((t) => ({
              id: t.id.startsWith('sc-') ? t.id : `sc-${t.id}`,
              title: t.title,
              artist: t.artist,
              albumArt: t.albumArt,
              durationMs: t.durationMs,
              previewUrl: t.previewUrl,
              spotifyUrl: t.spotifyUrl,
              source: 'soundcloud' as const,
              streamUrl:
                t.streamUrl || `/api/integrations/soundcloud/stream/${t.id.replace(/^sc-/, '')}`,
            }));
        }

        // If SC returned 0 tracks, try detectedStyle on SoundCloud
        if (soundCloudTracks.length === 0 && detectedStyle) {
          const scStyleResults = await this.soundCloudService.searchTracks(
            detectedStyle,
            10,
            offset,
          );
          if (Array.isArray(scStyleResults) && scStyleResults.length > 0) {
            soundCloudTracks = scStyleResults
              .filter((t) => !historyIds.includes(t.id) && t.id !== currentTrackId)
              .map((t) => ({
                id: t.id.startsWith('sc-') ? t.id : `sc-${t.id}`,
                title: t.title,
                artist: t.artist,
                albumArt: t.albumArt,
                durationMs: t.durationMs,
                previewUrl: t.previewUrl,
                spotifyUrl: t.spotifyUrl,
                source: 'soundcloud' as const,
                streamUrl:
                  t.streamUrl || `/api/integrations/soundcloud/stream/${t.id.replace(/^sc-/, '')}`,
              }));
          }
        }
      }
    } catch (err) {
      this.logger.warn(`SoundCloud search recommendation error: ${(err as Error).message}`);
    }

    // Interleave Spotify and SoundCloud results with high precision
    const interleaved: SpotifyTrackDto[] = [];
    const seenTitles = new Set<string>();
    if (cleanTitle) seenTitles.add(cleanTitle.toLowerCase());

    const maxItems = Math.max(spotifyTracks.length, soundCloudTracks.length);
    for (let i = 0; i < maxItems; i++) {
      if (i < spotifyTracks.length) {
        const sp = spotifyTracks[i];
        const normTitle = sp.title.toLowerCase().trim();
        if (!seenTitles.has(normTitle) && !historyIds.includes(sp.id)) {
          seenTitles.add(normTitle);
          interleaved.push({ ...sp, source: 'spotify' });
        }
      }
      if (i < soundCloudTracks.length) {
        const sc = soundCloudTracks[i];
        const normTitle = sc.title.toLowerCase().trim();
        if (!seenTitles.has(normTitle) && !historyIds.includes(sc.id)) {
          seenTitles.add(normTitle);
          interleaved.push(sc);
        }
      }
      if (interleaved.length >= 10) break;
    }

    // Fallback: If both are empty, try detectedStyle directly on Spotify and SoundCloud
    if (interleaved.length === 0 && detectedStyle) {
      try {
        const appToken = await this.getAppToken();
        const fbUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(detectedStyle)}&type=track&limit=10`;
        const fbRes = await fetch(fbUrl, { headers: { Authorization: `Bearer ${appToken}` } });
        if (fbRes.ok) {
          const fbData = (await fbRes.json()) as SpotifySearchTracksResponse;
          const fbItems = fbData.tracks?.items;
          if (Array.isArray(fbItems)) {
            for (const item of fbItems) {
              const mapped = this.mapSpotifyTrack(item);
              if (mapped && mapped.id !== cleanId && !historyIds.includes(mapped.id)) {
                interleaved.push({ ...mapped, source: 'spotify' });
                if (interleaved.length >= 10) break;
              }
            }
          }
        }
      } catch {}
    }

    return {
      source: 'infinite-audio',
      tracks: interleaved.slice(0, 10),
      hasMore: interleaved.length >= 10,
    };
  }
}
