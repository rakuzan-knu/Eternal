import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import type { Response } from 'express';
import {
  HealthResponseDto,
  PingResponseDto,
  RedisMemoryInfoDto,
  SelfHealResponseDto,
} from '@common/contracts';
import { SelfHealTriggerDto } from './dto/self-heal-trigger.dto';
import { HealthService } from './health.service';
import { CriticalPriority } from '../common/resilience/request-priority.decorator';

@ApiTags('health')
@CriticalPriority()
@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  @Get(['health', 'api/health'])
  @HealthCheck()
  @ApiOperation({
    summary: 'Deep health check (database + redis connectivity + automated self-healing)',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy', type: HealthResponseDto })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy or degraded',
    type: HealthResponseDto,
  })
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponseDto> {
    const { isHealthy, response } = await this.healthService.getReadiness();
    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return response;
  }

  @SkipThrottle()
  @Get(['health/live', 'api/health/live'])
  @ApiOperation({ summary: 'Liveness probe (process is responsive)' })
  @ApiResponse({ status: 200, description: 'Service process is live', type: PingResponseDto })
  getLiveness(): PingResponseDto {
    return this.healthService.getLiveness();
  }

  @Get(['health/ready', 'api/health/ready'])
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (verifies DB & Redis & memory health)' })
  @ApiResponse({
    status: 200,
    description: 'Service ready to serve traffic',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'Service dependent dependency unavailable',
    type: HealthResponseDto,
  })
  async getReadiness(@Res({ passthrough: true }) res: Response): Promise<HealthResponseDto> {
    const { isHealthy, response } = await this.healthService.getReadiness();
    if (!isHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return response;
  }

  @SkipThrottle()
  @Get(['/', 'ping', 'api/ping', 'health/ping'])
  @ApiOperation({ summary: 'Lightweight keep-alive ping for monitoring' })
  @ApiResponse({ status: 200, description: 'Ping successful', type: PingResponseDto })
  ping(): PingResponseDto {
    return this.healthService.getLiveness();
  }

  @Get(['health/redis-memory', 'api/health/redis-memory'])
  @ApiOperation({ summary: 'Inspect Redis memory stats and threshold utilization ratio' })
  @ApiResponse({ status: 200, description: 'Redis memory statistics', type: RedisMemoryInfoDto })
  async getRedisMemoryInfo(): Promise<RedisMemoryInfoDto> {
    return this.healthService.getRedisMemoryInfo();
  }

  @Post(['health/self-heal', 'api/health/self-heal'])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger automated self-healing non-critical cache eviction runbook' })
  @ApiResponse({
    status: 200,
    description: 'Self-healing runbook execution results',
    type: SelfHealResponseDto,
  })
  async triggerSelfHealPost(@Body() body?: SelfHealTriggerDto): Promise<SelfHealResponseDto> {
    return this.healthService.triggerSelfHealing(body);
  }

  @Get(['health/self-heal', 'api/health/self-heal'])
  @ApiOperation({ summary: 'Inspect or trigger self-healing runbook via GET' })
  @ApiResponse({
    status: 200,
    description: 'Self-healing runbook execution results',
    type: SelfHealResponseDto,
  })
  async triggerSelfHealGet(@Query() query?: SelfHealTriggerDto): Promise<SelfHealResponseDto> {
    return this.healthService.triggerSelfHealing(query);
  }

  @Get('health/debug-sentry')
  @ApiOperation({ summary: 'Trigger Sentry test error' })
  @ApiResponse({ status: 500, description: 'Internal Server Error (Sentry Test)' })
  debugSentry(): void {
    throw new Error('🔥 Sentry Integration Test Error from NestJS Health Check!');
  }
}
