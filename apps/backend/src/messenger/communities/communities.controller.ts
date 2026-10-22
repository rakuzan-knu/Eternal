import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  communityPageSchema,
  createCommunitySchema,
  createCommunityChannelSchema,
  createCommunityInviteSchema,
  communityRoleSchema,
  communityTransferSchema,
  communityChannelLayoutSchema,
  communityChannelArchiveSchema,
  communityChannelAccessSchema,
  type CommunityChannelAccessDto,
  type CommunityChannelArchiveDto,
  type CommunityChannelLayoutDto,
  type CommunityPageQuery,
  type CreateCommunityDto,
  type CreateCommunityChannelDto,
  type CreateCommunityInviteDto,
  type CommunityRoleDto,
  type CommunityTransferDto,
} from '@common/contracts';
import { CommunitiesService } from './communities.service';

@ApiTags('Messenger / Communities')
@Controller('messenger/communities')
export class CommunitiesController {
  constructor(private readonly service: CommunitiesService) {}

  @Get()
  list(@Query(new ZodValidationPipe(communityPageSchema)) query: CommunityPageQuery) {
    return this.service.list(query);
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  mine(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(communityPageSchema)) query: CommunityPageQuery,
  ) {
    return this.service.list(query, user.id);
  }

  @Get('invites/:token')
  preview(@Param('token') token: string) {
    return this.service.preview(token);
  }

  @Post('invites/:token/accept')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  accept(@Param('token') token: string, @CurrentUser() user: RequestUser) {
    return this.service.accept(token, user.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  create(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCommunitySchema)) dto: CreateCommunityDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCommunitySchema)) dto: CreateCommunityDto,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Get(':id/channels')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  channels(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.service.channels(id, user.id);
  }

  @Post(':id/channels')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  createChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCommunityChannelSchema)) dto: CreateCommunityChannelDto,
  ) {
    return this.service.createChannel(id, user.id, dto);
  }

  @Patch(':id/channel-layout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  updateChannelLayout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(communityChannelLayoutSchema)) dto: CommunityChannelLayoutDto,
  ) {
    return this.service.updateChannelLayout(id, user.id, dto);
  }

  @Get(':id/channels/:channelId/access')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  channelAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.channelAccess(id, channelId, user.id);
  }

  @Patch(':id/channels/:channelId/access')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  setChannelAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(communityChannelAccessSchema)) dto: CommunityChannelAccessDto,
  ) {
    return this.service.setChannelAccess(id, channelId, user.id, dto);
  }

  @Patch(':id/channels/:channelId/archive')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  archiveChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('channelId', ParseUUIDPipe) channelId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(communityChannelArchiveSchema)) dto: CommunityChannelArchiveDto,
  ) {
    return this.service.setChannelArchived(id, channelId, user.id, dto);
  }

  @Get(':id/members')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  members(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(communityPageSchema)) query: CommunityPageQuery,
  ) {
    return this.service.members(id, user.id, query);
  }

  @Get(':id/bans')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  bans(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(communityPageSchema)) query: CommunityPageQuery,
  ) {
    return this.service.members(id, user.id, query, true);
  }

  @Post(':id/invites')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  createInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createCommunityInviteSchema)) dto: CreateCommunityInviteDto,
  ) {
    return this.service.createInvite(id, user.id, dto);
  }

  @Get(':id/invites')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  invites(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(communityPageSchema)) query: CommunityPageQuery,
  ) {
    return this.service.invites(id, user.id, query);
  }

  @Delete(':id/invites/:inviteId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.revoke(id, inviteId, user.id);
  }

  @Delete(':id/membership')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  leave(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user.id, user.id, 'leave');
  }

  @Delete(':id/members/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  kick(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.id, targetId, 'kick');
  }

  @Post(':id/members/:userId/ban')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  ban(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.id, targetId, 'ban');
  }

  @Delete(':id/bans/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  unban(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.remove(id, user.id, targetId, 'unban');
  }

  @Patch(':id/members/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  role(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetId: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(communityRoleSchema)) dto: CommunityRoleDto,
  ) {
    return this.service.setRole(id, user.id, targetId, dto);
  }

  @Post(':id/transfer')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(communityTransferSchema)) dto: CommunityTransferDto,
  ) {
    return this.service.transfer(id, user.id, dto.userId);
  }
}
