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
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import {
  type CreateCommentDto,
  type GetCommentsQueryDto,
  createCommentSchema,
  getCommentsQuerySchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  addComment(
    @Param('id') postId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCommentSchema)) dto: CreateCommentDto,
  ) {
    return this.commentsService.addComment(postId, user.id, dto);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully.' })
  getComments(
    @Param('id') postId: string,
    @Query(new ZodValidationPipe(getCommentsQuerySchema)) query: GetCommentsQueryDto,
  ) {
    return this.commentsService.getComments(postId, query.limit, query.after);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  deleteComment(@Param('id') commentId: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.deleteComment(commentId, user.id);
  }
}
