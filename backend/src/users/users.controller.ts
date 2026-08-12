import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { UpdateUserDto } from './dto/update-users.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { SetUserAliasDto } from './dto/set-user-alias.dto';
import { UsersService } from './users.service';
import { PostsService } from '../posts/posts.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { GetPostsQueryDto } from '../posts/dto/get-posts-query.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly postsService: PostsService,
  ) {}

  @Get('by-username/:username')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user profile by username' })
  @ApiResponse({ status: 200, description: 'Profile retrieved', type: UserProfileDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfileByUsername(
    @Param('username') username: string,
    @CurrentUser() viewer?: RequestUser,
  ): Promise<UserProfileDto> {
    return this.usersService.getProfileByUsername(username, viewer?.id ?? null);
  }

  @Get('me/saved-posts')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get my saved/bookmarked posts feed' })
  @ApiResponse({ status: 200, description: 'Saved posts retrieved successfully' })
  getSavedPosts(@Query() query: GetPostsQueryDto, @CurrentUser() user: RequestUser) {
    return this.postsService.getSavedPosts(user.id, query.limit, query.after);
  }

  @Get(':id/posts')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated posts created by a specific user' })
  @ApiResponse({ status: 200, description: 'User posts retrieved successfully' })
  getUserPosts(
    @Param('id') id: string,
    @Query() query: GetPostsQueryDto,
    @CurrentUser() viewer?: RequestUser,
  ) {
    return this.postsService.getUserPosts(id, query.limit, query.after, viewer?.id);
  }

  @Get(':id/reposts')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated posts reposted by a specific user' })
  @ApiResponse({ status: 200, description: 'User reposts retrieved successfully' })
  getUserReposts(
    @Param('id') id: string,
    @Query() query: GetPostsQueryDto,
    @CurrentUser() viewer?: RequestUser,
  ) {
    return this.postsService.getUserReposts(id, query.limit, query.after, viewer?.id);
  }

  @Post(':id/block')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: "Can't block yourself" })
  @ApiResponse({ status: 404, description: 'User not found' })
  blockUser(@Param('id') targetId: string, @CurrentUser() user: RequestUser) {
    return this.usersService.blockUser(user.id, targetId);
  }

  @Delete(':id/block')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  unblockUser(@Param('id') targetId: string, @CurrentUser() user: RequestUser) {
    return this.usersService.unblockUser(user.id, targetId);
  }

  @Post(':id/alias')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set private custom alias for a user' })
  @ApiResponse({ status: 200, description: 'Alias set successfully' })
  setUserAlias(
    @Param('id') targetId: string,
    @Body() dto: SetUserAliasDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.setUserAlias(user.id, targetId, dto.alias);
  }

  @Delete(':id/alias')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete private custom alias for a user' })
  @ApiResponse({ status: 200, description: 'Alias deleted successfully' })
  deleteUserAlias(@Param('id') targetId: string, @CurrentUser() user: RequestUser) {
    return this.usersService.deleteUserAlias(user.id, targetId);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public user profile by ID (privacy-aware)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved', type: UserProfileDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfile(
    @Param('id') id: string,
    @CurrentUser() viewer: RequestUser | null,
  ): Promise<UserProfileDto> {
    return this.usersService.getProfileFor(id, viewer?.id ?? null);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserProfileDto })
  @ApiResponse({ status: 400, description: 'No fields provided or validation error' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or username already taken' })
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ): Promise<UserProfileDto> {
    if (user.id !== id) throw new ForbiddenException('You can only update your own profile');
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user account permanently' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Incorrect password' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteUser(
    @Param('id') id: string,
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{ success: true }> {
    if (user.id !== id) throw new ForbiddenException('You can only delete your own account');
    await this.usersService.deleteAccount(id, dto.password);
    return { success: true };
  }
}
