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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CommentsService } from './comments.service';
import { CommentsMediaService } from './comments-media.service';
import {
  type CreateCommentDto,
  type GetCommentsQueryDto,
  createCommentSchema,
  getCommentsQuerySchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    private readonly mediaService: CommentsMediaService,
  ) {}

  @Post('posts/:id/comments')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 15, ttl: 60_000 }, sensitive: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Add a comment or reply to a post' })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed or too many mentions.' })
  @ApiResponse({ status: 403, description: 'Forbidden due to block settings.' })
  @ApiResponse({ status: 404, description: 'Post or parent comment not found.' })
  @ApiResponse({ status: 409, description: 'Duplicate comment or concurrent submission.' })
  addComment(
    @Param('id') postId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCommentSchema)) dto: CreateCommentDto,
  ) {
    return this.commentsService.addComment(postId, user.id, dto);
  }

  @Post('comments/media')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 }, sensitive: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and sanitize comment image attachment' })
  @ApiResponse({ status: 201, description: 'Image sanitized and uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid file format or size exceeds 5MB.' })
  uploadCommentMedia(@UploadedFile() file: Express.Multer.File) {
    return this.mediaService.processCommentImage(file);
  }

  @Get('posts/:id/comments')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get root comments for a post' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully.' })
  getComments(
    @Param('id') postId: string,
    @Query(new ZodValidationPipe(getCommentsQuerySchema)) query: GetCommentsQueryDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.commentsService.getComments(postId, query.limit, query.after, user?.id);
  }

  @Get('comments/:id/replies')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get replies for a comment thread' })
  @ApiResponse({ status: 200, description: 'Replies retrieved successfully.' })
  getReplies(
    @Param('id') commentId: string,
    @Query(new ZodValidationPipe(getCommentsQuerySchema)) query: GetCommentsQueryDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.commentsService.getReplies(commentId, query.limit, query.after, user?.id);
  }

  @Post('comments/:id/like')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on a comment' })
  @ApiResponse({ status: 200, description: 'Like toggled successfully.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  toggleLike(@Param('id') commentId: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.toggleCommentLike(commentId, user.id);
  }

  @Post('comments/:id/pin')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle pin on a root comment (post author only)' })
  @ApiResponse({ status: 200, description: 'Pin toggled successfully.' })
  @ApiResponse({ status: 403, description: 'Only post author can pin comments.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  togglePin(@Param('id') commentId: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.togglePinComment(commentId, user.id);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  deleteComment(@Param('id') commentId: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.deleteComment(commentId, user.id);
  }
}
