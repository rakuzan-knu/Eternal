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
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { GetCommentsQueryDto } from './dto/get-comments-query.dto';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @UseGuards(AuthGuard)
  addComment(
    @Param('id') postId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.addComment(postId, user.id, dto);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully.' })
  getComments(@Param('id') postId: string, @Query() query: GetCommentsQueryDto) {
    return this.commentsService.getComments(postId, query.limit, query.after);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @UseGuards(AuthGuard)
  deleteComment(@Param('id') commentId: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.deleteComment(commentId, user.id);
  }
}
