import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  getAllPosts(
    @Query('limit') limit: number = 10,
    @Query('after') after?: string,
  ) {
    return this.postsService.getAllPosts(Number(limit), after);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully.',
  })
  createPost(@Body() dto: CreatePostDto, @Body('author-id') authorId: string) {
    return this.postsService.createPost(dto, authorId);
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
  editPost(@Param('id') id: string, @Body() dto: EditPostDto) {
    return this.postsService.editPost(id, dto);
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
  deletePost(@Param('id') id: string) {
    return this.postsService.deletePost(id);
  }
}
