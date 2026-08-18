import { describe, it, expect, beforeEach } from 'vitest';
import { useChatDraftsStore } from '../useChatDraftsStore';

describe('useChatDraftsStore', () => {
  beforeEach(() => {
    useChatDraftsStore.setState({ drafts: {} });
  });

  it('sets and retrieves draft text', () => {
    useChatDraftsStore.getState().setDraft('conv-1', 'Hello world');
    expect(useChatDraftsStore.getState().hasDraft('conv-1')).toBe(true);
    expect(useChatDraftsStore.getState().getDraft('conv-1')?.text).toBe('Hello world');
  });

  it('clears draft when empty text is provided', () => {
    useChatDraftsStore.getState().setDraft('conv-1', 'Hello world');
    expect(useChatDraftsStore.getState().hasDraft('conv-1')).toBe(true);

    useChatDraftsStore.getState().setDraft('conv-1', '   ');
    expect(useChatDraftsStore.getState().hasDraft('conv-1')).toBe(false);
  });

  it('explicitly clears draft with clearDraft', () => {
    useChatDraftsStore.getState().setDraft('conv-2', 'Draft text');
    useChatDraftsStore.getState().clearDraft('conv-2');
    expect(useChatDraftsStore.getState().hasDraft('conv-2')).toBe(false);
  });
});
