import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import type { FastifyAdapter } from '@nestjs/platform-fastify';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { YouTubeDesktopService, youtubeDesktopLaunchPage } from './youtube-desktop.service';
import { IntegrationsService } from './integrations.service';
import { setOAuthCookie } from '../common/security/oauth-state';
import type { Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  YouTubeDesktopStartDto,
  YouTubeDesktopLaunchDto,
  YouTubeDesktopCallbackDto,
  YouTubeDesktopRedeemDto,
} from './dto/youtube-desktop.dto';

const bodyValidation = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
type FastifyReply = ReturnType<FastifyAdapter['reply']>;

@Controller(['integrations/youtube/desktop', 'api/integrations/youtube/desktop'])
export class YouTubeDesktopController {
  constructor(
    private readonly desktop: YouTubeDesktopService,
    private readonly integrations: IntegrationsService,
  ) {}

  @UseGuards(AuthGuard)
  @Post('start')
  @Header('Cache-Control', 'no-store')
  start(
    @CurrentUser() user: RequestUser,
    @Body(bodyValidation) body: YouTubeDesktopStartDto,
    @Headers('origin') origin?: string,
  ) {
    return this.desktop.start(user.id, body.challenge, origin || '');
  }

  @Get('launch')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  launchPage(@Res() res: FastifyReply): FastifyReply {
    return res.type('text/html; charset=utf-8').send(youtubeDesktopLaunchPage());
  }

  @Post('launch')
  @Header('Cache-Control', 'no-store')
  async launch(
    @Body(bodyValidation) body: YouTubeDesktopLaunchDto,
    @Headers('origin') origin: string | undefined,
    @Res() res: Response,
  ) {
    const result = await this.desktop.launch(body, origin);
    setOAuthCookie(res, 'youtube_desktop', result.state);
    return res.send({ url: result.url });
  }

  @Get('callback')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async callback(
    @Query() query: Record<string, unknown>,
    @Req() req: { cookies?: Record<string, string> },
    @Res() res: FastifyReply,
  ): Promise<FastifyReply> {
    const callback = plainToInstance(YouTubeDesktopCallbackDto, query);
    if ((await validate(callback, { whitelist: true })).length)
      throw new BadRequestException('Invalid YouTube callback');
    const link = await this.desktop.callback(callback, req.cookies?.youtube_desktop_oauth_state);
    res.clearCookie('youtube_desktop_oauth_state', { path: '/' });
    return res
      .type('text/html; charset=utf-8')
      .send(
        `<!doctype html><html><head><title>Return to Eternal</title></head><body><p>Return to Eternal to finish connecting YouTube.</p><a href="${link.replaceAll('&', '&amp;')}">Open Eternal</a><script>history.replaceState(null,'',location.pathname);location.replace(${JSON.stringify(link)});</script></body></html>`,
      );
  }

  @UseGuards(AuthGuard)
  @Post('redeem')
  @Header('Cache-Control', 'no-store')
  async redeem(
    @CurrentUser() user: RequestUser,
    @Body(bodyValidation) body: YouTubeDesktopRedeemDto,
  ) {
    const handoff = await this.desktop.redeem(user.id, body);
    if (handoff.failed || !handoff.code)
      throw new BadRequestException('YouTube authentication was cancelled or denied');
    return this.integrations.exchangeDesktopYouTubeCode(user.id, handoff.code, handoff.redirectUri);
  }
}
