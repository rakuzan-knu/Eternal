import { resetSessionStores } from '@/shared/model/resetSession';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useAccountsStore } from '@/shared/model/useAccountsStore';

export type AuthSyncEvent =
  | { type: 'LOGOUT'; payload?: { userId: string | null; previousAccessToken: string | null } }
  | { type: 'ACCOUNT_SWITCHED'; payload: { accountId: string } }
  | {
      type: 'TOKEN_REFRESH';
      payload: {
        accessToken: string;
        refreshToken?: string;
        // Optional on the wire for older tabs; unbound credentials are ignored.
        session?: {
          userId: string | null;
          accountId: string | null;
          previousAccessToken: string | null;
        };
      };
    };

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
      case 'LOGOUT': {
        const currentToken = localStorage.getItem('accessToken');
        const auth = useAuthStore.getState();
        // A delayed logout must not clear a newer sign-in. Legacy senders are
        // accepted only after shared storage already confirms the logout.
        if (data.payload) {
          if (
            data.payload.userId !== auth.userId ||
            (currentToken !== null && currentToken !== data.payload.previousAccessToken)
          )
            break;
        } else if (currentToken !== null) break;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        resetSessionStores();
        useAuthStore.setState({ userId: null, isAuthenticated: false });
        break;
      }

      case 'ACCOUNT_SWITCHED':
        if (data.payload?.accountId) {
          const currentActive = useAccountsStore.getState().activeAccountId;
          if (currentActive !== data.payload.accountId) {
            useAccountsStore.getState().switchAccount(data.payload.accountId);
          }
        }
        break;

      case 'TOKEN_REFRESH': {
        const payload = data.payload;
        const owner = payload?.session;
        const auth = useAuthStore.getState();
        const accounts = useAccountsStore.getState();
        if (
          !owner ||
          !auth.isAuthenticated ||
          !owner.userId ||
          owner.userId !== auth.userId ||
          owner.accountId !== accounts.activeAccountId ||
          typeof payload.accessToken !== 'string' ||
          !payload.accessToken ||
          (payload.refreshToken !== undefined && typeof payload.refreshToken !== 'string')
        )
          break;
        const currentToken = localStorage.getItem('accessToken');
        // localStorage is shared: a matching sender may already have written its new token.
        // A newer sign-in/rotation must not be replaced by a delayed broadcast.
        if (currentToken !== owner.previousAccessToken && currentToken !== payload.accessToken)
          break;
        localStorage.setItem('accessToken', payload.accessToken);
        if (payload.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken);
        if (owner.accountId) {
          useAccountsStore.setState((state) => ({
            accounts: state.accounts.map((account) =>
              account.id === owner.accountId
                ? {
                    ...account,
                    accessToken: payload.accessToken,
                    refreshToken: payload.refreshToken ?? account.refreshToken,
                  }
                : account,
            ),
          }));
        }
        break;
      }
    }
  };
}
