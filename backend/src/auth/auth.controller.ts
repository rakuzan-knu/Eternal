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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  type AuthResponse,
  type ChangePasswordDto,
  type CheckUsernameDto,
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
  changePasswordSchema,
  checkUsernameSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthGuard } from './guards/jwt-auth.guard';
import type { RequestUser } from './interfaces/jwt-payload.interface';
import type { RequestMeta } from '../sessions/sessions.service';

function extractMeta(req: Request, ip: string, ua?: string): RequestMeta {
  return { ip: req.ip ?? ip ?? null, userAgent: ua ?? null };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('check-username')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 3, ttl: 3600_000 } })
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
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
  ): Promise<AuthResponse> {
    return this.authService.register(dto, extractMeta(req, ip, ua));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
    @Headers('user-agent') ua?: string,
  ): Promise<AuthResponse> {
    return this.authService.login(dto, extractMeta(req, ip, ua));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access token issued',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Refresh token is invalid, expired or revoked',
  })
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
    @Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(user.id, dto.refreshToken);
  }
}
