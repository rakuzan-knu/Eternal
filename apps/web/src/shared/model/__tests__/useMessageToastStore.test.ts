import { describe, it, expect, beforeEach } from 'vitest';
import { useMessageToastStore, MessageToast } from '../useMessageToastStore';

describe('useMessageToastStore', () => {
  beforeEach(() => {
    useMessageToastStore.setState({ toasts: [] });
  });

  it('adds unique toasts and prepends them, capping at 6', () => {
    const createToast = (id: string, messageId: string): MessageToast => ({
      id,
      conversationId: 'c1',
      messageId,
      title: 'Alice',
      body: 'Hello',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });

    for (let i = 1; i <= 8; i++) {
      useMessageToastStore.getState().addToast(createToast(`t-${i}`, `m-${i}`));
    }

    const toasts = useMessageToastStore.getState().toasts;
    expect(toasts).toHaveLength(6);
    expect(toasts[0].id).toBe('t-8');

    // Adding existing toast deduplicates
    useMessageToastStore.getState().addToast(createToast('t-8', 'm-8'));
    expect(useMessageToastStore.getState().toasts).toHaveLength(6);
  });

  it('removes individual toast by id', () => {
    const toast: MessageToast = {
      id: 't-1',
      conversationId: 'c1',
      messageId: 'm-1',
      title: 'Alice',
      body: 'Hello',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    };
    useMessageToastStore.getState().addToast(toast);
    expect(useMessageToastStore.getState().toasts).toHaveLength(1);

    useMessageToastStore.getState().removeToast('t-1');
    expect(useMessageToastStore.getState().toasts).toHaveLength(0);
  });

  it('dismisses all toasts', () => {
    useMessageToastStore.getState().addToast({
      id: 't-1',
      conversationId: 'c1',
      messageId: 'm-1',
      title: 'Alice',
      body: 'Hello',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    useMessageToastStore.getState().dismissAll();
    expect(useMessageToastStore.getState().toasts).toEqual([]);
  });
});
