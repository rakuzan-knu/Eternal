import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PollVotesState {
  votes: Record<string, string>; // messageId -> optionId
  setVote: (messageId: string, optionId: string) => void;
  getVote: (messageId: string) => string | undefined;
}

export const useChatPollVotesStore = create<PollVotesState>()(
  persist(
    (set, get) => ({
      votes: {},
      setVote: (messageId, optionId) =>
        set((state) => ({
          votes: { ...state.votes, [messageId]: optionId },
        })),
      getVote: (messageId) => get().votes[messageId],
    }),
    {
      name: 'eternal_chat_poll_votes',
    },
  ),
);
