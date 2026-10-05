import {
  type AuthResponse,
  type ChangePasswordDto,
  type CheckUsernameDto,
  type LoginDto,
  type RegisterDto,
  changePasswordSchema,
  checkUsernameSchema,
  loginSchema,
  registerSchema,
} from '@common/contracts';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestMeta } from '../sessions/sessions.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from './guards/jwt-auth.guard';
import type { RequestUser } from './interfaces/jwt-payload.interface';
import { TurnstileService } from './turnstile.service';
import { HighPriority } from '../common/resilience/request-priority.decorator';
import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  extractRefreshToken,
} from './utils/auth-cookie.util';

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).max(4096).optional(),
});
type RefreshBodyDto = z.infer<typeof refreshBodySchema>;

function extractMeta(req: Request, ip: string, ua?: string): RequestMeta {
  return { ip: req.ip ?? ip ?? null, userAgent: ua ?? null };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly turnstileService: TurnstileService,
  ) {}

  @Get('check-username')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 }, auth: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Username availability status',
  })
  checkUsername(
    @Query(new ZodValidationPipe(checkUsernameSchema)) query: CheckUsernameDto,
  ): Promise<{ isAvailable: boolean }> {
    return this.authService.checkUsername(query.username);
  }

  @Post('register')
  @HighPriority()
  @Throttle({ default: { limit: 5, ttl: 3600_000 }, auth: { limit: 5, ttl: 3600_000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email or username is already taken',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<AuthResponse> {
    await this.turnstileService.verifyToken(dto.turnstileToken, req.ip ?? ip);
    const result = await this.authService.register(dto, extractMeta(req, ip, ua));
    setRefreshTokenCookie(res, req, result.refreshToken);
    return result;
  }

  @Post('login')
  @HighPriority()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 }, auth: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<AuthResponse> {
    if (dto.turnstileToken) {
      await this.turnstileService.verifyToken(dto.turnstileToken, req.ip ?? ip);
    }
    const result = await this.authService.login(dto, extractMeta(req, ip, ua));
    setRefreshTokenCookie(res, req, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @HighPriority()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 }, auth: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token issued',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh token is invalid, expired or revoked',
  })
  async refresh(
    @Body(new ZodValidationPipe(refreshBodySchema)) dto?: RefreshBodyDto,
    @Req() req?: Request,
  ): Promise<{ accessToken: string }> {
    const token = extractRefreshToken(req, dto?.refreshToken);
    if (!token) {
      throw new UnauthorizedException('Refresh token is missing or expired');
    }
    return this.authService.refresh(token);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 }, auth: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Change the current account password' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Password changed' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    await this.authService.changePassword(user.id, dto, user.sessionJti);
    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Invalidate a refresh token (logout current session)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session terminated',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid access token',
  })
  async logout(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(refreshBodySchema)) dto?: RefreshBodyDto,
    @Req() req?: Request,
    @Res({ passthrough: true }) res?: Response,
  ): Promise<void> {
    const token = extractRefreshToken(req, dto?.refreshToken);
    clearRefreshTokenCookie(res, req);
    if (token) {
      await this.authService.logout(user.id, token);
    }
  }
}
