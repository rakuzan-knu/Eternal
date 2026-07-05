import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

// TODO: After merging AuthModule — replace @Headers('x-user-id') with @CurrentUser() + @UseGuards(AuthGuard)
@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  addComment(
    @Param('id') postId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    if (!userId) throw new ForbiddenException('Missing x-user-id header');
    return this.commentsService.addComment(postId, userId, dto);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({ status: 200, description: 'Comments retrieved successfully.' })
  getComments(@Param('id') postId: string) {
    return this.commentsService.getComments(postId);
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  deleteComment(@Param('id') commentId: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new ForbiddenException('Missing x-user-id header');
    return this.commentsService.deleteComment(commentId, userId);
  }
}
