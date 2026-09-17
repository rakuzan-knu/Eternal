import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetSessionStores } from '../resetSession';
import { usePresenceStore } from '../usePresenceStore';
import { useHiddenPostsStore } from '../useHiddenPostsStore';
import { useUIStore } from '../useUIStore';
import { queryClient } from '@/shared/api/queryClient';
import * as socketApi from '@/shared/api/socket';

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

  it('handles errors gracefully in queryClient, socket and stores', () => {
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries').mockImplementation(() => {
      throw new Error('Query client err');
    });
    const disconnectSpy = vi.spyOn(socketApi, 'disconnectSocket').mockImplementation(() => {
      throw new Error('Socket err');
    });
    const presenceSpy = vi.spyOn(usePresenceStore, 'setState').mockImplementation(() => {
      throw new Error('Presence err');
    });

    expect(() => resetSessionStores()).not.toThrow();

    cancelSpy.mockRestore();
    disconnectSpy.mockRestore();
    presenceSpy.mockRestore();
  });
});
