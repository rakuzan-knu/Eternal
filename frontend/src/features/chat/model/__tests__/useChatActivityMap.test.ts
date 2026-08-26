import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChatActivityMap } from '../useChatActivityMap';
import { chatApi } from '../../api/chatApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    getChatActivity: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useChatActivityMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns chat activity map for a given month', async () => {
    const mockActivity = {
      '2026-08-21': {
        messageCount: 5,
        previewMediaUrl: 'https://cdn.com/thumb.webp',
        firstMessageSnippet: 'Hello world',
        firstMessageId: 'msg-1',
        mediaCount: 2,
      },
    };

    vi.mocked(chatApi.getChatActivity).mockResolvedValue(mockActivity);

    const { result } = renderHook(() => useChatActivityMap('conv-123', { year: 2026, month: 8 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activityMap).toEqual(mockActivity);
    expect(chatApi.getChatActivity).toHaveBeenCalledWith('conv-123', 2026, 8, expect.any(String));
  });

  it('returns empty object when conversationId is null', () => {
    const { result } = renderHook(() => useChatActivityMap(null, { year: 2026, month: 8 }), {
      wrapper: createWrapper(),
    });

    expect(result.current.activityMap).toEqual({});
    expect(chatApi.getChatActivity).not.toHaveBeenCalled();
  });
});
