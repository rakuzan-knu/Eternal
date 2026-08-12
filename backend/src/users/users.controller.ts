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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { UpdateUserDto } from './dto/update-users.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
