import {
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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { FollowersService } from './followers.service';
import { GetFollowersQueryDto } from './dto/get-followers-query.dto';
import type { GetFollowersResult } from './types/followers.types';

@ApiTags('Followers')
@Controller('users')
export class FollowersController {
  constructor(private readonly followersService: FollowersService) {}

  @Get(':id/followers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiResponse({ status: 200, description: 'Paginated list of followers' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowers(
    @Param('id') id: string,
    @Query() query: GetFollowersQueryDto,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<GetFollowersResult> {
    return this.followersService.getFollowers(id, query.limit, query.after, currentUser?.id);
  }

  @Get(':id/following')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiResponse({ status: 200, description: 'Paginated list of following' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getFollowing(
    @Param('id') id: string,
    @Query() query: GetFollowersQueryDto,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<GetFollowersResult> {
    return this.followersService.getFollowing(id, query.limit, query.after, currentUser?.id);
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
