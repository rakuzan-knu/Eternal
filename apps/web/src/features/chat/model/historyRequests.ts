import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { PaginatedMessages } from '@/entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { chatApi } from '../api/chatApi';
import { flushRealtimeChatBatch } from './realtimeChatBatch';
import { historyColdCache, type HistoryScope } from './historyColdCache';
import {
  HISTORY_PAGE_SIZE,
  historyPage,
  historyWindowKey,
  type HistoryPage,
  type HistoryPageParam,
} from './historyWindow';

export async function fetchHistoryPage(
  client: QueryClient,
  id: string,
  accountId: string | null,
  request: HistoryPageParam,
  signal?: AbortSignal,
): Promise<HistoryPage> {
  flushRealtimeChatBatch(client);
  const scope: HistoryScope = { accountId: accountId ?? 'anonymous', conversationId: id };
  const token = historyColdCache.token(scope);
  const assertCurrent = () => {
    if (
      signal?.aborted ||
      !historyColdCache.isCurrent(token) ||
      useAuthStore.getState().userId !== accountId
    )
      throw new DOMException('Cancelled history request', 'AbortError');
  };
  assertCurrent();
  const current = client.getQueryData<InfiniteData<HistoryPage, HistoryPageParam>>(
    historyWindowKey(id, accountId),
  );
  const adjacent =
    request.direction === 'before'
      ? current?.pages.at(-1)
      : request.direction === 'after'
        ? current?.pages[0]
        : undefined;
  let page = accountId ? await historyColdCache.read(scope, request, token) : undefined;
  assertCurrent();
  if (!page) {
    let raw: PaginatedMessages;
    if (request.direction === 'around-message')
      raw = await chatApi.getMessagesAround(id, request.cursor!, HISTORY_PAGE_SIZE, signal);
    else if (request.direction === 'around-date')
      raw = await chatApi.getMessagesAroundDate(id, request.cursor!, HISTORY_PAGE_SIZE, signal);
    else
      raw = await chatApi.getMessages(
        id,
        request.direction === 'before' ? request.cursor : undefined,
        HISTORY_PAGE_SIZE,
        request.direction === 'after' ? request.cursor : undefined,
        signal,
      );
    assertCurrent();
    flushRealtimeChatBatch(client);
    assertCurrent();
    page = historyPage(raw, request.direction);
    if (accountId) await historyColdCache.write(scope, request, page, token);
  }
  // Capture the reverse lookup before an adjacent raw page leaves RAM.
  // A live seed may include optimistic/socket rows and is never persisted.
  if (accountId && adjacent?.cacheable && page.data.length > 0) {
    const reverse: HistoryPageParam =
      request.direction === 'before'
        ? { direction: 'after', cursor: page.data[0]?.id }
        : { direction: 'before', cursor: page.data.at(-1)?.id };
    if (reverse.cursor && (request.direction === 'before' || request.direction === 'after'))
      await historyColdCache.write(scope, reverse, adjacent, token);
  }
  assertCurrent();
  return page;
}
