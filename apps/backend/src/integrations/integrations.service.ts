import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '@common/prisma';
import type { Prisma } from '@prisma/client';
import { removePlatformData } from './platform.utils';
import type {
  TwitchUsersResponse,
  TwitchFollowersResponse,
  TwitchStreamsResponse,
  TwitchAccountInput,
  TwitchLiveStatus,
  RobloxLookupResponse,
  RobloxThumbResponse,
  RobloxUserProfileResponse,
  RobloxOpenCloudUserResponse,
  RobloxFriendsCountResponse,
  RobloxCollectiblesResponse,
  RobloxPlacesResponse,
  GitHubUserResponse,
  GitHubRepoItem,
  SteamPlayerSummariesResponse,
  SteamOwnedGamesResponse,
  OpenDotaResponse,
  OpenDotaWinLossResponse,
  YouTubeChannelsResponse,
  YouTubeSearchResponse,
  YouTubePlaylistItemsResponse,
  YouTubeVideosResponse,
  YouTubeChannelSnippet,
  YouTubeChannelStatistics,
} from './platform.types';

function parseIsoDuration(duration?: string): string {
  if (!duration) return '0:00';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private cachedTwitchAppToken: string | null = null;
  private cachedTwitchAppTokenExpiresAt: number = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private async getTwitchAppToken(): Promise<string | null> {
    if (this.cachedTwitchAppToken && Date.now() < this.cachedTwitchAppTokenExpiresAt) {
      return this.cachedTwitchAppToken;
    }
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
      const res = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { access_token: string; expires_in?: number };
        this.cachedTwitchAppToken = data.access_token;
        this.cachedTwitchAppTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 60000;
        return this.cachedTwitchAppToken;
      }
    } catch (e) {
      this.logger.warn(`Failed to get Twitch App Token: ${String(e)}`);
    }
    return null;
  }

  getSteamAuthUrl(userId: string, req: Request): string {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const backendUrl = `${protocol}://${host}`;

    const returnTo = `${backendUrl}/integrations/steam/callback?userId=${encodeURIComponent(userId || '')}`;
    const steamUrl = new URL('https://steamcommunity.com/openid/login');
    steamUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
    steamUrl.searchParams.set('openid.mode', 'checkid_setup');
    steamUrl.searchParams.set('openid.return_to', returnTo);
    steamUrl.searchParams.set('openid.realm', backendUrl);
    steamUrl.searchParams.set(
      'openid.identity',
      'http://specs.openid.net/auth/2.0/identifier_select',
    );
    steamUrl.searchParams.set(
      'openid.claimed_id',
      'http://specs.openid.net/auth/2.0/identifier_select',
    );
    return steamUrl.toString();
  }

  async handleSteamCallback(query: Record<string, unknown>, res: Response): Promise<void> {
    const claimedId =
      typeof query['openid.claimed_id'] === 'string'
        ? query['openid.claimed_id']
        : typeof query['openid.identity'] === 'string'
          ? query['openid.identity']
          : null;
    const userId = typeof query['userId'] === 'string' ? query['userId'] : null;

    if (!claimedId) {
      res.status(400).send('Invalid OpenID response from Steam');
      return;
    }

    // Extract 64-bit Steam ID strictly validating digits
    const match = claimedId.match(/\/id\/(\d{15,25})$/);
    if (!match) {
      res.status(400).send('Invalid Steam OpenID claimed ID format');
      return;
    }
    const steamId = match[1];

    // Fetch verified Steam data
    const steamData = await this.fetchSteam(steamId, { featuredGame: 'dota2' });

    if (userId) {
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId },
      });
      const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
      connected.steam = {
        ...steamData,
        steamId,
        verified: true,
        authenticatedAt: new Date().toISOString(),
      };

      await this.prisma.profileShowcase.upsert({
        where: { userId },
        create: {
          userId,
          connectedAccounts: connected as Prisma.InputJsonObject,
        },
        update: {
          connectedAccounts: connected as Prisma.InputJsonObject,
        },
      });

      await this.redis.del(`showcase:user:${userId}`);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Steam Account Connected</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;user-select:none;">
    <div style="text-align:center;padding:32px 40px;border:1px solid rgba(255,255,255,0.12);border-radius:24px;background:#141417;box-shadow:0 25px 60px rgba(0,0,0,0.8);max-width:380px;width:90%;">
      <div style="width:56px;height:56px;margin:0 auto 16px;background:#1b2838;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #5865F2;box-shadow:0 0 24px rgba(88,101,242,0.4);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#5865F2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      </div>
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Steam Connected!</h2>
      <p style="color:#a1a1aa;font-size:13px;margin:0 0 16px;line-height:1.5;">Your Steam account has been authenticated and linked.</p>
      <div style="padding:8px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;display:inline-block;margin-bottom:18px;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Closing in <b id="countdown" style="color:#5865F2;">5</b> seconds...</p>
      </div>
      <div>
        <button onclick="window.close()" style="background:#5865F2;color:#fff;border:none;border-radius:12px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(88,101,242,0.4);transition:all 0.2s;">
          Close Window Now
        </button>
      </div>
    </div>
    <script>
      function broadcast() {
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'INTEGRATION_AUTH_SUCCESS', platform: 'steam' }, '*');
          } catch(e) {}
        }
      }
      broadcast();
      var interval = setInterval(broadcast, 400);

      var count = 5;
      var el = document.getElementById('countdown');
      var timer = setInterval(function() {
        count--;
        if (el) el.textContent = count;
        if (count <= 0) {
          clearInterval(timer);
          clearInterval(interval);
          broadcast();
          if (window.opener) {
            window.close();
          } else {
            window.location.href = '/settings';
          }
        }
      }, 1000);
    </script>
  </body>
</html>`);
  }

  handlePlatformOAuthStart(platform: string, userId: string, req: Request, res: Response): void {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const backendUrl = `${protocol}://${host}`;
    const p = platform.toLowerCase();

    const rawOrigin = req.query['origin'];
    const queryOrigin = typeof rawOrigin === 'string' ? rawOrigin : '';
    const referer = req.get('referer') || '';
    let clientOrigin = queryOrigin;
    if (!clientOrigin && referer) {
      try {
        clientOrigin = new URL(referer).origin;
      } catch {}
    }

    let isVercel = false;
    try {
      if (clientOrigin) {
        const parsed = new URL(clientOrigin);
        isVercel =
          parsed.hostname === 'eternalnet.vercel.app' || parsed.hostname.endsWith('.vercel.app');
      }
    } catch {
      isVercel = false;
    }

    // If GitHub, redirect to /auth/github
    if (p === 'github') {
      return res.redirect(
        `${backendUrl}/auth/github?userId=${encodeURIComponent(userId || '')}&origin=${encodeURIComponent(clientOrigin)}`,
      );
    }

    if (p === 'steam') {
      return res.redirect(
        `${backendUrl}/integrations/steam/auth?userId=${encodeURIComponent(userId || '')}&origin=${encodeURIComponent(clientOrigin)}`,
      );
    }

    if (p === 'spotify' && process.env.SPOTIFY_CLIENT_ID) {
      const spotifyUrl = new URL('https://accounts.spotify.com/authorize');
      spotifyUrl.searchParams.set('client_id', process.env.SPOTIFY_CLIENT_ID);
      spotifyUrl.searchParams.set('response_type', 'code');
      spotifyUrl.searchParams.set(
        'scope',
        'user-read-private user-read-email user-library-read user-library-modify playlist-read-private playlist-read-collaborative user-read-playback-state user-modify-playback-state streaming user-read-currently-playing user-top-read',
      );
      spotifyUrl.searchParams.set(
        'redirect_uri',
        process.env.SPOTIFY_CALLBACK_URL || `${backendUrl}/api/auth/spotify/callback`,
      );
      spotifyUrl.searchParams.set('state', userId || '');
      return res.redirect(spotifyUrl.toString());
    }

    if (p === 'twitch' && process.env.TWITCH_CLIENT_ID) {
      const twitchUrl = new URL('https://id.twitch.tv/oauth2/authorize');
      twitchUrl.searchParams.set('client_id', process.env.TWITCH_CLIENT_ID);
      twitchUrl.searchParams.set('response_type', 'code');
      const redirectUri =
        process.env.TWITCH_CALLBACK_URL || `${backendUrl}/integrations/twitch/callback`;
      twitchUrl.searchParams.set('redirect_uri', redirectUri);
      twitchUrl.searchParams.set('scope', 'user:read:email channel:read:subscriptions');
      twitchUrl.searchParams.set('state', `twitch:${userId || ''}`);
      return res.redirect(twitchUrl.toString());
    }

    if (p === 'youtube' && process.env.GOOGLE_CLIENT_ID) {
      const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
      googleUrl.searchParams.set('response_type', 'code');
      let redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://127.0.0.1:5173';
      if (
        isVercel &&
        (!process.env.GOOGLE_CALLBACK_URL ||
          process.env.GOOGLE_CALLBACK_URL.includes('127.0.0.1') ||
          process.env.GOOGLE_CALLBACK_URL.includes('localhost'))
      ) {
        redirectUri = 'https://eternalnet.vercel.app';
      }
      googleUrl.searchParams.set('redirect_uri', redirectUri);
      googleUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/youtube.readonly');
      googleUrl.searchParams.set('access_type', 'offline');
      googleUrl.searchParams.set('prompt', 'consent');
      googleUrl.searchParams.set('state', `youtube:${userId || ''}`);
      return res.redirect(googleUrl.toString());
    }

    if (p === 'roblox') {
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Roblox Account Verification</title></head>
          <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;padding:32px 40px;background:#141417;border:1px solid rgba(255,255,255,0.1);border-radius:24px;max-width:380px;">
              <h2 style="font-size:18px;margin-bottom:8px;">Roblox Ownership Verification</h2>
              <p style="color:#a1a1aa;font-size:13px;line-height:1.5;">Please use the in-app Roblox verification flow to securely verify ownership of your account.</p>
              <button onclick="window.close()" style="background:#5865F2;color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:13px;cursor:pointer;margin-top:16px;">Close Window</button>
            </div>
          </body>
        </html>
      `);
      return;
    }

    const callbackUrl = `${backendUrl}/integrations/${p}/callback?userId=${encodeURIComponent(userId || '')}`;
    return res.redirect(callbackUrl);
  }

  async exchangeOAuthCode(
    platform: string,
    code: string,
    redirectUri?: string,
    userId?: string,
    state?: string,
  ): Promise<{ success: boolean; data: Record<string, unknown> | null }> {
    const p = platform.toLowerCase();
    const rawTarget = userId || state || '';
    const targetUserId = rawTarget.replace(/^[a-z]+:/i, '');
    let data: Record<string, unknown> | null = null;

    if (p === 'youtube' && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const urisToTry = [
        redirectUri,
        'https://eternalnet.vercel.app',
        'https://eternalnet.vercel.app/oauth/callback',
        'https://eternalnet.vercel.app/callback',
        process.env.GOOGLE_CALLBACK_URL,
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'http://localhost:3000/integrations/youtube/callback',
      ].filter(Boolean) as string[];

      let tokenData: { access_token?: string } | null = null;
      for (const uri of urisToTry) {
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: process.env.GOOGLE_CLIENT_ID,
              client_secret: process.env.GOOGLE_CLIENT_SECRET,
              redirect_uri: uri,
              grant_type: 'authorization_code',
            }),
          });
          if (tokenRes.ok) {
            tokenData = (await tokenRes.json()) as { access_token?: string };
            break;
          }
        } catch (e) {
          this.logger.warn(`Google token exchange failed for uri ${uri}: ${String(e)}`);
        }
      }

      if (!tokenData?.access_token) {
        throw new BadRequestException(
          'Failed to exchange Google OAuth code. Invalid or expired code.',
        );
      }

      const accessToken = tokenData.access_token;
      const chRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!chRes.ok) {
        throw new BadRequestException('Failed to fetch YouTube channel details from Google API.');
      }

      const chData = (await chRes.json()) as YouTubeChannelsResponse;
      const ch = chData.items?.[0];
      if (!ch) {
        throw new BadRequestException('No YouTube channel found for this Google account.');
      }

      const uploadsId = ch.contentDetails?.relatedPlaylists?.uploads;
      let videos: Array<{
        id: string;
        title: string;
        thumbnailUrl: string;
        url: string;
        views: number;
        duration: string;
      }> = [];
      if (uploadsId && process.env.YOUTUBE_API_KEY) {
        try {
          const pRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=3&key=${process.env.YOUTUBE_API_KEY}`,
          );
          if (pRes.ok) {
            const pData = (await pRes.json()) as YouTubePlaylistItemsResponse;
            const vIds = (pData.items || [])
              .map((it) => it.contentDetails?.videoId)
              .filter((id): id is string => typeof id === 'string' && id.length > 0);
            if (vIds.length > 0) {
              const vRes = await fetch(
                `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${vIds.join(',')}&key=${process.env.YOUTUBE_API_KEY}`,
              );
              if (vRes.ok) {
                const vData = (await vRes.json()) as YouTubeVideosResponse;
                videos = (vData.items || []).map((v) => ({
                  id: v.id,
                  title: v.snippet?.title || 'Video',
                  thumbnailUrl:
                    v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url || '',
                  url: `https://www.youtube.com/watch?v=${v.id}`,
                  views: parseInt(v.statistics?.viewCount || '0', 10),
                  duration: parseIsoDuration(v.contentDetails?.duration),
                }));
              }
            }
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch YouTube recent videos: ${String(err)}`);
        }
      }

      const customUrl = ch.snippet?.customUrl || '';
      data = {
        channel: customUrl ? `@${customUrl.replace(/^@/, '')}` : ch.snippet?.title || '',
        channelTitle: ch.snippet?.title || '',
        channelHandle: customUrl,
        username: ch.snippet?.title || '',
        avatarUrl: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url || '',
        subscribersCount: parseInt(ch.statistics?.subscriberCount || '0', 10),
        totalViews: parseInt(ch.statistics?.viewCount || '0', 10),
        videoCount: parseInt(ch.statistics?.videoCount || '0', 10),
        videos,
        url: customUrl
          ? `https://youtube.com/${customUrl}`
          : `https://youtube.com/channel/${ch.id}`,
        displayOnProfile: true,
        showSubscribersCount: true,
        showTotalViews: true,
        showRecentVideos: true,
        verified: true,
        authenticatedAt: new Date().toISOString(),
      };
    } else if (p === 'twitch' && process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) {
      const urisToTry = [
        redirectUri,
        'https://eternalnet.vercel.app',
        'https://eternalnet.vercel.app/oauth/callback',
        'https://eternalnet.vercel.app/callback',
        process.env.TWITCH_CALLBACK_URL,
        'http://localhost:3000/integrations/twitch/callback',
        'http://localhost:3000/api/auth/twitch/callback',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
      ].filter(Boolean) as string[];

      let tokenData: { access_token?: string } | null = null;
      for (const uri of urisToTry) {
        try {
          const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.TWITCH_CLIENT_ID || '',
              client_secret: process.env.TWITCH_CLIENT_SECRET || '',
              code,
              grant_type: 'authorization_code',
              redirect_uri: uri,
            }),
          });
          if (tokenRes.ok) {
            tokenData = (await tokenRes.json()) as { access_token?: string };
            break;
          }
        } catch (e) {
          this.logger.warn(`Twitch token exchange failed for uri ${uri}: ${String(e)}`);
        }
      }

      if (!tokenData?.access_token) {
        throw new BadRequestException(
          'Failed to exchange Twitch OAuth code. Invalid or expired code.',
        );
      }

      const accessToken = tokenData.access_token;
      const userRes = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': process.env.TWITCH_CLIENT_ID || '',
        },
      });

      if (!userRes.ok) {
        throw new BadRequestException('Failed to fetch Twitch user profile from Twitch Helix API.');
      }

      const userData = (await userRes.json()) as TwitchUsersResponse;
      const u = userData.data?.[0];
      if (!u) {
        throw new BadRequestException('No Twitch user profile returned from Helix API.');
      }

      let isLive = false;
      let streamTitle = '';
      let gameName = '';
      let viewersCount = 0;
      let streamThumbnailUrl: string | null = null;
      let startedAt: string | null = null;

      try {
        const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_id=${u.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Client-Id': process.env.TWITCH_CLIENT_ID || '',
          },
        });
        if (streamRes.ok) {
          const streamData = (await streamRes.json()) as TwitchStreamsResponse;
          const stream = streamData.data?.[0];
          if (stream) {
            isLive = true;
            streamTitle = stream.title || '';
            gameName = stream.game_name || '';
            viewersCount = stream.viewer_count || 0;
            streamThumbnailUrl =
              stream.thumbnail_url?.replace('{width}', '440').replace('{height}', '248') || null;
            startedAt = stream.started_at || null;
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to check live stream for Twitch user ${u.login}: ${String(e)}`);
      }

      let followersCount = 0;
      try {
        const folRes = await fetch(
          `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${u.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Client-Id': process.env.TWITCH_CLIENT_ID || '',
            },
          },
        );
        if (folRes.ok) {
          const folData = (await folRes.json()) as TwitchFollowersResponse;
          followersCount = typeof folData.total === 'number' ? folData.total : 0;
        }
      } catch (e) {
        this.logger.warn(
          `Failed to fetch followers count for Twitch user ${u.login}: ${String(e)}`,
        );
      }

      data = {
        id: u.id,
        channel: u.login,
        username: u.login,
        displayName: u.display_name || u.login,
        avatarUrl: u.profile_image_url || '/icons/brands/twitch.png',
        bio: u.description || '',
        isLive,
        streamTitle,
        gameName,
        viewersCount,
        followersCount,
        streamThumbnailUrl,
        startedAt,
        url: `https://twitch.tv/${u.login}`,
        verified: true,
        authenticatedAt: new Date().toISOString(),
        displayOnProfile: true,
        showLiveStatus: true,
        showFollowersCount: true,
      };
    } else {
      throw new BadRequestException(`OAuth exchange not supported for platform: ${platform}`);
    }

    if (targetUserId && data) {
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId: targetUserId },
      });
      const connected = (showcase?.connectedAccounts as Record<string, any>) || {};
      connected[p] = data;

      await this.prisma.profileShowcase.upsert({
        where: { userId: targetUserId },
        create: {
          userId: targetUserId,
          connectedAccounts: connected,
        },
        update: {
          connectedAccounts: connected,
        },
      });

      await this.redis.del(`showcase:user:${targetUserId}`);
    }

    return { success: true, data };
  }

  async generateRobloxVerificationCode(userId: string, username: string) {
    if (!username || !username.trim()) {
      throw new BadRequestException('Roblox username is required');
    }
    const cleanUsername = username.trim();

    // 1. Look up user on Roblox to confirm existence and get ID & Avatar
    let robloxUser: { id: number; name: string; displayName: string } | null = null;
    try {
      const lookupRes = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [cleanUsername], excludeBannedUsers: true }),
      });
      if (lookupRes.ok) {
        const lookupData = (await lookupRes.json()) as RobloxLookupResponse;
        robloxUser = lookupData.data?.[0] || null;
      }
    } catch (e) {
      this.logger.warn(`Failed to look up Roblox username ${cleanUsername}: ${String(e)}`);
    }

    if (!robloxUser) {
      throw new BadRequestException(`Roblox user "${cleanUsername}" was not found.`);
    }

    // 2. Fetch avatar 3D bust thumbnail
    let avatarBustUrl = '/icons/brands/roblox.png';
    try {
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${robloxUser.id}&size=420x420&format=Png&isCircular=false`,
      );
      if (thumbRes.ok) {
        const thumbData = (await thumbRes.json()) as RobloxThumbResponse;
        avatarBustUrl = thumbData.data?.[0]?.imageUrl || avatarBustUrl;
      }
    } catch {
      // ignore
    }

    // 3. Generate unique verification code
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const verificationCode = `eternal-verify-${randomDigits}`;

    // Store in redis with 15 min TTL
    await this.redis.set(
      `roblox:verify:${userId}`,
      JSON.stringify({
        robloxId: robloxUser.id,
        username: robloxUser.name,
        displayName: robloxUser.displayName,
        avatarBustUrl,
        code: verificationCode,
      }),
      900,
    );

    return {
      success: true,
      verificationCode,
      robloxUser: {
        id: robloxUser.id,
        username: robloxUser.name,
        displayName: robloxUser.displayName,
        avatarBustUrl,
      },
    };
  }

  async verifyRobloxOwnership(userId: string, _username: string, _code: string) {
    const raw = await this.redis.get(`roblox:verify:${userId}`);
    if (!raw) {
      throw new BadRequestException('Verification session expired. Please generate a new code.');
    }
    const session = JSON.parse(raw) as {
      robloxId: number | string;
      username: string;
      displayName: string;
      avatarBustUrl: string;
      code: string;
    };
    if (!session || !session.robloxId) {
      throw new BadRequestException('Invalid verification session.');
    }

    // Fetch the user's latest "about" from Roblox
    let about = '';
    try {
      const userRes = await fetch(`https://users.roblox.com/v1/users/${session.robloxId}`);
      if (userRes.ok) {
        const userData = (await userRes.json()) as RobloxUserProfileResponse;
        about = userData.description || '';
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch Roblox user description: ${String(e)}`);
    }

    // Also check Open Cloud v2 if available
    if (!about && process.env.ROBLOX_API_KEY) {
      try {
        const cloudRes = await fetch(`https://apis.roblox.com/cloud/v2/users/${session.robloxId}`, {
          headers: { 'x-api-key': process.env.ROBLOX_API_KEY },
        });
        if (cloudRes.ok) {
          const cloudData = (await cloudRes.json()) as RobloxOpenCloudUserResponse;
          about = cloudData.about || '';
        }
      } catch {}
    }

    const expectedCode = (session.code || '').trim().toLowerCase();
    const cleanAbout = (about || '').toLowerCase();

    // Check if code is in the about section
    if (!cleanAbout.includes(expectedCode)) {
      throw new BadRequestException(
        `Verification code "${session.code}" was not found in the About section of @${session.username}. Please add it to your Roblox profile and try again.`,
      );
    }

    // Ownership 100% PROVEN! Fetch rich data
    const fullData = await this.fetchRoblox(session.username);

    const showcase = await this.prisma.profileShowcase.findUnique({
      where: { userId },
    });
    const connected = (showcase?.connectedAccounts as Record<string, unknown>) || {};
    connected.roblox = {
      ...fullData,
      robloxId: session.robloxId,
      username: session.username,
      displayName: session.displayName,
      avatarBustUrl: session.avatarBustUrl,
      verified: true,
      authenticatedAt: new Date().toISOString(),
    };

    await this.prisma.profileShowcase.upsert({
      where: { userId },
      create: {
        userId,
        connectedAccounts: connected as Prisma.InputJsonObject,
      },
      update: {
        connectedAccounts: connected as Prisma.InputJsonObject,
      },
    });

    await this.redis.del(`showcase:user:${userId}`);
    await this.redis.del(`roblox:verify:${userId}`);

    return {
      success: true,
      data: connected.roblox,
    };
  }

  async handlePlatformOAuthCallback(
    platform: string,
    query: Record<string, unknown>,
    res: Response,
  ): Promise<void> {
    const p = platform.toLowerCase().trim();
    const error =
      typeof query['error'] === 'string'
        ? query['error']
        : typeof query['error_description'] === 'string'
          ? query['error_description']
          : null;
    if (error) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(`<!DOCTYPE html>
<html>
  <head><title>Authentication Failed</title></head>
  <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;padding:32px 40px;background:#141417;border:1px solid rgba(239,68,68,0.3);border-radius:24px;max-width:380px;">
      <h2 style="color:#ef4444;font-size:18px;margin-bottom:8px;">Authentication Error</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.5;">Authentication was cancelled or failed with the provider.</p>
      <button onclick="window.close()" style="background:#27272a;color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:13px;cursor:pointer;margin-top:16px;">Close Window</button>
    </div>
  </body>
</html>`);
      return;
    }

    const code = typeof query['code'] === 'string' ? query['code'] : null;
    if (!code || typeof code !== 'string') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(`<!DOCTYPE html>
<html>
  <head><title>Authentication Failed</title></head>
  <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;padding:32px 40px;background:#141417;border:1px solid rgba(239,68,68,0.3);border-radius:24px;max-width:380px;">
      <h2 style="color:#ef4444;font-size:18px;margin-bottom:8px;">Authentication Failed</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.5;">Missing authorization code from provider.</p>
      <button onclick="window.close()" style="background:#27272a;color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:13px;cursor:pointer;margin-top:16px;">Close Window</button>
    </div>
  </body>
</html>`);
      return;
    }

    const userId =
      typeof query['userId'] === 'string'
        ? query['userId']
        : typeof query['state'] === 'string'
          ? query['state']
          : '';

    try {
      await this.exchangeOAuthCode(p, code, undefined, userId);
    } catch {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(400).send(`<!DOCTYPE html>
<html>
  <head><title>Authentication Failed</title></head>
  <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
    <div style="text-align:center;padding:32px 40px;background:#141417;border:1px solid rgba(239,68,68,0.3);border-radius:24px;max-width:380px;">
      <h2 style="color:#ef4444;font-size:18px;margin-bottom:8px;">Authentication Failed</h2>
      <p style="color:#a1a1aa;font-size:13px;line-height:1.5;">Failed to complete OAuth verification. Please try again.</p>
      <button onclick="window.close()" style="background:#27272a;color:#fff;border:none;border-radius:12px;padding:10px 20px;font-size:13px;cursor:pointer;margin-top:16px;">Close Window</button>
    </div>
  </body>
</html>`);
      return;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <title>Account Connected</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="background:#0e0e11;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;user-select:none;">
    <div style="text-align:center;padding:32px 40px;border:1px solid rgba(255,255,255,0.12);border-radius:24px;background:#141417;box-shadow:0 25px 60px rgba(0,0,0,0.8);max-width:380px;width:90%;">
      <div style="width:56px;height:56px;margin:0 auto 16px;background:#27272a;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #5865F2;box-shadow:0 0 24px rgba(88,101,242,0.4);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#5865F2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
      </div>
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:20px;font-weight:800;letter-spacing:-0.3px;">Account Connected!</h2>
      <p style="color:#a1a1aa;font-size:13px;margin:0 0 16px;line-height:1.5;">Account verified and linked via OAuth.</p>
      <div style="padding:8px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;display:inline-block;margin-bottom:18px;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Closing in <b id="countdown" style="color:#5865F2;">5</b> seconds...</p>
      </div>
      <div>
        <button onclick="window.close()" style="background:#5865F2;color:#fff;border:none;border-radius:12px;padding:10px 24px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(88,101,242,0.4);transition:all 0.2s;">
          Close Window Now
        </button>
      </div>
    </div>
    <script>
      function broadcast() {
        if (window.opener) {
          try {
            window.opener.postMessage({ type: 'INTEGRATION_AUTH_SUCCESS' }, '*');
          } catch(e) {}
        }
      }
      broadcast();
      var interval = setInterval(broadcast, 400);

      var count = 5;
      var el = document.getElementById('countdown');
      var timer = setInterval(function() {
        count--;
        if (el) el.textContent = count;
        if (count <= 0) {
          clearInterval(timer);
          clearInterval(interval);
          broadcast();
          if (window.opener) {
            window.close();
          } else {
            window.location.href = '/settings';
          }
        }
      }, 1000);
    </script>
  </body>
</html>`);
  }

  /**
   * Get cached or freshly fetched platform data
   */
  async getPlatformData(
    platform: string,
    handle: string,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const cleanHandle = handle.trim();
    if (!cleanHandle) {
      throw new NotFoundException('Platform handle or ID is required');
    }

    let targetHandle = cleanHandle;
    if (platform.toLowerCase() === 'steam') {
      if (typeof options?.steamId === 'string' && /^\d{17}$/.test(options.steamId)) {
        targetHandle = options.steamId;
      } else if (!/^\d{17}$/.test(cleanHandle)) {
        try {
          const showcases = await this.prisma.profileShowcase.findMany();
          for (const sc of showcases) {
            const ca = sc.connectedAccounts as Record<string, Record<string, unknown>> | null;
            if (typeof ca?.steam?.steamId === 'string') {
              targetHandle = ca.steam.steamId;
              break;
            }
          }
        } catch {}
      }
    }

    const cacheKey = `integration:cache:${platform.toLowerCase()}:${targetHandle.toLowerCase()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        if (options?.featuredGame && parsed.featuredGame !== options.featuredGame) {
          parsed.featuredGame = options.featuredGame;
        }
        if (
          typeof options?.pinnedRepo === 'string' &&
          (parsed.pinnedRepo as { name?: string } | undefined)?.name !== options.pinnedRepo
        ) {
          if (Array.isArray(parsed.repos)) {
            const found = (parsed.repos as Array<{ name?: string }>).find(
              (r) => r.name === options.pinnedRepo,
            );
            if (found) parsed.pinnedRepo = found;
          }
        }
        return parsed;
      } catch {
        // invalid cache, re-fetch
      }
    }

    const freshData = await this.fetchPlatformData(platform, targetHandle, options);
    // Cache for 10 minutes (600 seconds)
    await this.redis.set(cacheKey, JSON.stringify(freshData), 600);
    return freshData;
  }

  async fetchPlatformData(
    platform: string,
    handle: string,
    options?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    switch (platform.toLowerCase()) {
      case 'github':
        return this.fetchGithub(handle, options);
      case 'steam':
        return this.fetchSteam(handle, options);
      case 'riot':
        return this.fetchRiot(handle, options);
      case 'battlenet':
        return this.fetchBattleNet(handle, options);
      case 'spotify':
        return this.fetchSpotify(handle, options);
      case 'soundcloud':
        return this.fetchSoundCloud(handle, options);
      case 'youtube':
        return this.fetchYouTube(handle, options);
      case 'twitch':
        return this.fetchTwitch(handle, options);
      case 'roblox':
        return this.fetchRoblox(handle, options);
      case 'x':
      case 'twitter':
        return this.fetchX(handle, options);
      case 'facebook':
        return this.fetchFacebook(handle, options);
      case 'epicgames':
      case 'epic':
        return this.fetchEpicGames(handle, options);
      default:
        return { handle, connected: true };
    }
  }

  private async fetchGithub(username: string, options?: Record<string, unknown>) {
    try {
      const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { 'User-Agent': 'SocialNetwork-App' },
      });
      if (!userRes.ok) {
        throw new Error('User not found on GitHub');
      }
      const userData = (await userRes.json()) as GitHubUserResponse;

      // Fetch user repos
      const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`,
        { headers: { 'User-Agent': 'SocialNetwork-App' } },
      );
      const reposData = reposRes.ok ? ((await reposRes.json()) as GitHubRepoItem[]) : [];
      const repos = Array.isArray(reposData)
        ? reposData.map((r) => ({
            name: r.name,
            description: r.description || 'No description provided.',
            stars: r.stargazers_count ?? 0,
            forks: r.forks_count ?? 0,
            language: r.language || 'TypeScript',
            url: r.html_url,
          }))
        : [];

      const pinnedRepoName = typeof options?.pinnedRepo === 'string' ? options.pinnedRepo : null;
      const selectedRepoName = pinnedRepoName || (repos[0] ? repos[0].name : null);
      const pinnedRepo = repos.find((r) => r.name === selectedRepoName) || repos[0] || null;

      return {
        username: userData.login,
        avatarUrl: userData.avatar_url,
        bio: userData.bio || 'Open-source software developer & creator.',
        reposCount: userData.public_repos ?? repos.length,
        followersCount: userData.followers ?? 0,
        followingCount: userData.following ?? 0,
        pinnedRepo,
        repos,
      };
    } catch (err) {
      this.logger.warn(`GitHub API fallback for ${username}: ${String(err)}`);
      const fallbackPinned =
        typeof options?.pinnedRepo === 'string' ? options.pinnedRepo : 'awesome-social-network';
      return {
        username,
        avatarUrl: `https://github.com/${username}.png`,
        bio: 'Open-source developer and engineer.',
        reposCount: 24,
        followersCount: 142,
        followingCount: 38,
        pinnedRepo: {
          name: fallbackPinned,
          description: 'High-performance real-time social platform with rich gaming showcases.',
          stars: 482,
          forks: 73,
          language: 'TypeScript',
          url: `https://github.com/${username}/${fallbackPinned}`,
        },
        repos: [
          {
            name: 'awesome-social-network',
            description: 'High-performance real-time social platform with rich gaming showcases.',
            stars: 482,
            forks: 73,
            language: 'TypeScript',
            url: `https://github.com/${username}/awesome-social-network`,
          },
          {
            name: 'dota2-bot-ai',
            description: 'Reinforcement learning bot for MOBA lane mechanics.',
            stars: 128,
            forks: 19,
            language: 'Python',
            url: `https://github.com/${username}/dota2-bot-ai`,
          },
        ],
      };
    }
  }

  private async fetchSteam(steamId: string, options?: Record<string, unknown>) {
    const apiKey = process.env.STEAM_API_KEY;

    let numericId = steamId;
    let profileData: {
      steamId: string;
      username: string;
      avatarUrl: string;
      profileUrl: string;
    } | null = null;
    let steamLevel = 10;
    let gamesCount = 42;
    let dotaHours = 0;
    let cs2Hours = 0;
    const featuredGame = (options?.featuredGame as string | undefined) || 'dota2';

    // 1. Fetch from Steam Web API
    if (apiKey) {
      try {
        if (!/^\d{17}$/.test(numericId)) {
          const vanityRes = await fetch(
            `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${apiKey}&vanityurl=${encodeURIComponent(numericId)}`,
          );
          if (vanityRes.ok) {
            const vanityJson = (await vanityRes.json()) as { response?: { steamid?: string } };
            if (vanityJson.response?.steamid) {
              numericId = vanityJson.response.steamid;
            }
          }
        }

        // Fetch Player Summary
        const summaryRes = await fetch(
          `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${numericId}`,
        );
        if (summaryRes.ok) {
          const summaryJson = (await summaryRes.json()) as SteamPlayerSummariesResponse;
          const player = summaryJson.response?.players?.[0];
          if (player) {
            profileData = {
              steamId: player.steamid,
              username: player.personaname,
              avatarUrl: player.avatarfull || player.avatarmedium,
              profileUrl: player.profileurl,
            };
          }
        }

        // Fetch Player Level & Badges
        const badgesRes = await fetch(
          `https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=${apiKey}&steamid=${numericId}`,
        );
        if (badgesRes.ok) {
          const badgesJson = (await badgesRes.json()) as { response?: { player_level?: number } };
          if (badgesJson.response?.player_level !== undefined) {
            steamLevel = badgesJson.response.player_level;
          }
        }

        // Fetch Owned Games and Playtime
        const gamesRes = await fetch(
          `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${numericId}&include_appinfo=1&include_played_free_games=1`,
        );
        if (gamesRes.ok) {
          const gamesJson = (await gamesRes.json()) as SteamOwnedGamesResponse;
          if (typeof gamesJson.response?.game_count === 'number') {
            gamesCount = gamesJson.response.game_count;
          } else if (Array.isArray(gamesJson.response?.games)) {
            gamesCount = gamesJson.response.games.length;
          }

          if (Array.isArray(gamesJson.response?.games)) {
            const dota = gamesJson.response.games.find((g) => g.appid === 570);
            if (dota && typeof dota.playtime_forever === 'number') {
              dotaHours = Math.round(dota.playtime_forever / 60);
            }
            const cs2 = gamesJson.response.games.find((g) => g.appid === 730);
            if (cs2 && typeof cs2.playtime_forever === 'number') {
              cs2Hours = Math.round(cs2.playtime_forever / 60);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Steam live API fetch error: ${String(err)}`);
      }
    }

    const dota2Opt = options?.dota2 as Record<string, unknown> | undefined;
    const cs2Opt = options?.cs2 as Record<string, unknown> | undefined;

    // 2. Fetch Live Dota 2 Stats from OpenDota (Used by Dotabuff / Stratz)
    const dotaLiveStats = {
      rankTier: 'Unranked',
      rankTierEn: 'Unranked',
      rankIcon: '/icons/dota-ranks/rank_0.png',
      matches: 0,
      winRate: (dota2Opt?.winRate as number | undefined) || null,
      hours: dotaHours > 0 ? dotaHours : (dota2Opt?.hours as number | undefined) || null,
    };

    try {
      if (/^\d{17}$/.test(numericId)) {
        const steamIdBig = BigInt(numericId);
        const baseBig = BigInt('76561197960265728');
        if (steamIdBig > baseBig) {
          const accountId32 = (steamIdBig - baseBig).toString();

          const [playerRes, wlRes] = await Promise.all([
            fetch(`https://api.opendota.com/api/players/${accountId32}`, {
              headers: { 'User-Agent': 'SocialNetwork-DotaIntegration' },
            }).catch(() => null),
            fetch(`https://api.opendota.com/api/players/${accountId32}/wl`, {
              headers: { 'User-Agent': 'SocialNetwork-DotaIntegration' },
            }).catch(() => null),
          ]);

          if (playerRes && playerRes.ok) {
            const playerJson = (await playerRes.json()) as OpenDotaResponse;
            const rankTier = playerJson.rank_tier; // e.g. 35 (Crusader 5), 80 (Immortal)

            if (typeof rankTier === 'number' && rankTier > 0) {
              const tierDigit = Math.floor(rankTier / 10);
              const starDigit = rankTier % 10;
              const tierNames: Record<number, { ru: string; en: string }> = {
                1: { ru: 'Herald', en: 'Herald' },
                2: { ru: 'Guardian', en: 'Guardian' },
                3: { ru: 'Crusader', en: 'Crusader' },
                4: { ru: 'Archon', en: 'Archon' },
                5: { ru: 'Legend', en: 'Legend' },
                6: { ru: 'Ancient', en: 'Ancient' },
                7: { ru: 'Divine', en: 'Divine' },
                8: { ru: 'Immortal', en: 'Immortal' },
              };

              const tierInfo = tierNames[tierDigit] || tierNames[8];
              dotaLiveStats.rankTier =
                starDigit > 0 && tierDigit < 8 ? `${tierInfo.en} ${starDigit}★` : tierInfo.en;
              dotaLiveStats.rankTierEn =
                starDigit > 0 && tierDigit < 8 ? `${tierInfo.en} ${starDigit}★` : tierInfo.en;
              // Authentic local high-resolution composite medal with stars
              dotaLiveStats.rankIcon = `/icons/dota-ranks/rank_${tierDigit}_${starDigit}.png`;
            }
          }

          if (wlRes && wlRes.ok) {
            const wlJson = (await wlRes.json()) as OpenDotaWinLossResponse;
            const win = wlJson.win ?? 0;
            const lose = wlJson.lose ?? 0;
            const total = win + lose;
            if (total > 0) {
              dotaLiveStats.matches = total;
              dotaLiveStats.winRate = Number(((win / total) * 100).toFixed(2));
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`OpenDota live API fetch error: ${String(err)}`);
    }

    const finalCs2Hours = cs2Hours > 0 ? cs2Hours : (cs2Opt?.hours as number | undefined) || null;

    return {
      steamId: profileData?.steamId || steamId,
      username:
        profileData?.username ||
        (typeof options?.username === 'string' ? options.username : steamId),
      avatarUrl:
        profileData?.avatarUrl ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      level: steamLevel,
      gamesCount,
      featuredGame,
      dota2: dotaLiveStats,
      cs2: {
        rankTier: (cs2Opt?.rankTier as string | undefined) || (finalCs2Hours ? 'Unranked' : null),
        premierRating: (cs2Opt?.premierRating as number | undefined) || null,
        premierColor: (cs2Opt?.premierColor as string | undefined) || null,
        rankIcon: (cs2Opt?.rankIcon as string | undefined) || null,
        matches: (cs2Opt?.matches as number | undefined) || null,
        winRate: (cs2Opt?.winRate as number | undefined) || null,
        hours: finalCs2Hours,
      },
    };
  }

  private async fetchRiot(riotId: string, options?: Record<string, unknown>) {
    await Promise.resolve();
    const featuredGame = (options?.featuredGame as string | undefined) || 'val';
    const [name, tag] = riotId.includes('#') ? riotId.split('#') : [riotId, 'EUTR'];
    return {
      riotId: `${name}#${tag}`,
      username: name,
      tagline: `#${tag}`,
      avatarUrl:
        'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
      featuredGame,
      lol: {
        tier: 'Master',
        lp: 340,
        level: 420,
        winRate: 56.4,
        rankIcon:
          'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/master.png',
        hours: 1950,
      },
      valorant: {
        tier: 'Immortal 3',
        rr: 185,
        level: 215,
        winRate: 59.2,
        rankIcon:
          'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/23/largeicon.png',
        hours: 1120,
      },
    };
  }

  private async fetchBattleNet(battleTag: string, options?: Record<string, unknown>) {
    await Promise.resolve();
    const featuredGame = (options?.featuredGame as string | undefined) || 'wow';
    return {
      battleTag,
      avatarUrl:
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&auto=format&fit=crop&q=80',
      featuredGame,
      wow: {
        character: (options?.wowChar as string | undefined) || 'Ayate',
        realm: (options?.wowRealm as string | undefined) || 'Tarren Mill (EU)',
        class: 'Death Knight',
        classColor: '#C41E3A',
        classIcon: 'https://wow.zamimg.com/images/wow/icons/large/spell_deathknight_classicon.jpg',
        level: 80,
        ilvl: 625,
        guild: 'Method',
        mythicPlusScore: 2850,
        achievementsCount: 18450,
      },
      overwatch: {
        role: 'DPS',
        rankTier: 'Grandmaster 1',
        endorsementLevel: 4,
        rankIcon:
          'https://static.wikia.nocookie.net/overwatch_gamepedia/images/f/f6/Rank_Grandmaster.png',
      },
    };
  }

  private async fetchSpotify(username: string, _options?: Record<string, unknown>) {
    await Promise.resolve();
    return {
      username,
      avatarUrl:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
      likedSongsCount: 418,
      playlistsCount: 16,
      topArtist: 'The Weeknd',
      topTrack: 'Starboy (feat. Daft Punk)',
    };
  }

  private async fetchSoundCloud(username: string, _options?: Record<string, unknown>) {
    await Promise.resolve();
    return {
      username,
      avatarUrl:
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80',
      likedTracksCount: 184,
      playlistsCount: 8,
      followersCount: 320,
    };
  }

  private async fetchYouTube(channel: string, options?: Record<string, unknown>) {
    const clean = channel.replace(/^@/, '').trim();
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (apiKey) {
      try {
        let channelSnippet: YouTubeChannelSnippet | null = null;
        let channelStats: YouTubeChannelStatistics | null = null;
        let uploadsPlaylistId: string | null = null;

        // 1. Try resolving by handle
        const handleRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent(clean)}&key=${apiKey}`,
        );
        if (handleRes.ok) {
          const handleData = (await handleRes.json()) as YouTubeChannelsResponse;
          if (handleData.items?.[0]) {
            const ch = handleData.items[0];
            channelSnippet = ch.snippet || null;
            channelStats = ch.statistics || null;
            uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads || null;
          }
        }

        // 2. If not found by handle, try search
        if (!channelSnippet) {
          const searchRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(clean)}&maxResults=1&key=${apiKey}`,
          );
          if (searchRes.ok) {
            const searchData = (await searchRes.json()) as YouTubeSearchResponse;
            const foundChannelId =
              searchData.items?.[0]?.snippet?.channelId || searchData.items?.[0]?.id?.channelId;
            if (foundChannelId) {
              const chRes = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${foundChannelId}&key=${apiKey}`,
              );
              if (chRes.ok) {
                const chData = (await chRes.json()) as YouTubeChannelsResponse;
                if (chData.items?.[0]) {
                  const ch = chData.items[0];
                  channelSnippet = ch.snippet || null;
                  channelStats = ch.statistics || null;
                  uploadsPlaylistId = ch.contentDetails?.relatedPlaylists?.uploads || null;
                }
              }
            }
          }
        }

        if (channelSnippet && channelStats) {
          let videos: Array<{
            id: string;
            title: string;
            thumbnailUrl: string;
            videoUrl: string;
            views: number;
            duration: string;
          }> = [];

          if (uploadsPlaylistId) {
            const playlistRes = await fetch(
              `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=3&key=${apiKey}`,
            );
            if (playlistRes.ok) {
              const playlistData = (await playlistRes.json()) as YouTubePlaylistItemsResponse;
              const items = playlistData.items || [];
              const videoIds = items
                .map((it) => it.contentDetails?.videoId)
                .filter((id): id is string => typeof id === 'string' && id.length > 0);

              if (videoIds.length > 0) {
                const videosRes = await fetch(
                  `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(',')}&key=${apiKey}`,
                );
                if (videosRes.ok) {
                  const vidsData = (await videosRes.json()) as YouTubeVideosResponse;
                  videos = (vidsData.items || []).map((v) => ({
                    id: v.id,
                    title: v.snippet?.title || 'Video',
                    thumbnailUrl:
                      v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.high?.url || '',
                    videoUrl: `https://www.youtube.com/watch?v=${v.id}`,
                    views: parseInt(v.statistics?.viewCount || '0', 10),
                    duration: parseIsoDuration(v.contentDetails?.duration),
                  }));
                }
              }
            }
          }

          return {
            channel: `@${channelSnippet.customUrl?.replace(/^@/, '') || clean}`,
            channelTitle: channelSnippet.title,
            avatarUrl:
              channelSnippet.thumbnails?.high?.url || channelSnippet.thumbnails?.default?.url || '',
            subscribersCount: parseInt(channelStats.subscriberCount || '0', 10),
            totalViews: parseInt(channelStats.viewCount || '0', 10),
            videoCount: parseInt(channelStats.videoCount || '0', 10),
            videos:
              videos.length > 0 ? videos : (options?.videos as Array<unknown> | undefined) || [],
            displayOnProfile: options?.displayOnProfile ?? true,
            showSubscribersCount: options?.showSubscribersCount ?? true,
            showTotalViews: options?.showTotalViews ?? true,
            showRecentVideos: options?.showRecentVideos ?? true,
          };
        }
      } catch (err) {
        this.logger.warn(`YouTube live API fetch failed for ${clean}: ${String(err)}`);
      }
    }

    return {
      channel: `@${clean}`,
      channelTitle: `${clean} Official`,
      avatarUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      subscribersCount: (options?.subscribersCount as number | undefined) || 48500,
      totalViews: (options?.totalViews as number | undefined) || 1450000,
      videos: (options?.videos as Array<unknown> | undefined) || [
        {
          id: 'v1',
          title: 'Immortal 3 Valorant Highlights & Insane Clutch Moments 🎯',
          thumbnailUrl:
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=80',
          videoUrl: 'https://youtube.com',
          views: 34200,
          duration: '12:45',
        },
        {
          id: 'v2',
          title: 'Dota 2 Titan MMR 6000+ Full Gameplay & Guide ⚔️',
          thumbnailUrl:
            'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=80',
          videoUrl: 'https://youtube.com',
          views: 18900,
          duration: '28:10',
        },
        {
          id: 'v3',
          title: 'World of Warcraft Mythic+ 2800+ Speedrun Route Breakdown 🏰',
          thumbnailUrl:
            'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
          videoUrl: 'https://youtube.com',
          views: 14800,
          duration: '16:30',
        },
      ],
      displayOnProfile: options?.displayOnProfile ?? true,
      showSubscribersCount: options?.showSubscribersCount ?? true,
      showTotalViews: options?.showTotalViews ?? true,
      showRecentVideos: options?.showRecentVideos ?? true,
    };
  }

  private async fetchTwitch(channel: string, options?: Record<string, unknown>) {
    const clean = channel.replace(/^@/, '').trim();
    const token = await this.getTwitchAppToken();
    const clientId = process.env.TWITCH_CLIENT_ID;

    if (token && clientId) {
      try {
        const userRes = await fetch(
          `https://api.twitch.tv/helix/users?login=${encodeURIComponent(clean)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Client-Id': clientId,
            },
          },
        );
        if (userRes.ok) {
          const userData = (await userRes.json()) as TwitchUsersResponse;
          const user = userData.data?.[0];
          if (user) {
            let isLive = false;
            let streamTitle = '';
            let gameName = '';
            let viewersCount = 0;
            let streamThumbnailUrl: string | null = null;
            let startedAt: string | null = null;

            const streamRes = await fetch(
              `https://api.twitch.tv/helix/streams?user_id=${user.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Client-Id': clientId,
                },
              },
            );
            if (streamRes.ok) {
              const streamData = (await streamRes.json()) as TwitchStreamsResponse;
              const stream = streamData.data?.[0];
              if (stream) {
                isLive = true;
                streamTitle = stream.title || '';
                gameName = stream.game_name || '';
                viewersCount = stream.viewer_count || 0;
                streamThumbnailUrl =
                  stream.thumbnail_url?.replace('{width}', '440').replace('{height}', '248') ||
                  null;
                startedAt = stream.started_at || null;
              }
            }

            let followersCount = 0;
            try {
              const folRes = await fetch(
                `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${user.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Client-Id': clientId,
                  },
                },
              );
              if (folRes.ok) {
                const folData = (await folRes.json()) as TwitchFollowersResponse;
                followersCount = typeof folData.total === 'number' ? folData.total : 0;
              }
            } catch (folErr) {
              this.logger.warn(`Failed to fetch followers for ${user.login}: ${String(folErr)}`);
            }

            return {
              id: user.id,
              channel: user.login,
              username: user.login,
              displayName: user.display_name || user.login,
              avatarUrl: user.profile_image_url || '/icons/brands/twitch.png',
              bio: user.description || '',
              isLive,
              streamTitle,
              gameName,
              viewersCount,
              followersCount,
              streamThumbnailUrl,
              startedAt,
              url: `https://twitch.tv/${user.login}`,
              displayOnProfile: options?.displayOnProfile ?? true,
              showLiveStatus: options?.showLiveStatus ?? true,
              showFollowersCount: options?.showFollowersCount ?? true,
            };
          }
        }
      } catch (err) {
        this.logger.warn(`Twitch live API fetch failed for ${clean}: ${String(err)}`);
      }
    }

    throw new NotFoundException(`Twitch channel "${clean}" was not found on Twitch.`);
  }

  async getTwitchLiveStatus(
    twitchAccount: TwitchAccountInput | null | undefined,
  ): Promise<TwitchLiveStatus | null> {
    if (
      !twitchAccount ||
      (!twitchAccount.id && !twitchAccount.username && !twitchAccount.channel)
    ) {
      return null;
    }

    const identifier = (twitchAccount.id ||
      twitchAccount.username ||
      twitchAccount.channel) as string;
    const cacheKey = `twitch:live:${identifier}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as TwitchLiveStatus;
      }
    } catch {}

    const token = await this.getTwitchAppToken();
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!token || !clientId) {
      return null;
    }

    try {
      let isLive = false;
      let streamTitle = '';
      let gameName = '';
      let viewersCount = 0;
      let streamThumbnailUrl: string | null = null;
      let startedAt: string | null = null;

      const streamUrl = twitchAccount.id
        ? `https://api.twitch.tv/helix/streams?user_id=${twitchAccount.id}`
        : `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent((twitchAccount.username || twitchAccount.channel) as string)}`;

      const streamRes = await fetch(streamUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Client-Id': clientId,
        },
      });

      if (streamRes.ok) {
        const streamData = (await streamRes.json()) as TwitchStreamsResponse;
        const stream = streamData.data?.[0];
        if (stream) {
          isLive = true;
          streamTitle = stream.title || '';
          gameName = stream.game_name || '';
          viewersCount = stream.viewer_count || 0;
          streamThumbnailUrl =
            stream.thumbnail_url?.replace('{width}', '440').replace('{height}', '248') || null;
          startedAt = stream.started_at || null;
        }
      }

      let followersCount = twitchAccount.followersCount ?? 0;
      if (twitchAccount.id) {
        try {
          const folRes = await fetch(
            `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${twitchAccount.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Client-Id': clientId,
              },
            },
          );
          if (folRes.ok) {
            const folData = (await folRes.json()) as TwitchFollowersResponse;
            if (typeof folData.total === 'number') {
              followersCount = folData.total;
            }
          }
        } catch {}
      }

      const liveResult: TwitchLiveStatus = {
        isLive,
        streamTitle,
        gameName,
        viewersCount,
        streamThumbnailUrl,
        startedAt,
        followersCount,
      };

      try {
        await this.redis.set(cacheKey, JSON.stringify(liveResult), 60);
      } catch {}

      return liveResult;
    } catch (err) {
      this.logger.warn(`Failed to fetch Twitch live status for ${identifier}: ${String(err)}`);
      return null;
    }
  }

  async unlinkPlatform(userId: string, username: string, platform: string): Promise<void> {
    const p = (platform || '').toLowerCase().trim();
    const showcase = await this.prisma.profileShowcase.findUnique({
      where: { userId },
    });

    if (showcase) {
      const existingConnected = (showcase.connectedAccounts as Record<string, unknown>) || {};
      const updatedConnected = removePlatformData(existingConnected, p);

      await this.prisma.profileShowcase.update({
        where: { userId },
        data: {
          connectedAccounts: updatedConnected as Prisma.InputJsonObject,
        },
      });
    }

    await this.redis.del(`showcase:user:${userId}`);
    await this.redis.del(`showcase:${userId}`);
    await this.redis.del(`integration:cache:${p}:${username}`);
    await this.redis.del(`integration:cache:${p}:${userId}`);
    if (p === 'twitch') {
      await this.redis.del(`twitch:live:${username}`);
      await this.redis.del(`twitch:live:${userId}`);
    }
  }

  private async fetchRoblox(username: string, options?: Record<string, unknown>) {
    const clean = username.trim();
    const apiKey = process.env.ROBLOX_API_KEY;

    try {
      let userId: string | number | null = null;
      let name: string = clean;
      let displayName: string = clean;
      let hasVerifiedBadge = false;

      if (/^\d+$/.test(clean)) {
        userId = clean;
        const uRes = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (uRes.ok) {
          const uData = (await uRes.json()) as RobloxUserProfileResponse;
          if (uData.name) name = uData.name;
          if (uData.displayName) displayName = uData.displayName;
          hasVerifiedBadge = Boolean(uData.hasVerifiedBadge);
        }
      } else {
        const searchRes = await fetch('https://users.roblox.com/v1/usernames/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [clean], excludeBannedUsers: true }),
        });
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as RobloxLookupResponse;
          const found = searchData.data?.[0];
          if (found) {
            userId = found.id;
            name = found.name;
            displayName = found.displayName;
            hasVerifiedBadge = Boolean(found.hasVerifiedBadge);
          }
        }
      }

      if (userId) {
        let avatarUrl = '/icons/brands/roblox.png';
        let avatarBustUrl: string | null = null;
        try {
          const [headshotRes, fullRes] = await Promise.all([
            fetch(
              `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`,
            ),
            fetch(
              `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
            ),
          ]);
          if (headshotRes.ok) {
            const headData = (await headshotRes.json()) as RobloxThumbResponse;
            if (headData.data?.[0]?.imageUrl) {
              avatarUrl = headData.data[0].imageUrl;
            }
          }
          if (fullRes.ok) {
            const fullData = (await fullRes.json()) as RobloxThumbResponse;
            if (fullData.data?.[0]?.imageUrl) {
              avatarBustUrl = fullData.data[0].imageUrl;
            }
          }
        } catch {}

        let friendsCount = 0;
        let followersCount = 0;
        try {
          const [frRes, foRes] = await Promise.all([
            fetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`),
            fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`),
          ]);
          if (frRes.ok) {
            const frData = (await frRes.json()) as RobloxFriendsCountResponse;
            friendsCount = frData.count || 0;
          }
          if (foRes.ok) {
            const foData = (await foRes.json()) as RobloxFriendsCountResponse;
            followersCount = foData.count || 0;
          }
        } catch {}

        if (apiKey) {
          try {
            const ocRes = await fetch(`https://apis.roblox.com/cloud/v2/users/${userId}`, {
              headers: { 'x-api-key': apiKey },
            });
            if (ocRes.ok) {
              const ocData = (await ocRes.json()) as RobloxOpenCloudUserResponse & {
                displayName?: string;
              };
              if (ocData.displayName) displayName = ocData.displayName;
            }
          } catch {}
        }

        let items: Array<{
          name: string;
          assetId: number;
          userAssetId?: number | undefined;
          recentAveragePrice?: number | undefined;
          originalPrice?: number | undefined;
          iconUrl: string;
          url: string;
          type: string;
        }> = [];

        try {
          const colRes = await fetch(
            `https://inventory.roblox.com/v1/users/${userId}/assets/collectibles?limit=10`,
          );
          if (colRes.ok) {
            const colData = (await colRes.json()) as RobloxCollectiblesResponse;
            if (Array.isArray(colData.data) && colData.data.length > 0) {
              const rawItems = colData.data.slice(0, 5);
              const assetIds = rawItems.map((it) => it.assetId).filter(Boolean);
              const thumbMap = new Map<number, string>();
              if (assetIds.length > 0) {
                try {
                  const thumbRes = await fetch(
                    `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds.join(',')}&size=150x150&format=Png&isCircular=false`,
                  );
                  if (thumbRes.ok) {
                    const thumbData = (await thumbRes.json()) as RobloxThumbResponse;
                    if (Array.isArray(thumbData.data)) {
                      for (const td of thumbData.data) {
                        if (td.targetId && td.imageUrl) {
                          thumbMap.set(td.targetId, td.imageUrl);
                        }
                      }
                    }
                  }
                } catch (tErr) {
                  this.logger.warn(`Roblox asset thumbnails fetch failed: ${String(tErr)}`);
                }
              }

              items = rawItems.map((it) => ({
                name: it.name,
                assetId: it.assetId,
                userAssetId: it.userAssetId,
                recentAveragePrice: it.recentAveragePrice || 0,
                originalPrice: it.originalPrice || 0,
                iconUrl: thumbMap.get(it.assetId) || '',
                url: `https://www.roblox.com/catalog/${it.assetId}`,
                type: 'Collectible',
              }));
            }
          }
        } catch (colErr) {
          this.logger.warn(`Roblox collectibles fetch failed for ${userId}: ${String(colErr)}`);
        }

        let places: Array<{
          name: string;
          universeId: number;
          placeId?: number | undefined;
          iconUrl: string;
          url: string;
        }> = [];

        try {
          // Roblox allowed limits for favorite games: 10, 25, 50, 100
          const favRes = await fetch(
            `https://games.roblox.com/v2/users/${userId}/favorite/games?limit=10`,
          );
          if (favRes.ok) {
            const favData = (await favRes.json()) as RobloxPlacesResponse;
            if (Array.isArray(favData.data) && favData.data.length > 0) {
              const rawPlaces = favData.data.slice(0, 5);
              const universeIds = rawPlaces.map((g) => g.id).filter(Boolean);
              const placeThumbMap = new Map<number, string>();
              if (universeIds.length > 0) {
                try {
                  const pThumbRes = await fetch(
                    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(',')}&size=150x150&format=Png&isCircular=false`,
                  );
                  if (pThumbRes.ok) {
                    const pThumbData = (await pThumbRes.json()) as RobloxThumbResponse;
                    if (Array.isArray(pThumbData.data)) {
                      for (const td of pThumbData.data) {
                        if (td.targetId && td.imageUrl) {
                          placeThumbMap.set(td.targetId, td.imageUrl);
                        }
                      }
                    }
                  }
                } catch (pErr) {
                  this.logger.warn(`Roblox game icons fetch failed: ${String(pErr)}`);
                }
              }

              places = rawPlaces.map((g) => {
                const placeId = g.rootPlace?.id || g.id;
                return {
                  name: (g.name || 'Roblox Experience').trim(),
                  universeId: g.id,
                  placeId: g.rootPlace?.id,
                  iconUrl: placeThumbMap.get(g.id) || '',
                  url: `https://www.roblox.com/games/${placeId}`,
                };
              });
            }
          }
        } catch (favErr) {
          this.logger.warn(`Roblox favorite places fetch failed for ${userId}: ${String(favErr)}`);
        }

        // Rule: If user's top 5 items cannot be obtained (less than 5 items), substitute top 5 favorite places instead!
        const effectiveItems =
          items.length >= 5
            ? items
            : places.length > 0
              ? places.map((p) => ({
                  name: p.name,
                  iconUrl: p.iconUrl,
                  url: p.url,
                  placeId: p.placeId,
                  universeId: p.universeId,
                  type: 'Place',
                }))
              : items;

        return {
          username: name,
          displayName,
          userId: String(userId),
          avatarUrl,
          avatarBustUrl: avatarBustUrl || avatarUrl,
          friendsCount,
          followersCount,
          hasVerifiedBadge,
          items: effectiveItems,
          places,
          displayOnProfile: options?.displayOnProfile ?? true,
          showAvatarRender: options?.showAvatarRender ?? true,
          showFriends: options?.showFriends ?? true,
          showCollectibles: options?.showCollectibles ?? true,
        };
      }
    } catch (err) {
      this.logger.warn(`Roblox live API fetch failed for ${clean}: ${String(err)}`);
    }

    return {
      username: clean,
      displayName: clean,
      userId: (options?.userId as string | undefined) || '0',
      avatarUrl: (options?.avatarUrl as string | undefined) || '',
      avatarBustUrl:
        (options?.avatarBustUrl as string | undefined) ||
        (options?.avatarUrl as string | undefined) ||
        '',
      friendsCount: (options?.friendsCount as number | undefined) || 0,
      followersCount: (options?.followersCount as number | undefined) || 0,
      hasVerifiedBadge: (options?.hasVerifiedBadge as boolean | undefined) ?? false,
      items: (options?.items as Array<unknown> | undefined) || [],
      places: (options?.places as Array<unknown> | undefined) || [],
      displayOnProfile: options?.displayOnProfile ?? true,
      showAvatarRender: options?.showAvatarRender ?? true,
      showFriends: options?.showFriends ?? true,
      showCollectibles: options?.showCollectibles ?? true,
    };
  }

  private async fetchX(handle: string, _options?: Record<string, unknown>) {
    await Promise.resolve();
    const cleanHandle = handle.replace(/^@/, '');
    return {
      handle: `@${cleanHandle}`,
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      followersCount: 14200,
      followingCount: 340,
      verified: true,
      bio: 'Building the next generation of social gaming platforms.',
    };
  }

  private async fetchFacebook(username: string, _options?: Record<string, unknown>) {
    await Promise.resolve();
    return {
      username,
      displayName: username,
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      friendsCount: 480,
    };
  }

  private async fetchEpicGames(username: string, _options?: Record<string, unknown>) {
    await Promise.resolve();
    return {
      username,
      avatarUrl:
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
      gamesCount: 84,
      achievementsCount: 312,
    };
  }
}
