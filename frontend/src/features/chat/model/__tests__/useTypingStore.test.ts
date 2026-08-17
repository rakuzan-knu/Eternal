import { describe, it, expect, beforeEach } from 'vitest';
import { useTypingStore } from '../useTypingStore';

describe('useTypingStore', () => {
  beforeEach(() => {
    useTypingStore.setState({ typingByConversation: {} });
  });

  it('sets and removes typists for conversation', () => {
    useTypingStore.getState().setTypist('conv-1', 'usr-1', true, 'Alice');

    let typists = useTypingStore.getState().typingByConversation['conv-1'];
    expect(typists).toHaveLength(1);
    expect(typists[0].username).toBe('Alice');

    useTypingStore.getState().setTypist('conv-1', 'usr-1', false);
    typists = useTypingStore.getState().typingByConversation['conv-1'];
    expect(typists).toHaveLength(0);
  });

  it('clears all typists for conversation', () => {
    useTypingStore.getState().setTypist('conv-1', 'usr-1', true, 'Alice');
    useTypingStore.getState().setTypist('conv-1', 'usr-2', true, 'Bob');

    useTypingStore.getState().clearTypistsForConversation('conv-1');
    expect(useTypingStore.getState().typingByConversation['conv-1']).toBeUndefined();
  });
});
