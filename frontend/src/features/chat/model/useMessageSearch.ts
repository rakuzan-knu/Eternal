import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';

import type { MessageView } from '../../../entities/chat/model/types';

const DEBOUNCE_MS = 300;

export function useMessageSearch(conversationId: string | null, rawQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const trimmed = debouncedQuery.trim();

  const query = useQuery<MessageView[]>({
    queryKey: ['message-search', conversationId, trimmed],
    queryFn: () => chatApi.searchMessages(conversationId!, trimmed),
    enabled: !!conversationId && trimmed.length > 0,
    staleTime: 1000 * 10,
  });

  return {
    results: trimmed.length > 0 ? (query.data ?? []) : [],
    isSearching: trimmed.length > 0 && query.isFetching,
    isTyping: rawQuery !== debouncedQuery,
  };
}
