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
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { MessagesService } from './messages.service';
import {
  DeleteMessageDto,
  EditMessageDto,
  ForwardMessageDto,
  GetMessagesQueryDto,
  ReactToMessageDto,
  SearchMessagesQueryDto,
  SendMessageDto,
} from '../dto/message.dto';

@ApiTags('Messenger / Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated messages in a conversation' })
  getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.getMessages(conversationId, user.id, query);
  }

  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Full-text search messages in a conversation' })
  search(
    @Param('conversationId') conversationId: string,
    @Query() query: SearchMessagesQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.search(conversationId, user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  send(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.send(conversationId, user.id, dto);
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit a message (sender only)' })
  edit(
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.edit(messageId, user.id, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message' })
  delete(
    @Param('messageId') messageId: string,
    @Body() dto: DeleteMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.delete(messageId, user.id, dto);
  }

  @Post(':messageId/forward')
  @ApiOperation({ summary: 'Forward a message to one or more conversations' })
  forward(
    @Param('messageId') messageId: string,
    @Body() dto: ForwardMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.forward(messageId, user.id, dto);
  }

  @Post(':messageId/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  addReaction(
    @Param('messageId') messageId: string,
    @Body() dto: ReactToMessageDto,
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
