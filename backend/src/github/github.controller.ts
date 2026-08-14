import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Req,
  Res,
  Headers,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GithubService } from './github.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('github')
@Controller()
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('auth/github')
  @ApiOperation({ summary: 'Initiate GitHub OAuth login flow' })
  redirectToGithub(@Req() req: Request, @Res() res: Response): void {
    this.githubService.getAuthorizationUrl(req, res);
  }

  @Get('auth/github/callback')
  @ApiOperation({ summary: 'GitHub OAuth authorization callback' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    await this.githubService.handleOAuthCallback(code, state, req, res);
  }

  @Delete('auth/github')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink GitHub account from profile' })
  async unlinkGithub(@CurrentUser() user: RequestUser): Promise<{ success: boolean }> {
    await this.githubService.unlinkGithub(user.id);
    return { success: true };
  }

  @Post('users/sync-github')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 1, ttl: 300_000 } })
  @ApiOperation({
    summary: 'Manually trigger PR sync for contributor badges (Rate limited: 1 req / 5 min)',
  })
  async syncGithub(
    @CurrentUser() user: RequestUser,
  ): Promise<{ mergedPrsCount: number; githubUsername: string | null }> {
    return this.githubService.syncUserGithubContributions(user.id);
  }

  @Post('github/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitHub repository webhook endpoint for pull_request events' })
  async handleWebhook(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<{ handled: boolean; message: string }> {
    const rawBodyString = JSON.stringify(body);
    const isValid = this.githubService.verifySignature(rawBodyString, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid GitHub Webhook HMAC Signature');
    }

    return this.githubService.handleWebhookPayload(body);
  }
}
