import { describe, it, expect, beforeEach } from 'vitest';
import { useHiddenPostsStore } from '../useHiddenPostsStore';

describe('useHiddenPostsStore', () => {
  beforeEach(() => {
    useHiddenPostsStore.setState({ hiddenIds: new Set() });
  });

  it('hides and unhides posts', () => {
    expect(useHiddenPostsStore.getState().hiddenIds.has('post-1')).toBe(false);

    useHiddenPostsStore.getState().hidePost('post-1');
    expect(useHiddenPostsStore.getState().hiddenIds.has('post-1')).toBe(true);

    useHiddenPostsStore.getState().hidePost(123);
    expect(useHiddenPostsStore.getState().hiddenIds.has(123)).toBe(true);

    useHiddenPostsStore.getState().unhidePost('post-1');
    expect(useHiddenPostsStore.getState().hiddenIds.has('post-1')).toBe(false);
    expect(useHiddenPostsStore.getState().hiddenIds.has(123)).toBe(true);
  });
});
