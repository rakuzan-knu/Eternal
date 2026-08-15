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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import {
  type AddMembersDto,
  type CreateDirectConversationDto,
  type CreateGroupConversationDto,
  type MuteConversationDto,
  type ReportDto,
  type SetNicknameDto,
  type SetThemeDto,
  type TransferOwnershipDto,
  type UpdateGroupConversationDto,
  addMembersSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
  muteConversationSchema,
  reportSchema,
  setNicknameSchema,
  setThemeSchema,
  transferOwnershipSchema,
  updateGroupConversationSchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Messenger / Conversations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly service: ConversationsService,
    private readonly messagesService: MessagesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all conversations for the current user' })
  getAll(@CurrentUser() user: RequestUser) {
    return this.service.getConversations(user.id);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload attachment for conversation message' })
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.messagesService.uploadAttachment(id, user.id, file);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  getOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.getConversation(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation for current user' })
  deleteConversation(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.deleteConversation(id, user.id);
  }

  @Post('direct')
  @ApiOperation({ summary: 'Start or get a direct conversation' })
  createDirect(
    @Body(new ZodValidationPipe(createDirectConversationSchema)) dto: CreateDirectConversationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createDirect(user.id, dto);
  }

  @Post('group')
  @ApiOperation({ summary: 'Create a group conversation' })
  createGroup(
    @Body(new ZodValidationPipe(createGroupConversationSchema)) dto: CreateGroupConversationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.createGroup(user.id, dto);
  }

  @Patch(':id/group')
  @ApiOperation({ summary: 'Update group info (name, description)' })
  updateGroup(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGroupConversationSchema)) dto: UpdateGroupConversationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.updateGroup(id, user.id, dto);
  }

  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload group conversation avatar' })
  uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.uploadGroupAvatar(id, user.id, file);
  }

  @Post(':id/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Pin a conversation' })
  pin(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.pinConversation(id, user.id);
  }

  @Delete(':id/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unpin a conversation' })
  unpin(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.unpinConversation(id, user.id);
  }

  @Post(':id/unread')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark conversation as unread' })
  markUnread(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.markUnread(id, user.id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add members to a group' })
  addMembers(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addMembersSchema)) dto: AddMembersDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addMembers(id, user.id, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a group (admin only)' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.removeMember(id, user.id, userId);
  }

  @Delete(':id/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a group conversation' })
  leave(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.leaveConversation(id, user.id);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Transfer group ownership' })
  transferOwnership(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transferOwnershipSchema)) dto: TransferOwnershipDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.transferOwnership(id, user.id, dto);
  }

  @Post(':id/members/:userId/promote')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Promote member to admin' })
  promote(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.promoteMember(id, user.id, userId);
  }

  @Post(':id/members/:userId/demote')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Demote admin to member' })
  demote(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.demoteMember(id, user.id, userId);
  }

  @Patch(':id/nickname')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a nickname for a participant' })
  setNickname(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setNicknameSchema)) dto: SetNicknameDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.setNickname(id, user.id, dto);
  }

  @Patch(':id/theme')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set conversation theme for the current user' })
  setTheme(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setThemeSchema)) dto: SetThemeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.setTheme(id, user.id, dto);
  }

  @Patch(':id/mute')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mute/unmute notifications for a conversation' })
  mute(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(muteConversationSchema)) dto: MuteConversationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.muteConversation(id, user.id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive a conversation' })
  archive(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.archiveConversation(id, user.id);
  }

  @Delete(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unarchive a conversation' })
  unarchive(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.service.unarchiveConversation(id, user.id);
  }

  @Get('users/blocked')
  @ApiOperation({ summary: 'List users the current user has blocked' })
  getBlockedUsers(@CurrentUser() user: RequestUser) {
    return this.service.getBlockedUsers(user.id);
  }

  @Post('users/:userId/block')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Block a user' })
  block(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.service.blockUser(user.id, userId);
  }

  @Delete('users/:userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  unblock(@Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.service.unblockUser(user.id, userId);
  }

  @Post('users/:userId/report')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Report a user' })
  report(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(reportSchema)) dto: ReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.reportUser(user.id, userId, dto);
  }
}
