import { create } from 'zustand';

export interface TypistInfo {
  userId: string;
  username?: string;
  timestamp: number;
}

interface TypingState {
  typingByConversation: Record<string, TypistInfo[]>;
  setTypist: (conversationId: string, userId: string, isTyping: boolean, username?: string) => void;
  clearTypistsForConversation: (conversationId: string) => void;
}

const TYPING_TIMEOUT_MS = 3500;

export const useTypingStore = create<TypingState>((set) => ({
  typingByConversation: {},

  setTypist: (conversationId, userId, isTyping, username) => {
    set((state) => {
      const current = state.typingByConversation[conversationId] ?? [];
      const now = Date.now();

      if (!isTyping) {
        const next = current.filter((t) => t.userId !== userId);
        return {
          typingByConversation: {
            ...state.typingByConversation,
            [conversationId]: next,
          },
        };
      }

      const unexpired = current.filter(
        (t) => t.userId !== userId && now - t.timestamp < TYPING_TIMEOUT_MS,
      );
      const updated: TypistInfo = { userId, username, timestamp: now };

      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: [...unexpired, updated],
        },
      };
    });
  },

  clearTypistsForConversation: (conversationId) => {
    set((state) => {
      const next = { ...state.typingByConversation };
      delete next[conversationId];
      return { typingByConversation: next };
    });
  },
}));
