import type { CreatePollDto } from '@common/contracts';

export interface IPollRepository {
  findPostById(postId: string): Promise<{ id: string; authorId: string } | null>;
  getPollByPostId(postId: string): Promise<unknown>;
  findPollById(pollId: string): Promise<{
    id: string;
    authorId: string;
    isActive: boolean;
    expiresAt: Date | null;
    options: { id: string }[];
  } | null>;
  findVoters(
    pollId: string,
  ): Promise<{ optionId: string; user: { id: string; username: string } }[]>;
  findVote(pollId: string, userId: string): Promise<{ id: string } | null>;
  addPoll(authorId: string, dto: CreatePollDto): Promise<void>;
  deletePoll(pollId: string): Promise<void>;
  addVote(pollId: string, optionId: string, userId: string): Promise<void>;
  deleteVote(pollId: string, userId: string): Promise<void>;
}
export const POLL_REPOSITORY = Symbol('POLL_REPOSITORY');
