import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ShowcaseService } from './showcase.service';
import { MediaProxyService, type ShowcaseTrackItem } from './media-proxy.service';
import {
  type ProfileShowcaseDto,
  type UpdateShowcaseDto,
  type MediaSearchResultDto,
  type MediaDetailsResponseDto,
  type SearchMediaDto,
  type SearchTracksDto,
  updateShowcaseSchema,
  searchMediaSchema,
  searchTracksSchema,
  ShowcaseMediaType,
} from '@common/contracts';
import { LowPriority } from '../common/resilience/request-priority.decorator';
import { ConditionalHttpCache } from '../common/cache/etag.interceptor';

@ApiTags('Showcase')
@Controller('users')
export class ShowcaseController {
  constructor(
    private readonly showcaseService: ShowcaseService,
    private readonly mediaProxyService: MediaProxyService,
  ) {}

  @Get('showcase/search-media')
  @LowPriority()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search Anime, Games, Movies, or TV Series for showcase' })
  @ApiResponse({ status: 200, description: 'Media search results retrieved' })
  searchMedia(
    @Query(new ZodValidationPipe(searchMediaSchema)) dto: SearchMediaDto,
  ): Promise<MediaSearchResultDto[]> {
    const mediaType = (
      dto.type && dto.type.toUpperCase() in ShowcaseMediaType
        ? dto.type.toUpperCase()
        : ShowcaseMediaType.GAME
    ) as ShowcaseMediaType;
    return this.mediaProxyService.searchMedia(dto.q || '', mediaType);
  }

  @Get('showcase/search-tracks')
  @LowPriority()
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search music tracks for Profile Anthem' })
  @ApiResponse({ status: 200, description: 'Track search results retrieved' })
  searchTracks(
    @Query(new ZodValidationPipe(searchTracksSchema)) dto: SearchTracksDto,
  ): Promise<ShowcaseTrackItem[]> {
    return this.mediaProxyService.searchTracks(dto.q || '');
  }

  @Get('showcase/media-details')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get official screenshots, trailer, and detailed metadata for media item',
  })
  @ApiResponse({ status: 200, description: 'Media details retrieved' })
  getMediaDetails(
    @Query('title') title: string = '',
    @Query('type') typeStr: string = 'GAME',
  ): Promise<MediaDetailsResponseDto | null> {
    const mediaType = (
      typeStr.toUpperCase() in ShowcaseMediaType ? typeStr.toUpperCase() : ShowcaseMediaType.GAME
    ) as ShowcaseMediaType;
    return this.mediaProxyService.getMediaDetails(title || '', mediaType);
  }

  @Get(':username/showcase')
  @ConditionalHttpCache()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user profile showcase with relationship-aware privacy' })
  @ApiResponse({ status: 200, description: 'Showcase retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getShowcase(
    @Param('username') username: string,
    @CurrentUser() viewer?: RequestUser,
  ): Promise<ProfileShowcaseDto> {
    return this.showcaseService.getShowcase(username, viewer?.id ?? null);
  }

  @Patch('me/showcase')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own profile showcase' })
  @ApiResponse({ status: 200, description: 'Showcase updated successfully' })
  updateShowcase(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateShowcaseSchema)) dto: UpdateShowcaseDto,
  ): Promise<ProfileShowcaseDto> {
    return this.showcaseService.updateShowcase(user.id, dto);
  }
}
