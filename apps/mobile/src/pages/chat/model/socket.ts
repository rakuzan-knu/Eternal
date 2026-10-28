import { io, type Socket } from 'socket.io-client';
import parser from 'socket.io-msgpack-parser';
import { create } from 'zustand';
import { useAuthStore } from '@social-network/shared-stores';
import { messengerOrigin } from '@/shared/api/client';

let current: { userId: string; socket: Socket } | null = null;

/** One messenger socket per signed-in account; a different account gets a fresh one. */
export function getChatSocket(userId: string): Socket {
  if (current?.userId === userId) return current.socket;
  current?.socket.disconnect();
  const socket = io(`${messengerOrigin}/messenger`, {
    parser,
    autoConnect: false,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    auth: (callback) => {
      const auth = useAuthStore.getState();
      callback({ token: auth.user?.id === userId ? (auth.accessToken ?? undefined) : undefined });
    },
  });
  current = { userId, socket };
  return socket;
}

export function disconnectChatSocket() {
  current?.socket.disconnect();
  current = null;
}

const TYPING_TTL_MS = 6000;

interface TypingState {
  typing: Record<string, Record<string, number>>;
  set: (conversationId: string, userId: string, isTyping: boolean) => void;
}

/** Who is typing per conversation; entries expire if a stop event is lost. */
export const useTypingStore = create<TypingState>((set) => ({
  typing: {},
  set: (conversationId, userId, isTyping) =>
    set((state) => {
      const users = { ...(state.typing[conversationId] ?? {}) };
      if (isTyping) users[userId] = Date.now() + TYPING_TTL_MS;
      else delete users[userId];
      return { typing: { ...state.typing, [conversationId]: users } };
    }),
}));

export function activeTypers(entries: Record<string, number> | undefined, now = Date.now()) {
  return Object.entries(entries ?? {})
    .filter(([, until]) => until > now)
    .map(([userId]) => userId);
}

interface OpenConversationState {
  id: string | null;
  setId: (id: string | null) => void;
}

export const useOpenConversation = create<OpenConversationState>((set) => ({
  id: null,
  setId: (id) => set({ id }),
}));
