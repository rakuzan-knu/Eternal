const RECENT_CHATS_KEY = 'eternal_recent_visited_chats';

export function getRecentVisitedChatIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_CHATS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordRecentVisitedChat(conversationId: string) {
  if (!conversationId || typeof window === 'undefined') return;
  try {
    const current = getRecentVisitedChatIds().filter((id) => id !== conversationId);
    current.unshift(conversationId);
    localStorage.setItem(RECENT_CHATS_KEY, JSON.stringify(current.slice(0, 20)));
  } catch {}
}
