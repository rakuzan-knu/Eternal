import { describe, it, expect, beforeEach } from 'vitest';
import { useChatPollVotesStore } from '../useChatPollVotesStore';

describe('useChatPollVotesStore', () => {
  beforeEach(() => {
    useChatPollVotesStore.setState({ votes: {} });
  });

  it('sets and gets poll option vote for a message', () => {
    expect(useChatPollVotesStore.getState().getVote('msg-1')).toBeUndefined();

    useChatPollVotesStore.getState().setVote('msg-1', 'opt-2');
    expect(useChatPollVotesStore.getState().getVote('msg-1')).toBe('opt-2');
  });
});
