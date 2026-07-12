import { Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

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
  @UseGuards(AuthGuard)
  addLike(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.likesService.likePost(id, user.id);
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
  @UseGuards(AuthGuard)
  unLike(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.likesService.unlikePost(id, user.id);
  }
}
