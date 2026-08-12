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
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { FollowersService } from './followers.service';
import { GetFollowersQueryDto } from './dto/get-followers-query.dto';
import type {
  FollowActionResult,
  GetFollowersResult,
  GetFollowRequestsResult,
} from './types/followers.types';

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

  @Get('me/follow-requests')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my incoming pending follow requests' })
  @ApiResponse({ status: 200, description: 'Paginated list of pending requesters' })
  getFollowRequests(
    @CurrentUser() currentUser: RequestUser,
    @Query() query: GetFollowersQueryDto,
  ): Promise<GetFollowRequestsResult> {
    return this.followersService.getFollowRequests(currentUser.id, query.limit, query.after);
  }

  @Get('me/follow-requests/count')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Count my incoming pending follow requests' })
  @ApiResponse({ status: 200, description: 'Pending request count' })
  async getFollowRequestsCount(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<{ count: number }> {
    const count = await this.followersService.getPendingCount(currentUser.id);
    return { count };
  }

  @Post('me/follow-requests/:followerId/accept')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Accept an incoming follow request' })
  @ApiResponse({ status: 204, description: 'Request accepted' })
  @ApiResponse({ status: 404, description: 'Follow request not found' })
  acceptRequest(
    @Param('followerId') followerId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.followersService.acceptRequest(currentUser.id, followerId);
  }

  @Post('me/follow-requests/:followerId/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject an incoming follow request' })
  @ApiResponse({ status: 204, description: 'Request rejected' })
  @ApiResponse({ status: 404, description: 'Follow request not found' })
  rejectRequest(
    @Param('followerId') followerId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.followersService.rejectRequest(currentUser.id, followerId);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Follow a user (or request to follow if private)' })
  @ApiResponse({ status: 200, description: 'Followed or follow request created' })
  @ApiResponse({ status: 400, description: "Can't follow yourself" })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Already following' })
  followUser(
    @Param('id') followingId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<FollowActionResult> {
    return this.followersService.followUser(currentUser.id, followingId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unfollow a user (or cancel a pending request)' })
  @ApiResponse({ status: 204, description: 'Successfully unfollowed' })
  @ApiResponse({ status: 404, description: 'Follow relation not found' })
  unfollowUser(
    @Param('id') followingId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<void> {
    return this.followersService.unfollowUser(currentUser.id, followingId);
  }
}
