import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { FollowersService } from './followers.service';

@ApiTags('Followers')
@Controller('users')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Get(':id/followers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiResponse({ status: 200, description: 'List of followers' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowers(@Param('id') id: string): Promise<User[]> {
    return this.followersService.getFollowers(id);
  }

  @Get(':id/following')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiResponse({ status: 200, description: 'List of following' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowing(@Param('id') id: string): Promise<User[]> {
    return this.followersService.getFollowing(id);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({ status: 204, description: 'Successfully followed' })
  @ApiResponse({ status: 400, description: "Can't follow yourself" })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already following' })
  followUser(
    @Param('id') followingId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.followersService.followUser(currentUser.id, followingId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({ status: 204, description: 'Successfully unfollowed' })
  @ApiResponse({ status: 404, description: 'Follow relation not found' })
  unfollowUser(
    @Param('id') followingId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.followersService.unfollowUser(currentUser.id, followingId);
  }
}
