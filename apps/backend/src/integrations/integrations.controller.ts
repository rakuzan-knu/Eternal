import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { IntegrationsService } from './integrations.service';
import { ShowcaseService } from '../showcase/showcase.service';
import { SpotifyService } from './spotify.service';
import { SoundCloudService } from './soundcloud.service';
import { PrismaService } from '@common/prisma';
import { isSupportedPlatform, assignPlatformData } from './platform.utils';

interface SyncLikedTrackItem {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  albumArt?: string;
  durationMs?: number;
  previewUrl?: string;
  streamUrl?: string;
  spotifyUrl?: string;
  source?: string;
  addedAt?: string | number | Date;
}

interface UserPlaylistEntity {
  id: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  user?: {
    id?: string;
    displayName?: string | null;
    username?: string | null;
    avatar?: string | null;
  } | null;
  folderId?: string | null;
  isPublic?: boolean;
  createdAt?: Date;
  tracks?: Array<{
    trackId: string;
    title: string;
    artist: string;
    album?: string | null;
    albumArt?: string | null;
    durationMs: number;
    previewUrl?: string | null;
    streamUrl?: string | null;
    spotifyUrl?: string | null;
    source: string;
    addedAt?: Date | null;
  }>;
}

@Controller(['integrations', 'api/integrations'])
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly showcaseService: ShowcaseService,
    private readonly spotifyService: SpotifyService,
    private readonly soundCloudService: SoundCloudService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('spotify/auth')
  redirectToSpotify(@Query('userId') userId: string, @Res() res: Response) {
    const url = this.spotifyService.getAuthorizationUrl(userId);
    return res.redirect(url);
  }

  @Get(['spotify/callback', 'auth/spotify/callback', 'api/auth/spotify/callback'])
  async handleSpotifyCallback(@Query() query: Record<string, any>, @Res() res: Response) {
    return this.spotifyService.handleOAuthCallback(query, res);
  }

  @UseGuards(AuthGuard)
  @Post('spotify/preferences')
  async updateSpotifyPreferences(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      displayOnProfile?: boolean;
      displayMode?: 'tracks' | 'playlists' | 'none';
      favoriteTracks?: string[];
      favoritePlaylists?: string[];
    },
  ) {
    return this.spotifyService.updateSpotifyPreferences(user.id, body);
  }

  @UseGuards(AuthGuard)
  @Get('spotify/library')
  async getSpotifyLibrary(@CurrentUser() user: RequestUser) {
    return this.spotifyService.getUserLibrary(user.id);
  }

  @Get('spotify/search')
  async searchSpotifyTracks(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.spotifyService.searchTracks(
      q || '',
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('spotify/search/playlists')
  async searchSpotifyPlaylists(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.spotifyService.searchPlaylists(
      q || '',
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('spotify/playlists/:playlistId')
  async getSpotifyPlaylist(@Param('playlistId') playlistId: string) {
    const pl = await this.spotifyService.getPlaylist(playlistId);
    if (!pl) {
      throw new NotFoundException('Spotify playlist not found');
    }
    return pl;
  }

  @UseGuards(AuthGuard)
  @Post('spotify/like/:trackId')
  async likeSpotifyTrack(
    @CurrentUser() user: RequestUser,
    @Param('trackId') trackId: string,
    @Body() body: { like: boolean },
  ) {
    return this.spotifyService.saveTrackToLibrary(user.id, trackId, body.like ?? true);
  }

  @UseGuards(AuthGuard)
  @Get('spotify/like/:trackId')
  async checkSpotifyTrackLiked(
    @CurrentUser() user: RequestUser,
    @Param('trackId') trackId: string,
  ) {
    return this.spotifyService.checkTrackLiked(user.id, trackId);
  }

  @UseGuards(AuthGuard)
  @Put('spotify/repeat')
  async setSpotifyRepeat(
    @CurrentUser() user: RequestUser,
    @Body() body: { state: 'track' | 'context' | 'off'; deviceId?: string },
  ) {
    return this.spotifyService.setRepeatMode(user.id, body.state || 'off', body.deviceId);
  }

  @UseGuards(AuthGuard)
  @Put('spotify/shuffle')
  async setSpotifyShuffle(
    @CurrentUser() user: RequestUser,
    @Body() body: { state: boolean; deviceId?: string },
  ) {
    return this.spotifyService.setShuffle(user.id, Boolean(body.state), body.deviceId);
  }

  @Get('spotify/lyrics')
  async getSpotifyLyrics(
    @Query('title') title: string,
    @Query('artist') artist: string,
    @Query('duration') duration?: string,
  ) {
    const durationMs = duration ? parseInt(duration, 10) : undefined;
    return this.spotifyService.getTrackLyrics(title || '', artist || '', durationMs);
  }

  @UseGuards(OptionalAuthGuard)
  @Get('spotify/queue')
  async getSpotifyQueue(
    @CurrentUser() user?: RequestUser,
    @Query('trackId') trackId?: string,
    @Query('artist') artist?: string,
    @Query('title') title?: string,
    @Query('offset') offset?: string,
    @Query('historyIds') historyIds?: string,
  ) {
    const numOffset = offset ? parseInt(offset, 10) || 0 : 0;
    const parsedHistory = historyIds
      ? historyIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return this.spotifyService.getPlaybackQueueOrInfiniteAudio(
      user?.id,
      trackId,
      artist,
      title,
      numOffset,
      parsedHistory,
    );
  }

  @UseGuards(AuthGuard)
  @Get('spotify/token')
  async getSpotifyUserToken(@CurrentUser() user: RequestUser) {
    return this.spotifyService.getUserSpotifyToken(user.id);
  }

  @UseGuards(AuthGuard)
  @Post('spotify/play')
  async playSpotifyTrackOnDevice(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      deviceId: string;
      trackId: string;
      positionMs?: number;
      title?: string;
      artist?: string;
    },
  ) {
    return this.spotifyService.playTrackOnDevice(
      user.id,
      body.deviceId,
      body.trackId,
      body.positionMs,
    );
  }

  @Get('soundcloud/search')
  async searchSoundCloudTracks(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.soundCloudService.searchTracks(
      q || '',
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('soundcloud/search/playlists')
  async searchSoundCloudPlaylists(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.soundCloudService.searchPlaylists(
      q || '',
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('soundcloud/tracks/:trackId')
  async getSoundCloudTrack(@Param('trackId') trackId: string) {
    const track = await this.soundCloudService.getTrack(trackId);
    if (!track) {
      throw new NotFoundException('SoundCloud track not found');
    }
    return track;
  }

  @Get('soundcloud/playlists/:playlistId')
  async getSoundCloudPlaylist(@Param('playlistId') playlistId: string) {
    const pl = await this.soundCloudService.getPlaylist(playlistId);
    if (!pl) {
      throw new NotFoundException('SoundCloud playlist not found');
    }
    return pl;
  }

  @Get('soundcloud/stream/:trackId')
  async getSoundCloudStream(
    @Param('trackId') trackId: string,
    @Query('bypassCache') bypassCache?: string,
    @Query('redirect') redirect?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.soundCloudService.getStreamUrl(trackId, bypassCache === 'true');
    if (redirect === 'true' && result?.streamUrl && res) {
      return res.redirect(result.streamUrl);
    }
    return result;
  }

  @Get('soundcloud/stream/:trackId/audio')
  async streamSoundCloudAudio(
    @Param('trackId') trackId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.soundCloudService.getStreamUrl(trackId);
    if (!result?.streamUrl) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      };
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const audioResponse = await fetch(result.streamUrl, { headers });
      res.status(audioResponse.status);

      for (const [key, val] of audioResponse.headers.entries()) {
        const lower = key.toLowerCase();
        if (['content-range', 'accept-ranges', 'content-length', 'content-type'].includes(lower)) {
          res.setHeader(key, val);
        }
      }

      if (!res.getHeader('accept-ranges')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      const reader = audioResponse.body?.getReader();
      if (!reader) {
        return res.end();
      }

      const pump = async () => {
        try {
          while (true) {
            const chunk = (await reader.read()) as { done: boolean; value?: Uint8Array };
            if (chunk.done) break;
            if (chunk.value) res.write(chunk.value);
          }
          res.end();
        } catch {
          res.end();
        }
      };
      void pump();
    } catch {
      return res.redirect(result.streamUrl);
    }
  }

  @Get('soundcloud/related/:trackId')
  async getSoundCloudRelated(
    @Param('trackId') trackId: string,
    @Query('excludeIds') excludeIds?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedExcludes = excludeIds
      ? excludeIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return this.soundCloudService.getRelatedTracks(
      trackId,
      parsedExcludes,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('steam/auth')
  redirectToSteam(@Query('userId') userId: string, @Req() req: Request, @Res() res: Response) {
    const url = this.integrationsService.getSteamAuthUrl(userId, req);
    return res.redirect(url);
  }

  // --- Music Hub: User Personal Liked Tracks (Persisted in PostgreSQL) ---

  @UseGuards(AuthGuard)
  @Get('music/liked-tracks')
  async getLikedTracks(@CurrentUser() user: RequestUser) {
    const tracks = await this.prisma.userLikedTrack.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: 'desc' },
    });
    return tracks.map((t) => ({
      id: t.trackId,
      trackId: t.trackId,
      title: t.title,
      artist: t.artist,
      album: t.album || t.title,
      albumArt: t.albumArt || '',
      durationMs: t.durationMs,
      previewUrl: t.previewUrl,
      streamUrl: t.streamUrl,
      spotifyUrl: t.spotifyUrl,
      source: t.source,
      addedAt: t.addedAt.toISOString(),
    }));
  }

  @UseGuards(AuthGuard)
  @Post('music/liked-tracks')
  async addLikedTrack(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      track: {
        id: string;
        title: string;
        artist: string;
        album?: string;
        albumArt?: string;
        durationMs?: number;
        previewUrl?: string | null;
        streamUrl?: string | null;
        spotifyUrl?: string | null;
        source?: string;
        addedAt?: string;
      };
    },
  ) {
    const t = body?.track;
    if (!t?.id || !t?.title) {
      throw new BadRequestException('Track id and title are required');
    }

    const addedAtDate = t.addedAt ? new Date(t.addedAt) : new Date();

    const record = await this.prisma.userLikedTrack.upsert({
      where: {
        userId_trackId: {
          userId: user.id,
          trackId: t.id,
        },
      },
      update: {
        title: t.title,
        artist: t.artist || 'Unknown Artist',
        album: t.album || t.title,
        albumArt: t.albumArt ?? null,
        durationMs: t.durationMs || 180000,
        previewUrl: t.previewUrl ?? null,
        streamUrl: t.streamUrl ?? null,
        spotifyUrl: t.spotifyUrl ?? null,
        source: t.source || 'soundcloud',
        addedAt: addedAtDate,
      },
      create: {
        userId: user.id,
        trackId: t.id,
        title: t.title,
        artist: t.artist || 'Unknown Artist',
        album: t.album || t.title,
        albumArt: t.albumArt ?? null,
        durationMs: t.durationMs || 180000,
        previewUrl: t.previewUrl ?? null,
        streamUrl: t.streamUrl ?? null,
        spotifyUrl: t.spotifyUrl ?? null,
        source: t.source || 'soundcloud',
        addedAt: addedAtDate,
      },
    });

    return {
      success: true,
      track: {
        id: record.trackId,
        trackId: record.trackId,
        title: record.title,
        artist: record.artist,
        album: record.album,
        albumArt: record.albumArt,
        durationMs: record.durationMs,
        previewUrl: record.previewUrl,
        streamUrl: record.streamUrl,
        spotifyUrl: record.spotifyUrl,
        source: record.source,
        addedAt: record.addedAt.toISOString(),
      },
    };
  }

  @UseGuards(AuthGuard)
  @Delete('music/liked-tracks/:trackId')
  async removeLikedTrack(@CurrentUser() user: RequestUser, @Param('trackId') trackId: string) {
    await this.prisma.userLikedTrack.deleteMany({
      where: {
        userId: user.id,
        trackId,
      },
    });
    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Post('music/liked-tracks/sync')
  async syncLikedTracks(
    @CurrentUser() user: RequestUser,
    @Body() body: { tracks: SyncLikedTrackItem[] },
  ) {
    if (Array.isArray(body?.tracks)) {
      for (const t of body.tracks) {
        if (!t?.id || !t?.title) continue;
        const addedAtDate = t.addedAt ? new Date(t.addedAt) : new Date();
        await this.prisma.userLikedTrack.upsert({
          where: {
            userId_trackId: {
              userId: user.id,
              trackId: t.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            trackId: t.id,
            title: t.title,
            artist: t.artist || 'Unknown Artist',
            album: t.album || t.title,
            albumArt: t.albumArt || null,
            durationMs: t.durationMs || 180000,
            previewUrl: t.previewUrl || null,
            streamUrl: t.streamUrl || null,
            spotifyUrl: t.spotifyUrl || null,
            source: t.source || 'soundcloud',
            addedAt: addedAtDate,
          },
        });
      }
    }

    const all = await this.prisma.userLikedTrack.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: 'desc' },
    });

    return all.map((t) => ({
      id: t.trackId,
      trackId: t.trackId,
      title: t.title,
      artist: t.artist,
      album: t.album || t.title,
      albumArt: t.albumArt || '',
      durationMs: t.durationMs,
      previewUrl: t.previewUrl,
      streamUrl: t.streamUrl,
      spotifyUrl: t.spotifyUrl,
      source: t.source,
      addedAt: t.addedAt.toISOString(),
    }));
  }

  // ==========================================
  // MUSIC FOLDERS CRUD
  // ==========================================

  @UseGuards(AuthGuard)
  @Get('music/folders')
  async getMusicFolders(@CurrentUser() user: RequestUser) {
    const folders = await this.prisma.userMusicFolder.findMany({
      where: { userId: user.id },
      include: {
        playlists: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      playlistIds: (f.playlists || []).map((p) => p.id),
      createdAt: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString(),
    }));
  }

  @UseGuards(AuthGuard)
  @Post('music/folders')
  async createMusicFolder(
    @CurrentUser() user: RequestUser,
    @Body() body: { id?: string; name?: string },
  ) {
    const count = await this.prisma.userMusicFolder.count({
      where: { userId: user.id },
    });
    const name = body?.name?.trim() || (count === 0 ? 'New Folder' : `New Folder #${count + 1}`);

    const folder = await this.prisma.userMusicFolder.create({
      data: {
        ...(body?.id && typeof body.id === 'string' && body.id.trim()
          ? { id: body.id.trim() }
          : {}),
        userId: user.id,
        name,
      },
    });

    return {
      id: folder.id,
      name: folder.name,
      playlistIds: [],
      createdAt: folder.createdAt.toISOString(),
    };
  }

  @UseGuards(AuthGuard)
  @Patch('music/folders/:id')
  async renameMusicFolder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { name: string },
  ) {
    const folder = await this.prisma.userMusicFolder.findFirst({
      where: { id, userId: user.id },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    const updated = await this.prisma.userMusicFolder.update({
      where: { id },
      data: { name: body.name?.trim() || folder.name },
      include: {
        playlists: {
          select: { id: true },
        },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      playlistIds: (updated.playlists || []).map((p) => p.id),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  @UseGuards(AuthGuard)
  @Delete('music/folders/:id')
  async deleteMusicFolder(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const folder = await this.prisma.userMusicFolder.findFirst({
      where: {
        userId: user.id,
        OR: [{ id }, { name: id }],
      },
    });
    if (!folder) {
      return { success: true, message: 'Folder not found or already deleted' };
    }

    await this.prisma.userMusicFolder.delete({
      where: { id: folder.id },
    });

    return { success: true };
  }

  // ==========================================
  // USER PLAYLISTS CRUD & SOCIAL SHARING
  // ==========================================

  private formatUserPlaylist(p: UserPlaylistEntity) {
    return {
      id: p.id,
      title: p.title,
      description: p.description || '',
      coverUrl: p.coverUrl || '',
      creator: p.user?.displayName || p.user?.username || 'User',
      creatorId: p.user?.id,
      creatorUsername: p.user?.username,
      creatorAvatar: p.user?.avatar,
      folderId: p.folderId,
      isPrivate: !p.isPublic,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      tracks: (p.tracks || []).map((t) => ({
        id: t.trackId,
        trackId: t.trackId,
        title: t.title,
        artist: t.artist,
        album: t.album || t.title,
        albumArt: t.albumArt || '',
        durationMs: t.durationMs,
        previewUrl: t.previewUrl,
        streamUrl: t.streamUrl,
        spotifyUrl: t.spotifyUrl,
        source: t.source,
        addedAt: t.addedAt ? t.addedAt.toISOString() : undefined,
      })),
    };
  }

  @UseGuards(AuthGuard)
  @Get('music/playlists')
  async getUserPlaylists(@CurrentUser() user: RequestUser) {
    const playlists = await this.prisma.userPlaylist.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        tracks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return playlists.map((p) => this.formatUserPlaylist(p));
  }

  @Get('music/playlists/:id')
  async getPlaylistById(@Param('id') id: string) {
    const playlist = await this.prisma.userPlaylist.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        tracks: {
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');
    return this.formatUserPlaylist(playlist);
  }

  @UseGuards(AuthGuard)
  @Post('music/playlists')
  async createUserPlaylist(
    @CurrentUser() user: RequestUser,
    @Body()
    body: {
      id?: string;
      title?: string;
      description?: string;
      coverUrl?: string;
      folderId?: string | null;
      isPublic?: boolean;
    },
  ) {
    const count = await this.prisma.userPlaylist.count({
      where: { userId: user.id },
    });
    const title = body?.title?.trim() || `My Playlist #${count + 1}`;
    let folderId: string | null = null;
    if (body?.folderId && typeof body.folderId === 'string' && body.folderId.trim() !== '') {
      const folder = await this.prisma.userMusicFolder.findFirst({
        where: { id: body.folderId.trim(), userId: user.id },
      });
      if (folder) folderId = folder.id;
    }

    const playlist = await this.prisma.userPlaylist.create({
      data: {
        ...(body?.id && typeof body.id === 'string' && body.id.trim()
          ? { id: body.id.trim() }
          : {}),
        userId: user.id,
        title,
        description: body?.description?.trim() || null,
        coverUrl: body?.coverUrl?.trim() || null,
        folderId,
        isPublic: body?.isPublic ?? true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        tracks: true,
      },
    });

    return this.formatUserPlaylist(playlist);
  }

  @UseGuards(AuthGuard)
  @Patch('music/playlists/:id')
  async updateUserPlaylist(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      coverUrl?: string;
      folderId?: string | null;
      isPublic?: boolean;
    },
  ) {
    const playlist = await this.prisma.userPlaylist.findFirst({
      where: { id, userId: user.id },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');

    let targetFolderId: string | null | undefined = undefined;
    if (body.folderId !== undefined) {
      if (body.folderId && typeof body.folderId === 'string' && body.folderId.trim() !== '') {
        const folder = await this.prisma.userMusicFolder.findFirst({
          where: { id: body.folderId.trim(), userId: user.id },
        });
        targetFolderId = folder ? folder.id : null;
      } else {
        targetFolderId = null;
      }
    }

    const updated = await this.prisma.userPlaylist.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.description !== undefined ? { description: body.description.trim() } : {}),
        ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl.trim() } : {}),
        ...(targetFolderId !== undefined ? { folderId: targetFolderId } : {}),
        ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        tracks: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return this.formatUserPlaylist(updated);
  }

  @UseGuards(AuthGuard)
  @Delete('music/playlists/:id')
  async deleteUserPlaylist(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    const playlist = await this.prisma.userPlaylist.findFirst({
      where: {
        userId: user.id,
        OR: [{ id }, { title: id }],
      },
    });
    if (!playlist) {
      return { success: true, message: 'Playlist not found or already deleted' };
    }

    await this.prisma.userPlaylist.delete({
      where: { id: playlist.id },
    });

    return { success: true };
  }

  @UseGuards(AuthGuard)
  @Post('music/playlists/:id/tracks')
  async addTrackToUserPlaylist(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { track: SyncLikedTrackItem },
  ) {
    const playlist = await this.prisma.userPlaylist.findFirst({
      where: { id, userId: user.id },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');

    const t = body?.track;
    if (!t?.id || !t?.title) {
      throw new BadRequestException('Track id and title are required');
    }

    const maxPos = await this.prisma.userPlaylistTrack.findFirst({
      where: { playlistId: id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPos = (maxPos?.position ?? -1) + 1;

    await this.prisma.userPlaylistTrack.upsert({
      where: {
        playlistId_trackId: {
          playlistId: id,
          trackId: t.id,
        },
      },
      update: {
        title: t.title,
        artist: t.artist || 'Unknown Artist',
        album: t.album || t.title,
        albumArt: t.albumArt || null,
        durationMs: t.durationMs || 180000,
        previewUrl: t.previewUrl || null,
        streamUrl: t.streamUrl || null,
        spotifyUrl: t.spotifyUrl || null,
        source: t.source || 'soundcloud',
      },
      create: {
        playlistId: id,
        trackId: t.id,
        title: t.title,
        artist: t.artist || 'Unknown Artist',
        album: t.album || t.title,
        albumArt: t.albumArt || null,
        durationMs: t.durationMs || 180000,
        previewUrl: t.previewUrl || null,
        streamUrl: t.streamUrl || null,
        spotifyUrl: t.spotifyUrl || null,
        source: t.source || 'soundcloud',
        position: nextPos,
        addedAt: t.addedAt ? new Date(t.addedAt) : new Date(),
      },
    });

    return this.getPlaylistById(id);
  }

  @UseGuards(AuthGuard)
  @Delete('music/playlists/:id/tracks/:trackId')
  async removeTrackFromUserPlaylist(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ) {
    const playlist = await this.prisma.userPlaylist.findFirst({
      where: { id, userId: user.id },
    });
    if (!playlist) throw new NotFoundException('Playlist not found');

    await this.prisma.userPlaylistTrack.deleteMany({
      where: {
        playlistId: id,
        trackId,
      },
    });

    return { success: true };
  }

  @Get('steam/callback')
  async handleSteamCallback(@Query() query: Record<string, any>, @Res() res: Response) {
    return this.integrationsService.handleSteamCallback(query, res);
  }

  @Get(':platform/auth')
  redirectToPlatformOAuth(
    @Param('platform') platform: string,
    @Query('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.integrationsService.handlePlatformOAuthStart(platform, userId, req, res);
  }

  @Get([':platform/callback', 'auth/:platform/callback', 'api/auth/:platform/callback'])
  async handlePlatformOAuthCallback(
    @Param('platform') platform: string,
    @Query() query: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const combinedQuery = { ...query, reqHost: req.get('host') };
    return this.integrationsService.handlePlatformOAuthCallback(platform, combinedQuery, res);
  }

  @UseGuards(OptionalAuthGuard)
  @Post(':platform/exchange-code')
  async exchangeOAuthCode(
    @CurrentUser() user: RequestUser | null,
    @Param('platform') platform: string,
    @Body() body: { code: string; redirectUri?: string; state?: string },
  ) {
    const targetUserId = user?.id || (body.state ? body.state.replace(/^[a-z]+:/i, '') : '');
    if (!targetUserId) {
      throw new UnauthorizedException('User authentication or valid state parameter required');
    }
    return this.integrationsService.exchangeOAuthCode(
      platform,
      body.code,
      body.redirectUri,
      targetUserId,
      body.state,
    );
  }

  @UseGuards(AuthGuard)
  @Post('roblox/generate-code')
  async generateRobloxCode(@CurrentUser() user: RequestUser, @Body() body: { username: string }) {
    return this.integrationsService.generateRobloxVerificationCode(user.id, body.username);
  }

  @UseGuards(AuthGuard)
  @Post('roblox/verify-ownership')
  async verifyRobloxOwnership(
    @CurrentUser() user: RequestUser,
    @Body() body: { username: string; code: string },
  ) {
    return this.integrationsService.verifyRobloxOwnership(user.id, body.username, body.code);
  }

  @Get(':platform/preview')
  async previewPlatform(
    @Param('platform') platform: string,
    @Query('handle') handle: string,
    @Query('featuredGame') featuredGame?: string,
    @Query('pinnedRepo') pinnedRepo?: string,
    @Query('wowChar') wowChar?: string,
    @Query('wowRealm') wowRealm?: string,
  ) {
    return this.integrationsService.getPlatformData(platform, handle, {
      featuredGame,
      pinnedRepo,
      wowChar,
      wowRealm,
    });
  }

  @Post(':platform/link')
  @UseGuards(AuthGuard)
  async linkPlatform(
    @CurrentUser() user: RequestUser,
    @Param('platform') platform: string,
    @Body() body: { handle: string; details?: Record<string, any>; options?: Record<string, any> },
  ) {
    if (!isSupportedPlatform(platform)) {
      throw new BadRequestException('Unsupported or invalid platform');
    }

    const data =
      body.details ||
      (await this.integrationsService.getPlatformData(platform, body.handle, body.options));

    const showcase = await this.showcaseService.getShowcase(user.username, user.id);
    const existingConnected = (showcase?.connectedAccounts as Record<string, any>) || {};

    const updatedConnected = assignPlatformData(existingConnected, platform, data);

    await this.showcaseService.updateShowcase(user.id, {
      connectedAccounts: updatedConnected,
    });

    return { success: true, data };
  }

  @Delete(':platform/unlink')
  @UseGuards(AuthGuard)
  async unlinkPlatform(@CurrentUser() user: RequestUser, @Param('platform') platform: string) {
    if (!isSupportedPlatform(platform)) {
      throw new BadRequestException('Unsupported or invalid platform');
    }
    await this.integrationsService.unlinkPlatform(user.id, user.username, platform);
    return { success: true };
  }
}
