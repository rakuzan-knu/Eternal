import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { SoundboardService } from './soundboard.service';
import type { CreateSoundboardDto } from './soundboard.types';
import { MessengerGateway } from '../gateway/messenger.gateway';

@ApiTags('Soundboard')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('soundboard')
export class SoundboardController {
  constructor(
    private readonly soundboardService: SoundboardService,
    private readonly gateway: MessengerGateway,
  ) {}

  @Get('my')
  @ApiOperation({ summary: 'Get all custom soundboard sounds for current user account' })
  getMySounds(@CurrentUser() user: RequestUser) {
    return this.soundboardService.getMySounds(user.id);
  }

  @Post('my')
  @ApiOperation({ summary: 'Add a new custom soundboard sound to current user account' })
  createMySound(@CurrentUser() user: RequestUser, @Body() dto: CreateSoundboardDto) {
    return this.soundboardService.createMySound(user.id, user.username || 'User', dto);
  }

  @Delete('my/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a sound from current user account' })
  deleteMySound(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.soundboardService.deleteMySound(user.id, id);
  }

  @Get('chat/:conversationId')
  @ApiOperation({ summary: 'Get all shared soundboard sounds for a conversation/chat' })
  getChatSounds(@CurrentUser() user: RequestUser, @Param('conversationId') conversationId: string) {
    return this.soundboardService.getChatSounds(conversationId, user.id);
  }

  @Post('chat/:conversationId')
  @ApiOperation({ summary: 'Add a shared soundboard sound to a conversation/chat' })
  async createChatSound(
    @CurrentUser() user: RequestUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: CreateSoundboardDto,
  ) {
    const item = await this.soundboardService.createChatSound(
      conversationId,
      user.id,
      user.username || 'User',
      dto,
    );

    // Broadcast to all participants in this chat in real-time
    this.gateway.broadcastChatSoundAdded(conversationId, item);

    return item;
  }

  @Delete('chat/:conversationId/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a shared soundboard sound from a conversation/chat' })
  async deleteChatSound(
    @CurrentUser() user: RequestUser,
    @Param('conversationId') conversationId: string,
    @Param('id') id: string,
  ) {
    const result = await this.soundboardService.deleteChatSound(conversationId, id, user.id);

    // Broadcast deletion to all participants in this chat in real-time
    this.gateway.broadcastChatSoundDeleted(conversationId, id);

    return result;
  }
}
