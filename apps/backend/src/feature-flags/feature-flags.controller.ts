import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  type CreateFeatureFlagDto,
  type UpdateFeatureFlagDto,
  createFeatureFlagSchema,
  updateFeatureFlagSchema,
} from '@common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FeatureFlagsService } from './feature-flags.service';

@ApiTags('FeatureFlags')
@Controller('flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Evaluate all active feature flags for the current user' })
  @ApiResponse({ status: 200, description: 'Map of feature flags evaluated for viewer.' })
  async evaluateAll(@CurrentUser() user?: RequestUser) {
    const flags = await this.featureFlagsService.evaluateAllFlags(user?.id);
    return { flags };
  }

  @Get(':key')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Evaluate a specific feature flag by key' })
  @ApiResponse({ status: 200, description: 'Evaluation state of the specific flag.' })
  async evaluateSingle(@Param('key') key: string, @CurrentUser() user?: RequestUser) {
    return this.featureFlagsService.evaluateFlag(key, user?.id);
  }

  // ─── Admin Endpoints ────────────────────────────────────────────────────────

  @Get('admin/list')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all feature flag definitions (Admin)' })
  async listAdmin() {
    return this.featureFlagsService.getAllFlagsAdmin();
  }

  @Post('admin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new feature flag (Admin)' })
  async createFlag(
    @Body(new ZodValidationPipe(createFeatureFlagSchema)) dto: CreateFeatureFlagDto,
  ) {
    return this.featureFlagsService.createFlag(dto);
  }

  @Patch('admin/:key')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing feature flag configuration (Admin)' })
  async updateFlag(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(updateFeatureFlagSchema)) dto: UpdateFeatureFlagDto,
  ) {
    return this.featureFlagsService.updateFlag(key, dto);
  }

  @Delete('admin/:key')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag (Admin)' })
  async deleteFlag(@Param('key') key: string) {
    await this.featureFlagsService.deleteFlag(key);
  }
}
