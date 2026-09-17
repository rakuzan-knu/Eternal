import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StoriesService } from './stories.service';
import { Throttle } from '@nestjs/throttler';
import { safeJsonParse } from '../common/utils/json.util';
import {
  CreateStoryDtoSchema,
  ReactToStoryDtoSchema,
  ReplyToStoryDtoSchema,
  VoteStoryPollDtoSchema,
  type ReactToStoryDto,
  type ReplyToStoryDto,
  type VoteStoryPollDto,
  type CreateStoryDto,
} from '@common/contracts';

@ApiTags('Stories')
@Controller('stories')
export class StoriesController {
  private readonly logger = new Logger(StoriesController.name);

  constructor(private readonly storiesService: StoriesService) {}

  @Get('feed')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active stories feed grouped by user' })
  @ApiResponse({ status: 200, description: 'Active stories feed retrieved successfully.' })
  getFeed(@CurrentUser() user: RequestUser) {
    return this.storiesService.getStoriesFeed(user.id);
  }

  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active stories of a specific user' })
  getUserStories(@Param('userId') targetUserId: string, @CurrentUser() user?: RequestUser) {
    return this.storiesService.getUserStories(targetUserId, user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024, files: 1 } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create and publish a new story' })
  @HttpCode(HttpStatus.CREATED)
  createStory(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
    @Body()
    body?: {
      mediaType?: CreateStoryDto['mediaType'];
      caption?: string;
      overlays?: string | CreateStoryDto['overlays'];
      privacy?: CreateStoryDto['privacy'];
      backgroundColor?: string;
    },
  ) {
    // Parse overlays and other fields from multipart formData if sent as strings
    let overlays = body?.overlays;
    if (typeof overlays === 'string') {
      const parsed = safeJsonParse<CreateStoryDto['overlays']>(overlays, {
        maxSizeBytes: 256 * 1024,
      });
      overlays = parsed ?? [];
    }

    const rawDto: CreateStoryDto = {
      mediaType: body?.mediaType || (file ? undefined : 'IMAGE'),
      caption: body?.caption,
      overlays: Array.isArray(overlays) ? overlays : undefined,
      privacy: body?.privacy || 'ALL_FOLLOWERS',
      backgroundColor: body?.backgroundColor,
    };

    const validatedDto = CreateStoryDtoSchema.parse(rawDto);
    return this.storiesService.createStory(user.id, validatedDto, file);
  }

  @Post(':id/view')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark story as viewed' })
  @HttpCode(HttpStatus.OK)
  async viewStory(@Param('id') storyId: string, @CurrentUser() user: RequestUser) {
    await this.storiesService.recordView(storyId, user.id);
    return { success: true };
  }

  @Post(':id/react')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'React to story with emoji' })
  @HttpCode(HttpStatus.OK)
  reactToStory(
    @Param('id') storyId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(ReactToStoryDtoSchema)) dto: ReactToStoryDto,
  ) {
    return this.storiesService.recordReaction(storyId, user.id, dto);
  }

  @Post(':id/poll-vote')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on an overlay poll in story' })
  @HttpCode(HttpStatus.OK)
  votePoll(
    @Param('id') storyId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(VoteStoryPollDtoSchema)) dto: VoteStoryPollDto,
  ) {
    return this.storiesService.recordPollVote(storyId, user.id, dto);
  }

  @Post(':id/reply')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a story in Direct Messages' })
  @HttpCode(HttpStatus.OK)
  replyToStory(
    @Param('id') storyId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(ReplyToStoryDtoSchema)) dto: ReplyToStoryDto,
  ) {
    return this.storiesService.replyToStory(storyId, user.id, dto);
  }

  @Get(':id/viewers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get viewers, reactions, and poll results for story author' })
  getStoryViewers(@Param('id') storyId: string, @CurrentUser() user: RequestUser) {
    return this.storiesService.getStoryViewers(storyId, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own story' })
  @HttpCode(HttpStatus.OK)
  async deleteStory(@Param('id') storyId: string, @CurrentUser() user: RequestUser) {
    await this.storiesService.deleteStory(storyId, user.id);
    return { success: true };
  }

  @Get('close-friends/list')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user close friends list' })
  getCloseFriends(@CurrentUser() user: RequestUser) {
    return this.storiesService.getCloseFriends(user.id);
  }

  @Post('close-friends/:friendId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or remove user from close friends' })
  @HttpCode(HttpStatus.OK)
  toggleCloseFriend(@Param('friendId') friendId: string, @CurrentUser() user: RequestUser) {
    return this.storiesService.toggleCloseFriend(user.id, friendId);
  }
}
