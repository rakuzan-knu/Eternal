import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MessageView } from '../../../entities/chat/model/types';

export interface ChatDraft {
  text: string;
  replyingTo?: MessageView | null;
  pendingAttachments?: { name: string; size: number; type: string }[];
  updatedAt: number;
}

interface ChatDraftsState {
  drafts: Record<string, ChatDraft>;
  setDraft: (
    conversationId: string,
    text: string,
    replyingTo?: MessageView | null,
    pendingAttachments?: { name: string; size: number; type: string }[],
  ) => void;
  clearDraft: (conversationId: string) => void;
  getDraft: (conversationId: string) => ChatDraft | undefined;
  hasDraft: (conversationId: string) => boolean;
}

export const useChatDraftsStore = create<ChatDraftsState>()(
  persist(
    (set, get) => ({
      drafts: {},
      setDraft: (conversationId, text, replyingTo, pendingAttachments) => {
        const trimmed = text.trim();
        const hasContent =
          trimmed.length > 0 ||
          Boolean(replyingTo) ||
          (pendingAttachments && pendingAttachments.length > 0);

        set((state) => {
          if (!hasContent) {
            const next = { ...state.drafts };
            delete next[conversationId];
            return { drafts: next };
          }
          return {
            drafts: {
              ...state.drafts,
              [conversationId]: {
                text,
                replyingTo: replyingTo ?? null,
                pendingAttachments: pendingAttachments ?? [],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
      clearDraft: (conversationId) => {
        set((state) => {
          const next = { ...state.drafts };
          delete next[conversationId];
          return { drafts: next };
        });
      },
      getDraft: (conversationId) => {
        return get().drafts[conversationId];
      },
      hasDraft: (conversationId) => {
        const draft = get().drafts[conversationId];
        if (!draft) return false;
        return Boolean(
          draft.text.trim().length > 0 ||
          draft.replyingTo ||
          (draft.pendingAttachments && draft.pendingAttachments.length > 0),
        );
      },
    }),
    {
      name: 'eternal-chat-drafts',
    },
  ),
);
