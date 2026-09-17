import { resetSessionStores } from '@/shared/model/resetSession';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';

export type AuthSyncEvent =
  | { type: 'LOGOUT' }
  | { type: 'ACCOUNT_SWITCHED'; payload: { accountId: string } }
  | { type: 'TOKEN_REFRESH'; payload: { accessToken: string; refreshToken?: string } };

const CHANNEL_NAME = 'eternal_auth_channel';
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      channel = null;
    }
  }
  return channel;
}

/**
 * Broadcasts an authentication state change across all open browser tabs.
 */
export function notifyAuthChange(event: AuthSyncEvent['type'], payload?: Record<string, unknown>) {
  const ch = getChannel();
  ch?.postMessage({ type: event, payload });
}

/**
 * Initializes cross-tab synchronization listener to react to logouts,
 * account switches, and token refreshes in other tabs.
 */
export function initCrossTabSync() {
  const ch = getChannel();
  if (!ch) return;

  ch.onmessage = (event: MessageEvent<AuthSyncEvent>) => {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
      case 'LOGOUT':
        // Tab receives logout notification from another tab: wipe stores and auth state
        resetSessionStores();
        useAuthStore.setState({ userId: null, isAuthenticated: false });
        break;

      case 'ACCOUNT_SWITCHED':
        if (data.payload?.accountId) {
          const currentActive = useAccountsStore.getState().activeAccountId;
          if (currentActive !== data.payload.accountId) {
            useAccountsStore.getState().switchAccount(data.payload.accountId);
          }
        }
        break;

      case 'TOKEN_REFRESH':
        if (data.payload?.accessToken) {
          localStorage.setItem('accessToken', data.payload.accessToken);
          if (data.payload.refreshToken) {
            localStorage.setItem('refreshToken', data.payload.refreshToken);
          }
        }
        break;
    }
  };
}
