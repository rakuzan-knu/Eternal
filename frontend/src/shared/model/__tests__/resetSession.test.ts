import { describe, it, expect, beforeEach } from 'vitest';
import { resetSessionStores } from '../resetSession';
import { usePresenceStore } from '../usePresenceStore';
import { useHiddenPostsStore } from '../useHiddenPostsStore';
import { useUIStore } from '../useUIStore';

describe('resetSession', () => {
  beforeEach(() => {
    usePresenceStore.setState({ onlineUserIds: new Set(['usr-1']) });
    useHiddenPostsStore.setState({ hiddenIds: new Set(['post-1']) });
    useUIStore.setState({ isEditProfileOpen: true, activeConversationId: 'conv-123' });
  });

  it('resets all ephemeral stores to initial states', () => {
    resetSessionStores();

    expect(usePresenceStore.getState().onlineUserIds.size).toBe(0);
    expect(useHiddenPostsStore.getState().hiddenIds.size).toBe(0);
    expect(useUIStore.getState().isEditProfileOpen).toBe(false);
    expect(useUIStore.getState().activeConversationId).toBeNull();
  });
});
