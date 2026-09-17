import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../shared/model/useUIStore';
import { resetUIStore } from '../resetUIStore';

describe('test/resetUIStore utility', () => {
  beforeEach(() => {
    resetUIStore();
  });

  it('resets modified UI state back to initial default snapshot', () => {
    // Mutate state
    useUIStore.getState().setSidebarExpanded(true);
    useUIStore.getState().setChatListExpanded(false);
    useUIStore.getState().setActiveConversationId('conv-999');
    useUIStore.getState().openEditProfile('security');

    expect(useUIStore.getState().isSidebarExpanded).toBe(true);
    expect(useUIStore.getState().isChatListExpanded).toBe(false);
    expect(useUIStore.getState().activeConversationId).toBe('conv-999');
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
    expect(useUIStore.getState().editProfileInitialTab).toBe('security');

    // Perform reset
    resetUIStore();

    expect(useUIStore.getState().isSidebarExpanded).toBe(false);
    expect(useUIStore.getState().isChatListExpanded).toBe(true);
    expect(useUIStore.getState().activeConversationId).toBeNull();
    expect(useUIStore.getState().isEditProfileOpen).toBe(false);
    expect(useUIStore.getState().editProfileInitialTab).toBe('account');
  });

  it('handles multiple reset calls idempotently', () => {
    useUIStore.getState().openEditProfile();
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);

    resetUIStore();
    expect(useUIStore.getState().isEditProfileOpen).toBe(false);

    resetUIStore();
    expect(useUIStore.getState().isEditProfileOpen).toBe(false);
  });
});
