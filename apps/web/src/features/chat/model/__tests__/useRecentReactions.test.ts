import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useRecentReactions,
  getStoredRecentReactions,
  saveRecentReaction,
  DEFAULT_RECENT_REACTIONS,
} from '../useRecentReactions';

describe('useRecentReactions', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns default reactions when storage is empty', () => {
    const list = getStoredRecentReactions();
    expect(list).toEqual(DEFAULT_RECENT_REACTIONS);
  });

  it('handles JSON parse error gracefully', () => {
    localStorage.setItem('chat_recent_reactions', 'not-valid-json');
    expect(getStoredRecentReactions()).toEqual(DEFAULT_RECENT_REACTIONS);
  });

  it('handles storage setItem exception in saveRecentReaction', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(saveRecentReaction('🚀')).toEqual(DEFAULT_RECENT_REACTIONS);
  });

  it('records new reactions and synchronizes via storage events', () => {
    const { result } = renderHook(() => useRecentReactions());
    expect(result.current.dockReactions).toHaveLength(6);

    act(() => {
      result.current.recordReaction('🎉');
    });
    expect(result.current.recentReactions[0]).toBe('🎉');

    // Simulate cross-tab storage event
    act(() => {
      localStorage.setItem('chat_recent_reactions', JSON.stringify(['💎', '⚡']));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'chat_recent_reactions',
        }),
      );
    });
    expect(result.current.recentReactions[0]).toBe('💎');
  });
});
