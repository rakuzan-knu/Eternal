import { queryClient } from '@/shared/api/queryClient';
import { disconnectSocket } from '@/shared/api/socket';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { useTypingStore } from '@/features/chat/model/useTypingStore';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';
import { useUIStore } from '@/shared/model/useUIStore';
import { useDevicePasswordStore } from '@/features/profile/model/useDevicePasswordStore';

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

  // 3. Clear ephemeral in-memory stores
  try {
    usePresenceStore.setState({ onlineUserIds: new Set() });
    useMessageToastStore.getState().dismissAll();
    useTypingStore.setState({ typingByConversation: {} });
    useHiddenPostsStore.setState({ hiddenIds: new Set() });
    useUIStore.setState({
      isEditProfileOpen: false,
      isCommentModalOpen: false,
      isShareModalOpen: false,
      activeConversationId: null,
      activePostForComments: null,
      activePostForShare: null,
    });
    useDevicePasswordStore.setState({ unlocked: false });
  } catch {
    // Ignore in tests
  }
}
