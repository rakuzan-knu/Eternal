import { queryKeys } from '@/shared/api/queryKeys';
import type { PaginatedMessages } from '@/entities/chat/model/types';

export const HISTORY_WINDOW_PAGES = 4;
export const HISTORY_PAGE_SIZE = 20;
export const HISTORY_CACHE_TTL = 5 * 60 * 1000;
export type HistoryPageParam = {
  direction: 'head' | 'before' | 'after' | 'around-message' | 'around-date';
  cursor?: string;
};
export interface HistoryPage extends PaginatedMessages {
  hasOlder: boolean;
  hasNewer: boolean;
  /** Only unmodified REST responses may be restored from cold storage. */
  cacheable: boolean;
}
export const historyWindowKey = (id: string, accountId: string | null) =>
  [...queryKeys.conversations.messages(id), 'history-window', accountId ?? 'anonymous'] as const;

export function historyPage(
  response: PaginatedMessages,
  direction: HistoryPageParam['direction'],
  cacheable = true,
): HistoryPage {
  const data = Array.isArray(response?.data) ? response.data : [];
  const around = direction === 'around-message' || direction === 'around-date';
  return {
    ...response,
    data,
    cacheable,
    hasOlder:
      data.length > 0 &&
      (around || direction === 'after' || (response.hasMore && !!response.nextCursor)),
    hasNewer:
      data.length > 0 &&
      (around || direction === 'before' || (direction === 'after' && response.hasMore)),
  };
}
export function olderHistoryParam(page: HistoryPage): HistoryPageParam | undefined {
  const cursor = page.nextCursor ?? page.data.at(-1)?.id;
  return page.hasOlder && cursor ? { direction: 'before', cursor } : undefined;
}
export function newerHistoryParam(page: HistoryPage): HistoryPageParam | undefined {
  // After responses are descending; use the FIRST row, not nextCursor.
  const cursor = page.data[0]?.id;
  return page.hasNewer && cursor ? { direction: 'after', cursor } : undefined;
}
