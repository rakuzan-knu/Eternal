import { queryClient } from '@/shared/api/queryClient';
import { disconnectSocket } from '@/shared/api/socket';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import { useUIStore } from '@/shared/model/useUIStore';

/**
 * Enterprise session reset (RESET_STORES).
 *
 * Boundary — Client State (Zustand) vs Server State (TanStack Query):
 * - Zustand holds STRICTLY local UI/ephemeral state (modals, tabs, drafts,
 *   typing, presence, toasts). It MUST NOT duplicate server data that
 *   TanStack Query already owns (profiles, feeds, messages, notifications).
 *   Where a mirror exists (e.g. notification unread counts), TQ is the source
 *   of truth and the store is an optimistic projection.
 * - Data access uses ATOMIC selectors only:
 *     `useUIStore((s) => s.activeConversationId)` — never `useUIStore()`.
 *   Whole-store subscriptions rerender on every unrelated field change.
 *
 * Scope — what RESET covers on logout / session expiry / account switch:
 * - SESSION-SCOPED (reset): presence, toasts, hidden posts, ALL UI state,
 *   chat drafts, typing, calls, folders cache, notification mirrors, music
 *   queue/playback, story editors, device-password gates, TanStack cache,
 *   socket connection. Feature stores opt in via
 *   `registerSessionResetHandler` (no FSD violations: shared never imports
 *   features; features register themselves).
 * - DEVICE-SCOPED (preserved): theme, language, cookie consent, saved
 *   account LIST (activeAccountId is cleared, list is kept for switcher).
 */

export type ResetHandler = () => void;

declare global {
  var __resetSessionHandlers: Set<ResetHandler> | undefined;
}

function getResetHandlers(): Set<ResetHandler> {
  if (!globalThis.__resetSessionHandlers) {
    globalThis.__resetSessionHandlers = new Set<ResetHandler>();
  }
  return globalThis.__resetSessionHandlers;
}

/**
 * Register a slice-specific store reset callback without violating FSD
 * layer boundaries (shared must not import features).
 */
export function registerSessionResetHandler(handler: ResetHandler): () => void {
  getResetHandlers().add(handler);
  return () => {
    getResetHandlers().delete(handler);
  };
}

/** For tests/diagnostics: how many feature slices participate in RESET. */
export function getSessionResetHandlerCount(): number {
  return getResetHandlers().size;
}

const UI_INITIAL_STATE = {
  isSidebarExpanded: false,
  isChatListExpanded: true,
  activeConversationId: null as string | null,
  isEditProfileOpen: false,
  editProfileInitialTab: 'account',
  isCommentModalOpen: false,
  activePostForComments: null,
  activePostForShare: null,
  isShareModalOpen: false,
} as const;

/**
 * Resets all in-memory client stores and caches upon logout,
 * session expiration, or account switching.
 *
 * This ensures data isolation between accounts/sessions and avoids stale
 * RAM state without requiring destructive full-page reloads.
 */
export function resetSessionStores() {
  // 1. Cancel ongoing queries and wipe React Query cache
  try {
    queryClient.cancelQueries();
    queryClient.clear();
  } catch {
    // Graceful fallback for test environments without queryClient active
  }

  // 2. Terminate gateway / WebSocket connection and discard listeners
  try {
    disconnectSocket();
  } catch {
    // Ignore in tests
  }

  // 3. Clear core ephemeral in-memory shared stores (full UI state —
  //    partial resets leak open modals/active chats across accounts).
  try {
    usePresenceStore.setState({ onlineUserIds: new Set(), userActivities: {} });
    useMessageToastStore.getState().dismissAll();
    useHiddenPostsStore.setState({ hiddenIds: new Set() });
    useUIStore.setState({ ...UI_INITIAL_STATE });
  } catch {
    // Ignore in tests
  }

  // 4. Run feature-registered reset handlers (session-scoped slices).
  getResetHandlers().forEach((handler) => {
    try {
      handler();
    } catch {
      // Ignore handler errors — one bad slice must not block the rest
    }
  });
}
