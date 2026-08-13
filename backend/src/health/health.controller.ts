import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { HealthResponseDto, PingResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get(['health', 'api/health'])
  @ApiOperation({ summary: 'Deep health check (database + redis connectivity)' })
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
  @ApiOperation({ summary: 'Readiness probe (verifies DB & Redis)' })
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
  @Get(['ping', 'api/ping', 'health/ping'])
  @ApiOperation({ summary: 'Lightweight keep-alive ping for monitoring' })
  @ApiResponse({ status: 200, description: 'Ping successful', type: PingResponseDto })
  ping(): PingResponseDto {
    return this.healthService.getLiveness();
  }

  @Get('health/debug-sentry')
  @ApiOperation({ summary: 'Trigger Sentry test error' })
  @ApiResponse({ status: 500, description: 'Internal Server Error (Sentry Test)' })
  debugSentry(): void {
    throw new Error('🔥 Sentry Integration Test Error from NestJS Health Check!');
  }
}
