import { useState } from 'react';

export function useLocalConversationOverrides() {
  const [pinnedLocally, setPinnedLocally] = useState<Set<string>>(new Set());
  const [forcedUnreadLocally, setForcedUnreadLocally] = useState<Set<string>>(new Set());
  const [locallyReadConversations, setLocallyReadConversations] = useState<Set<string>>(new Set());

  const togglePinLocally = (id: string) =>
    setPinnedLocally((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const toggleUnreadLocally = (id: string) => {
    setLocallyReadConversations((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setForcedUnreadLocally((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markConversationsRead = (ids: string[]) => {
    setLocallyReadConversations((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    setForcedUnreadLocally((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  };

  return {
    pinnedLocally,
    forcedUnreadLocally,
    locallyReadConversations,
    togglePinLocally,
    toggleUnreadLocally,
    markConversationsRead,
  };
}
