import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { WatchTogetherService } from './watch-together.service';
import type {
  ResolveUrlDto,
  ResolvedMediaResponse,
  WatchTogetherSearchResponse,
  WatchTogetherVideoItem,
  RecordWatchEventDto,
  UserWatchHistoryItem,
  WatchTogetherRailsResponse,
} from './watch-together.types';

@ApiTags('Watch Together')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('watch-together')
export class WatchTogetherController {
  constructor(private readonly watchTogetherService: WatchTogetherService) {}

  @Get('youtube/trending')
  @ApiOperation({ summary: 'Get trending YouTube videos for Watch Together media discovery' })
  @ApiQuery({ name: 'regionCode', required: false, type: String })
  getTrending(@Query('regionCode') regionCode?: string): Promise<WatchTogetherVideoItem[]> {
    return this.watchTogetherService.getTrending(regionCode || 'US');
  }

  @Get('youtube/search')
  @ApiOperation({ summary: 'Search YouTube videos with high-res thumbnails and parsed durations' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'pageToken', required: false, type: String })
  search(
    @Query('q') query: string,
    @Query('pageToken') pageToken?: string,
  ): Promise<WatchTogetherSearchResponse> {
    return this.watchTogetherService.search(query || '', pageToken);
  }

  @Post('resolve-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and safely resolve media URL with SSRF protection' })
  resolveUrl(@Body() body: ResolveUrlDto): Promise<ResolvedMediaResponse> {
    return this.watchTogetherService.resolveUrl(body?.url || '');
  }

  @Post('history/record')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Record user watch time engagement and update time-decay interest profile',
  })
  recordWatchEvent(@CurrentUser() user: RequestUser, @Body() dto: RecordWatchEventDto) {
    return this.watchTogetherService.recordWatchEvent(user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get recent 30-day watch history for current user' })
  getUserWatchHistory(@CurrentUser() user: RequestUser): Promise<UserWatchHistoryItem[]> {
    return this.watchTogetherService.getUserWatchHistory(user.id);
  }

  @Get('recommendations/rails')
  @ApiOperation({
    summary:
      'Get personalized recommendation rails (Exploitation/Exploration 70/30, Hard-filtered against 30-day repeats)',
  })
  getRecommendedRails(@CurrentUser() user: RequestUser): Promise<WatchTogetherRailsResponse> {
    return this.watchTogetherService.getRecommendedRails(user.id);
  }
}
