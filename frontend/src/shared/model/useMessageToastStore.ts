import { create } from 'zustand';

export interface MessageToast {
  id: string;
  conversationId: string;
  messageId: string;
  title: string;
  body: string;
  avatar: string | null;
  memberAvatars: (string | null)[];
  isGroup: boolean;
}

interface MessageToastState {
  toasts: MessageToast[];
  addToast: (toast: MessageToast) => void;
  removeToast: (id: string) => void;
  dismissAll: () => void;
}

export const useMessageToastStore = create<MessageToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        toast,
        ...state.toasts.filter(
          (item) => item.id !== toast.id && item.messageId !== toast.messageId,
        ),
      ].slice(0, 6),
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  dismissAll: () => set({ toasts: [] }),
}));
