import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { EditPostDto } from './dto/edit-post.dto';
import { ReportPostDto } from './dto/report-post.dto';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated feed of posts' })
  @ApiResponse({ status: 200, description: 'Posts retrieved successfully.' })
  getAllPosts(@Query() query: GetPostsQueryDto, @CurrentUser() user?: RequestUser) {
    return this.postsService.getAllPosts(query.limit, query.after, user?.id);
  }

  @Get('explore')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get explore media posts (images and videos)' })
  @ApiResponse({ status: 200, description: 'Explore media posts retrieved successfully.' })
  getExplorePosts(@Query() query: GetPostsQueryDto, @CurrentUser() user?: RequestUser) {
    return this.postsService.getExplorePosts(query.limit ?? 9, query.after, user?.id);
  }

  @Get('hashtag/:tag')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get posts by hashtag' })
  @ApiResponse({ status: 200, description: 'Hashtag posts retrieved successfully.' })
  getPostsByHashtag(
    @Param('tag') tag: string,
    @Query() query: GetPostsQueryDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.postsService.getPostsByHashtag(tag, query.limit ?? 10, query.after, user?.id);
  }

  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search posts by text query' })
  @ApiResponse({ status: 200, description: 'Posts matching query retrieved successfully.' })
  searchPosts(
    @Query('q') q: string,
    @Query('mediaOnly') mediaOnly?: string,
    @Query() query?: GetPostsQueryDto,
    @CurrentUser() user?: RequestUser,
  ) {
    const safeQuery = typeof q === 'string' ? q : '';
    return this.postsService.searchPosts(
      safeQuery,
      query?.limit ?? 10,
      query?.after,
      user?.id,
      mediaOnly === 'true',
    );
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  getPostById(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.postsService.getPostById(id, user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('media', 5))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create a new post with optional media files' })
  @ApiBody({ type: CreatePostDto })
  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  createPost(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: RequestUser,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.postsService.createPost(dto, user.id, files);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a post' })
  @ApiBody({ type: EditPostDto })
  @ApiResponse({ status: 200, description: 'Post updated successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  editPost(@Param('id') id: string, @Body() dto: EditPostDto, @CurrentUser() user: RequestUser) {
    return this.postsService.editPost(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 200, description: 'Post deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  deletePost(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.deletePost(id, user.id);
  }

  @Post(':id/save')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save/bookmark a post' })
  @ApiResponse({ status: 200, description: 'Post saved successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  savePost(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.savePost(id, user.id);
  }

  @Delete(':id/save')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove saved/bookmarked post' })
  @ApiResponse({ status: 200, description: 'Post unsaved successfully.' })
  unsavePost(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.unsavePost(id, user.id);
  }

  @Post(':id/repost')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Repost a post' })
  @ApiResponse({ status: 200, description: 'Post reposted successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  repost(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.repost(id, user.id);
  }

  @Delete(':id/repost')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a repost' })
  @ApiResponse({ status: 200, description: 'Repost removed successfully.' })
  unrepost(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.postsService.unrepost(id, user.id);
  }

  @Post(':id/report')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Report a post for moderation review' })
  @ApiResponse({ status: 200, description: 'Post report queued successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  reportPost(
    @Param('id') id: string,
    @Body() dto: ReportPostDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.postsService.reportPost(id, user.id, dto.category, dto.details);
  }

  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track share of a post' })
  @ApiResponse({ status: 200, description: 'Post share recorded successfully.' })
  sharePost(@Param('id') id: string) {
    return this.postsService.sharePost(id);
  }
}
