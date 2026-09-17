import { useState, useCallback, useEffect } from 'react';

const RECENT_STORAGE_KEY = 'chat_recent_reactions';
export const DEFAULT_RECENT_REACTIONS = ['❤️', '🫡', '🏆', '😎', '🔥', '😭'];

export function getStoredRecentReactions(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return DEFAULT_RECENT_REACTIONS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure we have at least 6 valid emojis by padding with defaults if needed
      const unique = Array.from(new Set([...parsed, ...DEFAULT_RECENT_REACTIONS])).slice(0, 24);
      return unique;
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_RECENT_REACTIONS;
}

export function saveRecentReaction(emoji: string): string[] {
  try {
    const current = getStoredRecentReactions();
    const updated = [emoji, ...current.filter((e) => e !== emoji)].slice(0, 32);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_RECENT_REACTIONS;
  }
}

export function useRecentReactions() {
  const [recentReactions, setRecentReactions] = useState<string[]>(getStoredRecentReactions);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === RECENT_STORAGE_KEY) {
        setRecentReactions(getStoredRecentReactions());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const recordReaction = useCallback((emoji: string) => {
    const next = saveRecentReaction(emoji);
    setRecentReactions(next);
  }, []);

  return {
    recentReactions,
    dockReactions: recentReactions.slice(0, 6),
    recordReaction,
  };
}
