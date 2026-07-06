import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-users.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get public user profile by ID' })
  @ApiResponse({ status: 200, description: 'Profile retrieved', type: UserProfileDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  getProfile(@Param('id') id: string): Promise<UserProfileDto> {
    return this.usersService.getProfile(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserProfileDto })
  @ApiResponse({ status: 400, description: 'No fields provided or validation error' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or username already taken' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserProfileDto> {
    return this.usersService.updateUser(id, dto);
  }
}
