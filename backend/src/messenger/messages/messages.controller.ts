import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { MessagesService } from './messages.service';
import { GetMessagesQueryDto, SearchMessagesQueryDto } from '../dto/message.dto';

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
  @ApiOperation({ summary: 'Full-text search messages in a conversation' })
  search(
    @Param('conversationId') conversationId: string,
    @Query() query: SearchMessagesQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.search(conversationId, user.id, query);
  }

  @Post('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  markRead(@Param('conversationId') conversationId: string, @CurrentUser() user: RequestUser) {
    return this.service.markRead(conversationId, user.id);
  }
}
