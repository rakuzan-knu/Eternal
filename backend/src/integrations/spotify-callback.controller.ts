import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SpotifyService } from './spotify.service';

@ApiTags('spotify')
@Controller()
export class SpotifyCallbackController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('auth/spotify')
  @ApiOperation({ summary: 'Initiate Spotify OAuth authorization flow' })
  redirectToSpotify(@Query('userId') userId: string, @Res() res: Response) {
    const url = this.spotifyService.getAuthorizationUrl(userId);
    return res.redirect(url);
  }

  @Get(['api/auth/spotify/callback', 'auth/spotify/callback', 'spotify/callback'])
  @ApiOperation({ summary: 'Spotify OAuth authorization callback' })
  async handleCallback(@Query() query: Record<string, any>, @Res() res: Response) {
    return this.spotifyService.handleOAuthCallback(query, res);
  }
}
