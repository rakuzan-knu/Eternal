import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LikesService } from './likes.service';

@ApiTags('Likes')
@Controller('posts')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':id/like')
  @ApiOperation({ summary: 'Like a post' })
  @ApiResponse({
    status: 201,
    description: 'Post liked successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  addLike(@Param('id') id: string, @Body('userId') userId: string) {
    return this.likesService.likePost(id, userId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiResponse({
    status: 200,
    description: 'Like removed successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Like or post not found.',
  })
  unLike(@Param('id') id: string, @Body('userId') userId: string) {
    return this.likesService.unlikePost(id, userId);
  }
}
