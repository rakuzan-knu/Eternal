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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { MessagesService } from './messages.service';
import {
  type DeleteMessageDto,
  type EditMessageDto,
  type ForwardMessageDto,
  type ForwardMultipleMessagesDto,
  type BatchDeleteMessagesDto,
  type GetMessagesQueryDto,
  type ReactToMessageDto,
  type SearchMessagesQueryDto,
  type SendMessageDto,
  type GetChatActivityQueryDto,
  type GetMessagesAroundDateQueryDto,
  deleteMessageSchema,
  batchDeleteMessagesSchema,
  editMessageSchema,
  forwardMessageSchema,
  forwardMultipleMessagesSchema,
  getMessagesQuerySchema,
  getChatActivityQuerySchema,
  getMessagesAroundDateQuerySchema,
  reactToMessageSchema,
  searchMessagesQuerySchema,
  sendMessageSchema,
} from '@common/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@ApiTags('Messenger / Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('activity')
  @ApiOperation({ summary: 'Get monthly message activity map for chat calendar date picker' })
  getActivity(
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(getChatActivityQuerySchema)) query: GetChatActivityQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getActivityMap(
      conversationId,
      query.year,
      query.month,
      query.timezone,
      user.id,
    );
  }

  @Get('around-date')
  @ApiOperation({ summary: 'Get messages context window centered on a target date' })
  getAroundDate(
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(getMessagesAroundDateQuerySchema))
    query: GetMessagesAroundDateQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getAroundDate(conversationId, query.date, user.id, query.limit);
  }

  @Get('around/:messageId')
  @ApiOperation({ summary: 'Get messages context window centered on target message ID' })
  getAround(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getAround(conversationId, messageId, user.id);
  }

  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  @Throttle({ sensitive: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Batch delete up to 50 messages' })
  batchDelete(
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(batchDeleteMessagesSchema)) dto: BatchDeleteMessagesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.batchDelete(conversationId, user.id, dto);
  }

  @Post('batch-forward')
  @HttpCode(HttpStatus.OK)
  @Throttle({ sensitive: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Batch forward up to 50 messages' })
  batchForward(
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(forwardMultipleMessagesSchema)) dto: ForwardMultipleMessagesDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.batchForward(conversationId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated messages in a conversation' })
  getMessages(
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(getMessagesQuerySchema)) query: GetMessagesQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getMessages(conversationId, user.id, query);
  }

  @Post('attachments')
  @Throttle({ sensitive: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload attachment for conversation message' })
  uploadAttachment(
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.uploadAttachment(conversationId, user.id, file);
  }

  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60_000 }, sensitive: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Full-text search messages in a conversation' })
  search(
    @Param('conversationId') conversationId: string,
    @Query(new ZodValidationPipe(searchMessagesQuerySchema)) query: SearchMessagesQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.search(conversationId, user.id, query);
  }

  @Post()
  @Throttle({ sensitive: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message' })
  send(
    @Param('conversationId') conversationId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.send(conversationId, user.id, dto);
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit a message (sender only)' })
  edit(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(editMessageSchema)) dto: EditMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.edit(messageId, user.id, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message' })
  delete(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(deleteMessageSchema)) dto: DeleteMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(messageId, user.id, dto);
  }

  @Post(':messageId/forward')
  @ApiOperation({ summary: 'Forward a message to one or more conversations' })
  forward(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(forwardMessageSchema)) dto: ForwardMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.forward(messageId, user.id, dto);
  }

  @Post(':messageId/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  addReaction(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(reactToMessageSchema)) dto: ReactToMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.addReaction(messageId, user.id, dto);
  }

  @Delete(':messageId/reactions/:emoji')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  removeReaction(
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.removeReaction(messageId, user.id, emoji);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  markRead(@Param('conversationId') conversationId: string, @CurrentUser() user: RequestUser) {
    return this.service.markRead(conversationId, user.id);
  }

  @Post(':messageId/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Pin a message in a conversation' })
  pin(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.pinMessage(conversationId, messageId, user.id);
  }

  @Delete(':messageId/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unpin a message' })
  unpin(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.unpinMessage(conversationId, messageId, user.id);
  }
}
