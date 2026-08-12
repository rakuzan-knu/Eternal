import { Controller, Delete, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { AuthService } from '../auth/auth.service';
import { SessionsService } from './sessions.service';
import { SessionViewDto } from './dto/session-view.dto';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('auth/sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active sessions for the current user' })
  list(@CurrentUser() user: RequestUser): Promise<SessionViewDto[]> {
    return this.sessionsService.listForUser(user.id, user.sessionJti);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a single session by id' })
  async revoke(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    const jti = await this.sessionsService.revokeById(user.id, id);
    await this.authService.revokeRefreshByJti(user.id, jti);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke every session except the current device' })
  async revokeAll(@CurrentUser() user: RequestUser): Promise<void> {
    if (!user.sessionJti) return;
    await this.authService.revokeOtherSessions(user.id, user.sessionJti);
  }
}
