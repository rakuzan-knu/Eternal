import { Controller, Get, Query, Res, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { setOAuthCookie } from '../common/security/oauth-state';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SpotifyService } from './spotify.service';

@ApiTags('spotify')
@Controller()
export class SpotifyCallbackController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @UseGuards(AuthGuard)
  @Get('auth/spotify')
  @ApiOperation({ summary: 'Initiate Spotify OAuth authorization flow' })
  async redirectToSpotify(@CurrentUser() user: RequestUser, @Res() res: Response) {
    const url = await this.spotifyService.getAuthorizationUrl(user.id);
    setOAuthCookie(res, 'spotify', new URL(url).searchParams.get('state')!);
    return res.redirect(url);
  }

  @Get(['api/auth/spotify/callback', 'auth/spotify/callback', 'spotify/callback'])
  @ApiOperation({ summary: 'Spotify OAuth authorization callback' })
  async handleCallback(
    @Query() query: Record<string, any>,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    return this.spotifyService.handleOAuthCallback(query, res, req.cookies?.spotify_oauth_state);
  }
}
