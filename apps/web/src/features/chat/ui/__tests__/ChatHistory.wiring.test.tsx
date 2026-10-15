import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatThread from '../ChatThread';
import ArchivedThreadPane from '../ArchivedThreadPane';
import type { ConversationView } from '@/entities/chat/model/types';

const history = vi.hoisted(() => ({
  fetchNextPage: vi.fn().mockResolvedValue(undefined),
  loadNewer: vi.fn().mockResolvedValue(undefined),
  loadAroundMessage: vi.fn().mockResolvedValue(undefined),
  loadAroundDate: vi.fn().mockResolvedValue({ data: [] }),
  resetToLive: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../model/useMessages', () => ({
  useMessages: () => ({
    ...history,
    messages: [],
    hasNextPage: true,
    hasNewer: true,
    isAnchoredInHistory: true,
    isFetchingNextPage: false,
    isFetchingPreviousPage: false,
    isLoading: false,
  }),
}));
vi.mock('../../model/useMessageActions', () => ({
  useMessageActions: () => ({ markRead: vi.fn() }),
}));
vi.mock('../../model/useChatGapFill', () => ({ useChatGapFill: () => {} }));
vi.mock('../../model/useConversationRealtime', () => ({
  useConversationRealtime: () => ({ typingUserIds: new Set() }),
}));
vi.mock('../MessageComposer', () => ({ default: () => <div /> }));
vi.mock('../MessageList', () => ({
  default: (props: {
    onLoadOlder: () => void;
    onLoadNewer: () => void;
    onResetToLive: () => void;
    onLoadAround?: (id: string) => Promise<unknown>;
    onOpenDatePicker?: () => void;
    hasNewer?: boolean;
    isAnchoredInHistory?: boolean;
  }) => (
    <div>
      <button onClick={props.onLoadOlder}>Older page</button>
      <button disabled={!props.hasNewer} onClick={props.onLoadNewer}>
        Newer page
      </button>
      <button disabled={!props.isAnchoredInHistory} onClick={props.onResetToLive}>
        Live head
      </button>
      {props.onLoadAround && (
        <button
          onClick={() => {
            void props.onLoadAround?.('m100');
          }}
        >
          Message anchor
        </button>
      )}
      {props.onOpenDatePicker && <button onClick={props.onOpenDatePicker}>Open calendar</button>}
    </div>
  ),
}));
vi.mock('../ChatDatePicker', () => ({
  default: ({ onSelectDate }: { onSelectDate: (date: Date) => void }) => (
    <button onClick={() => onSelectDate(new Date('2026-01-02T12:00:00.000Z'))}>Date anchor</button>
  ),
}));

const conversation = {
  id: 'history-chat',
  type: 'DIRECT',
  participants: [],
  unreadCount: 0,
  pinnedMessages: [],
  myMuteLevel: 'NONE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
} as unknown as ConversationView;

function show(child: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{child}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('chat history navigation wiring', () => {
  it('routes normal thread paging, jumps and live reset through the bounded history owner', async () => {
    show(<ChatThread conversation={conversation} />);
    fireEvent.click(screen.getByText('Older page'));
    fireEvent.click(screen.getByText('Newer page'));
    fireEvent.click(screen.getByText('Live head'));
    fireEvent.click(screen.getByText('Message anchor'));
    fireEvent.click(screen.getByText('Open calendar'));
    fireEvent.click(await screen.findByText('Date anchor'));
    expect(history.fetchNextPage).toHaveBeenCalledOnce();
    expect(history.loadNewer).toHaveBeenCalledOnce();
    expect(history.resetToLive).toHaveBeenCalledOnce();
    expect(history.loadAroundMessage).toHaveBeenCalledWith('m100');
    await waitFor(() =>
      expect(history.loadAroundDate).toHaveBeenCalledWith('2026-01-02T12:00:00.000Z'),
    );
  });

  it('supports paging in both directions and returning to live in an archived thread', () => {
    show(<ArchivedThreadPane conversation={conversation} onUnarchived={() => {}} />);
    fireEvent.click(screen.getByText('Older page'));
    fireEvent.click(screen.getByText('Newer page'));
    fireEvent.click(screen.getByText('Live head'));
    expect(history.fetchNextPage).toHaveBeenCalledOnce();
    expect(history.loadNewer).toHaveBeenCalledOnce();
    expect(history.resetToLive).toHaveBeenCalledOnce();
  });
});
