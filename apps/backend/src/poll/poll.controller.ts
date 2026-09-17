import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PollService } from './poll.service';
import { type CreatePollDto, createPollSchema } from '@common/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Polls')
@Controller('polls')
export class PollController {
  constructor(private readonly pollService: PollService) {}

  @Get('post/:postId')
  @ApiOperation({ summary: 'Get poll by post ID' })
  @ApiResponse({ status: 200, description: 'Poll retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Poll not found.' })
  getPollByPostId(@Param('postId') postId: string) {
    return this.pollService.getPollByPostId(postId);
  }

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a poll' })
  @ApiResponse({ status: 201, description: 'Poll created successfully.' })
  @ApiResponse({ status: 409, description: 'Post already has a poll.' })
  addPoll(
    @Body(new ZodValidationPipe(createPollSchema)) dto: CreatePollDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pollService.addPoll(user.id, dto);
  }

  @Get(':pollId/voters')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get voters (poll author only)' })
  @ApiResponse({ status: 200, description: 'Voters retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Only the poll author can view voters.' })
  @ApiResponse({ status: 404, description: 'Poll not found.' })
  getVoters(@Param('pollId') pollId: string, @CurrentUser() user: RequestUser) {
    return this.pollService.getVoters(pollId, user.id);
  }

  @Delete(':pollId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Delete a poll' })
  @ApiResponse({ status: 200, description: 'Poll deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Poll not found.' })
  deletePoll(@Param('pollId') pollId: string, @CurrentUser() user: RequestUser) {
    return this.pollService.deletePoll(pollId, user.id);
  }

  @Post(':pollId/vote/:optionId')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Vote on a poll option' })
  @ApiResponse({ status: 201, description: 'Vote added successfully.' })
  @ApiResponse({ status: 409, description: 'Already voted.' })
  @ApiResponse({ status: 410, description: 'Poll expired or inactive.' })
  addVote(
    @Param('pollId') pollId: string,
    @Param('optionId') optionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.pollService.addVote(pollId, optionId, user.id);
  }

  @Delete(':pollId/vote')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Remove your vote' })
  @ApiResponse({ status: 200, description: 'Vote removed successfully.' })
  @ApiResponse({ status: 404, description: 'Vote not found.' })
  deleteVote(@Param('pollId') pollId: string, @CurrentUser() user: RequestUser) {
    return this.pollService.deleteVote(pollId, user.id);
  }
}
