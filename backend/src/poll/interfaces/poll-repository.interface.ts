import { type CreatePollDto } from '@common/contracts';

export interface IPollRepository {
  getPollByPostId(postId: string): Promise<unknown>;
  addPoll(authorId: string, dto: CreatePollDto): Promise<void>;
  deletePoll(pollId: string): Promise<void>;
  addVote(pollId: string, optionId: string, userId: string): Promise<void>;
  deleteVote(pollId: string, userId: string): Promise<void>;
}
export const POLL_REPOSITORY = Symbol('POLL_REPOSITORY');
