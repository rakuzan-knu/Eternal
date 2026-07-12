import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated feed of posts' })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully.',
  })
  getAllPosts(@Query() query: GetPostsQueryDto) {
    return this.postsService.getAllPosts(query.limit, query.after);
  }
  @UseGuards(AuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully.',
  })
  createPost(@Body() dto: CreatePostDto, @CurrentUser() user: RequestUser) {
    return this.postsService.createPost(dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  getPostById(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a post' })
  @ApiBody({ type: EditPostDto })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  editPost(@Param('id') id: string, @Body() dto: EditPostDto, @CurrentUser() user: RequestUser) {
    return this.postsService.editPost(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found.',
  })
  @UseGuards(AuthGuard)
  deletePost(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.deletePost(id, user.id);
  }
}
