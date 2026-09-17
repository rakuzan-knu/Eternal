import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CompactFeedResponseDto,
  type GetCompactFeedQueryDto,
  getCompactFeedQuerySchema,
} from '@common/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { FeedBffService } from './feed-bff.service';

@ApiTags('BFF')
@Controller(['feed', 'api/feed', 'api/v1/feed'])
export class FeedBffController {
  constructor(private readonly feedBffService: FeedBffService) {}

  @Get('compact')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get compact lightweight feed to prevent over-fetching on mobile/edge clients',
  })
  @ApiResponse({
    status: 200,
    description: 'Compact feed items retrieved successfully.',
    type: CompactFeedResponseDto,
  })
  async getCompactFeed(
    @Query(new ZodValidationPipe(getCompactFeedQuerySchema)) query: GetCompactFeedQueryDto,
    @CurrentUser() user?: RequestUser,
  ): Promise<CompactFeedResponseDto> {
    return this.feedBffService.getCompactFeed(query.limit, query.after, user?.id, query.algorithm);
  }
}
