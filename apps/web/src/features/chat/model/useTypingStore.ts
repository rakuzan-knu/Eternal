import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

export interface TypistInfo {
  userId: string;
  username?: string;
  timestamp: number;
}

interface TypingState {
  typingByConversation: Record<string, TypistInfo[]>;
  setTypist: (conversationId: string, userId: string, isTyping: boolean, username?: string) => void;
  clearTypistsForConversation: (conversationId: string) => void;
  applyTypingUpdates: (updates: ReadonlyMap<string, TypingUpdate>) => void;
}

export interface TypingUpdate {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  username?: string;
  timestamp: number;
}

const TYPING_TIMEOUT_MS = 5000;
const MAX_TYPING_CONVERSATIONS = 256;
const MAX_TYPING_USERS = 64;
let expirationTimer: ReturnType<typeof setTimeout> | undefined;
let expirationOwners = 0;

export const useTypingStore = create<TypingState>((set) => ({
  typingByConversation: {},

  setTypist: (conversationId, userId, isTyping, username) => {
    useTypingStore
      .getState()
      .applyTypingUpdates(
        new Map([
          [
            JSON.stringify([conversationId, userId]),
            { conversationId, userId, isTyping, username, timestamp: Date.now() },
          ],
        ]),
      );
  },

  clearTypistsForConversation: (conversationId) => {
    set((state) => {
      const next = { ...state.typingByConversation };
      delete next[conversationId];
      return { typingByConversation: next };
    });
  },
  applyTypingUpdates: (updates) => {
    set((state) => {
      let typingByConversation = state.typingByConversation;
      for (const update of updates.values()) {
        const current = typingByConversation[update.conversationId] ?? [];
        const filtered = current.filter(
          (typist) =>
            typist.userId !== update.userId && Date.now() - typist.timestamp < TYPING_TIMEOUT_MS,
        );
        if (!update.isTyping && filtered.length === current.length) continue;
        if (typingByConversation === state.typingByConversation)
          typingByConversation = { ...typingByConversation };
        const next = update.isTyping
          ? [
              ...filtered,
              { userId: update.userId, username: update.username, timestamp: update.timestamp },
            ].slice(-MAX_TYPING_USERS)
          : filtered;
        if (next.length) typingByConversation[update.conversationId] = next;
        else delete typingByConversation[update.conversationId];
      }
      const keys = Object.keys(typingByConversation);
      if (keys.length > MAX_TYPING_CONVERSATIONS) {
        keys.sort(
          (a, b) =>
            (typingByConversation[a].at(-1)?.timestamp ?? 0) -
            (typingByConversation[b].at(-1)?.timestamp ?? 0),
        );
        for (const key of keys.slice(0, keys.length - MAX_TYPING_CONVERSATIONS))
          delete typingByConversation[key];
      }
      return typingByConversation === state.typingByConversation ? state : { typingByConversation };
    });
  },
}));

function cancelExpiration() {
  if (expirationTimer !== undefined) clearTimeout(expirationTimer);
  expirationTimer = undefined;
}

function scheduleExpiration() {
  cancelExpiration();
  if (expirationOwners === 0) return;
  let expiresAt = Infinity;
  for (const users of Object.values(useTypingStore.getState().typingByConversation))
    for (const user of users) expiresAt = Math.min(expiresAt, user.timestamp + TYPING_TIMEOUT_MS);
  if (!Number.isFinite(expiresAt)) return;
  expirationTimer = setTimeout(
    () => {
      expirationTimer = undefined;
      const now = Date.now();
      useTypingStore.setState((state) => {
        const next = { ...state.typingByConversation };
        let changed = false;
        for (const [id, users] of Object.entries(next)) {
          const unexpired = users.filter((user) => now - user.timestamp < TYPING_TIMEOUT_MS);
          if (unexpired.length === users.length) continue;
          changed = true;
          if (unexpired.length) next[id] = unexpired;
          else delete next[id];
        }
        return changed ? { typingByConversation: next } : state;
      });
    },
    Math.max(0, expiresAt - Date.now()),
  );
}

const unsubscribeExpiration = useTypingStore.subscribe(scheduleExpiration);

/** One timer for all transient typing state, owned by mounted messenger hooks. */
export function retainTypingExpiration(): () => void {
  expirationOwners++;
  scheduleExpiration();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--expirationOwners > 0) return;
    cancelExpiration();
    useTypingStore.setState({ typingByConversation: {} });
  };
}

registerSessionResetHandler(() => {
  cancelExpiration();
  useTypingStore.setState({ typingByConversation: {} });
});

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    unsubscribeExpiration();
    cancelExpiration();
  });
