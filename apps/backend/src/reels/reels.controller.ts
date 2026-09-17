import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FastifyFileInterceptor } from '../common/interceptors/fastify-file.interceptor';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type CreateReelCommentDto,
  type CreateReelDto,
  type GetReelsQueryDto,
  type ReportReelDto,
  createReelCommentSchema,
  createReelSchema,
  getReelsQuerySchema,
  reportReelSchema,
} from '../common/contracts/reels';
import { ReelsService } from './reels.service';

@ApiTags('Reels')
@Controller('reels')
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Get('feed')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get infinite vertical feed of reels' })
  @ApiResponse({ status: 200, description: 'Reels retrieved successfully' })
  getFeed(
    @Query(new ZodValidationPipe(getReelsQuerySchema)) query: GetReelsQueryDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.reelsService.getFeed(query.limit ?? 10, query.after, user?.id);
  }

  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reels published by a specific user' })
  @ApiResponse({ status: 200, description: 'User reels retrieved successfully' })
  getUserReels(
    @Param('userId') userId: string,
    @Query(new ZodValidationPipe(getReelsQuerySchema)) query: GetReelsQueryDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.reelsService.getUserReels(userId, query.limit ?? 12, query.after, user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single reel by ID' })
  @ApiResponse({ status: 200, description: 'Reel retrieved successfully' })
  getReelById(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.reelsService.getReelById(id, user?.id);
  }

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FastifyFileInterceptor('video'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create and publish a new reel' })
  @ApiResponse({ status: 201, description: 'Reel created successfully' })
  createReel(
    @Body(new ZodValidationPipe(createReelSchema)) dto: CreateReelDto,
    @CurrentUser() user?: RequestUser,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: { thumbnailFile?: Express.Multer.File },
  ) {
    const authorId = user?.id || '3ad07908-d900-43c1-a7e6-ab7f2be6ac4c';
    return this.reelsService.createReel(authorId, dto, file, req?.thumbnailFile);
  }

  @Post(':id/like')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on reel' })
  @ApiResponse({ status: 200, description: 'Like toggled successfully' })
  toggleLike(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    const userId = user?.id || '3ad07908-d900-43c1-a7e6-ab7f2be6ac4c';
    return this.reelsService.toggleLike(id, userId);
  }

  @Post(':id/view')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a view on a reel' })
  @ApiResponse({ status: 200, description: 'View recorded' })
  recordView(
    @Param('id') id: string,
    @CurrentUser() user?: RequestUser,
    @Req() req?: { ip?: string },
  ) {
    const viewerIdentifier = user?.id ?? req?.ip ?? 'anon';
    return this.reelsService.recordView(id, viewerIdentifier);
  }

  @Post(':id/share')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register a share on a reel' })
  @ApiResponse({ status: 200, description: 'Share recorded' })
  recordShare(@Param('id') id: string) {
    return this.reelsService.recordShare(id);
  }

  @Get(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comments for a reel' })
  @ApiResponse({ status: 200, description: 'Comments retrieved' })
  getComments(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('after') after?: string,
  ) {
    return this.reelsService.getComments(id, limit ? Number(limit) : 20, after);
  }

  @Post(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a reel' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  addComment(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser | undefined,
    @Body(new ZodValidationPipe(createReelCommentSchema)) dto: CreateReelCommentDto,
  ) {
    const userId = user?.id || '3ad07908-d900-43c1-a7e6-ab7f2be6ac4c';
    return this.reelsService.addComment(id, userId, dto.content);
  }

  @Post(':id/not-interested')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a reel as not interesting' })
  @ApiResponse({ status: 200, description: 'Reel preference updated' })
  notInterested(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    const userId = user?.id || '3ad07908-d900-43c1-a7e6-ab7f2be6ac4c';
    return this.reelsService.markNotInterested(id, userId);
  }

  @Post(':id/report')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a reel' })
  @ApiResponse({ status: 200, description: 'Report registered' })
  reportReel(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser | undefined,
    @Body(new ZodValidationPipe(reportReelSchema)) dto: ReportReelDto,
  ) {
    const userId = user?.id || '3ad07908-d900-43c1-a7e6-ab7f2be6ac4c';
    return this.reelsService.reportReel(id, userId, dto.category, dto.details);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reel' })
  @ApiResponse({ status: 204, description: 'Reel deleted' })
  deleteReel(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.reelsService.deleteReel(id, user.id);
  }
}
