import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { CallsService } from './calls.service';
import {
  CallsStepUpService,
  type StepUpChallengeResponse,
  type StepUpTokenResponse,
} from './calls-step-up.service';
import { CreateStepUpChallengeDto, VerifyStepUpAssertionDto } from './dto/step-up.dto';
import type {
  CallSessionView,
  IceServersResponse,
  DeclineCallDto,
  CallTelemetryView,
  CallQualitySummaryView,
  WebTransportSessionResponse,
} from '@common/contracts';
import { CreateCallTelemetryDto } from './dto/call-telemetry.dto';

@ApiTags('Messenger / Calls')
@Controller('calls')
export class CallsController {
  constructor(
    private readonly callsService: CallsService,
    private readonly callsStepUpService: CallsStepUpService,
  ) {}

  @Get(':id/og-image')
  @ApiOperation({ summary: 'Dynamic Open Graph SVG room preview card for social sharing' })
  @ApiParam({ name: 'id', description: 'Call UUID' })
  async getCallOgImage(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const svg = await this.callsService.generateCallOgImage(id);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=60');
    res.status(200).send(svg);
  }

  @Post('webtransport-session')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Negotiate WebTransport (HTTP/3 QUIC) signaling session' })
  getWebTransportSession(
    @CurrentUser() user: RequestUser,
    @Body() body: { callId: string },
  ): Promise<WebTransportSessionResponse> {
    return this.callsService.createWebTransportSession(user.id, body.callId);
  }

  @Get('ice-servers')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get WebRTC STUN and TURN ICE server configurations' })
  getIceServers(@CurrentUser() user: RequestUser): Promise<IceServersResponse> {
    return this.callsService.getIceServers(user?.id);
  }

  @Get('telemetry/summary')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get aggregated call quality telemetry summary for current user' })
  getUserTelemetrySummary(@CurrentUser() user: RequestUser): Promise<CallQualitySummaryView> {
    return this.callsService.getUserTelemetrySummary(user.id);
  }

  @Post('telemetry')
  @HttpCode(201)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Submit call quality metrics and telemetry' })
  saveTelemetry(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateCallTelemetryDto,
  ): Promise<CallTelemetryView> {
    return this.callsService.saveTelemetry(user.id, body);
  }

  @Get('history')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get recent call history for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getCallHistory(
    @CurrentUser() user: RequestUser,
    @Query('limit') limit?: string,
  ): Promise<CallSessionView[]> {
    const take = limit ? Math.min(Math.max(1, parseInt(limit, 10) || 20), 100) : 20;
    return this.callsService.getCallHistory(user.id, take);
  }

  @Post('step-up/challenge')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Generate WebAuthn biometric challenge for sensitive in-call action' })
  createStepUpChallenge(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateStepUpChallengeDto,
  ): Promise<StepUpChallengeResponse> {
    return this.callsStepUpService.createStepUpChallenge(user.id, body.action, body.callId);
  }

  @Post('step-up/verify')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Verify biometric assertion and issue scoped short-lived execution token',
  })
  verifyStepUpAssertion(
    @CurrentUser() user: RequestUser,
    @Body() body: VerifyStepUpAssertionDto,
  ): Promise<StepUpTokenResponse> {
    return this.callsStepUpService.verifyStepUpAssertion(user.id, body);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get call details by ID' })
  @ApiParam({ name: 'id', description: 'Call UUID' })
  getCallById(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<CallSessionView> {
    return this.callsService.getCallById(id, user.id);
  }

  @Post(':id/decline')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Decline an incoming call via REST (e.g. Service Worker action)' })
  @ApiParam({ name: 'id', description: 'Call UUID' })
  async declineCall(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() body?: DeclineCallDto,
  ): Promise<{ status: string }> {
    await this.callsService.declineCall(id, user.id, body?.reason);
    return { status: 'ok' };
  }
}
