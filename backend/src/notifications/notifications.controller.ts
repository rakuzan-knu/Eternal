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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import type {
  GetNotificationsQueryDto,
  NotificationFilterType,
  UpdateNotificationSettingsDto,
} from '@common/contracts';
import { getNotificationsQuerySchema, updateNotificationSettingsSchema } from '@common/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated notifications for current user with filtering' })
  @ApiResponse({ status: 200, description: 'Notifications returned successfully.' })
  getNotifications(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(getNotificationsQuerySchema)) query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getNotifications(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count breakdown' })
  @ApiResponse({ status: 200, description: 'Unread counts returned successfully.' })
  getUnreadCounts(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getUnreadCounts(user.id);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get current user notification settings' })
  @ApiResponse({ status: 200, description: 'Settings returned successfully.' })
  getSettings(@CurrentUser() user: RequestUser) {
    return this.notificationsService.getSettings(user.id);
  }

  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully.' })
  updateSettings(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(updateNotificationSettingsSchema))
    body: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(user.id, body);
  }

  @Post('mute-author/:actorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute notifications from specific author' })
  @ApiResponse({ status: 200, description: 'Author notifications muted.' })
  muteAuthor(@Param('actorId') actorId: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.muteAuthor(user.id, actorId);
  }

  @Delete('mute-author/:actorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unmute notifications from specific author' })
  @ApiResponse({ status: 200, description: 'Author notifications unmuted.' })
  unmuteAuthor(@Param('actorId') actorId: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.unmuteAuthor(user.id, actorId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  markAllAsRead(@CurrentUser() user: RequestUser, @Query('type') type?: string) {
    return this.notificationsService.markAllAsRead(
      user.id,
      type as NotificationFilterType | undefined,
    );
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  @ApiResponse({ status: 404, description: 'Notification not found or unauthorized.' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a single notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Notification not found or unauthorized.' })
  deleteNotification(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notificationsService.deleteNotification(id, user.id);
  }
}
