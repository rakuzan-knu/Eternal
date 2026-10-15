import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { retainTypingExpiration, useTypingStore } from '../useTypingStore';
import { resetSessionStores } from '@/shared/model/resetSession';

vi.mock('@/shared/api/idbPersister', () => ({ idbPersister: { removeClient: async () => {} } }));

describe('useTypingStore', () => {
  let releaseExpiration: () => void;
  beforeEach(() => {
    vi.useFakeTimers();
    useTypingStore.setState({ typingByConversation: {} });
    releaseExpiration = retainTypingExpiration();
  });
  afterEach(() => {
    releaseExpiration();
    vi.useRealTimers();
  });

  it('sets and removes typists for conversation', () => {
    useTypingStore.getState().setTypist('conv-1', 'usr-1', true, 'Alice');

    let typists = useTypingStore.getState().typingByConversation['conv-1'];
    expect(typists).toHaveLength(1);
    expect(typists[0].username).toBe('Alice');

    useTypingStore.getState().setTypist('conv-1', 'usr-1', false);
    typists = useTypingStore.getState().typingByConversation['conv-1'];
    expect(typists).toBeUndefined();
  });

  it('clears all typists for conversation', () => {
    useTypingStore.getState().setTypist('conv-1', 'usr-1', true, 'Alice');
    useTypingStore.getState().setTypist('conv-1', 'usr-2', true, 'Bob');

    useTypingStore.getState().clearTypistsForConversation('conv-1');
    expect(useTypingStore.getState().typingByConversation['conv-1']).toBeUndefined();
  });

  it('expires stale conversations with one shared timer when typingStop never arrives', () => {
    for (let i = 0; i < 100; i++)
      useTypingStore.getState().setTypist(`conversation-${i}`, 'peer', true);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(useTypingStore.getState().typingByConversation).toEqual({});
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bounds active keys and cancels expiration on reset or final unmount', () => {
    for (let i = 0; i < 1000; i++)
      useTypingStore.getState().setTypist(`conversation-${i}`, 'peer', true);
    expect(Object.keys(useTypingStore.getState().typingByConversation).length).toBeLessThanOrEqual(
      256,
    );
    expect(vi.getTimerCount()).toBe(1);
    resetSessionStores();
    // TanStack's reset notifications may schedule a zero-delay task.
    vi.advanceTimersByTime(0);
    expect(vi.getTimerCount()).toBe(0);
    useTypingStore.getState().setTypist('new-conversation', 'peer', true);
    releaseExpiration();
    expect(vi.getTimerCount()).toBe(0);
    expect(useTypingStore.getState().typingByConversation).toEqual({});
  });
});
