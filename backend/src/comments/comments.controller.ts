import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Comments')
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:id/comments')
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  addComment(
    @Param('id') postId: string,
    @Body('userId') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.addComment(postId, userId, dto);
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Get comments for a post' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  getComments(@Param('id') postId: string) {
    return this.commentsService.getComments(postId);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found.',
  })
  deleteComment(
    @Param('id') commentId: string,
    @Body('userId') userId: string,
  ) {
    return this.commentsService.deleteComment(commentId, userId);
  }
}
