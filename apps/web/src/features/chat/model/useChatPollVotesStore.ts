import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

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

/**
 * RESET_STORES: votes are keyed by messageId without a user namespace —
 * clear on logout/switch to avoid attributing A's votes to B.
 */
registerSessionResetHandler(() => {
  useChatPollVotesStore.setState({ votes: {} });
});
