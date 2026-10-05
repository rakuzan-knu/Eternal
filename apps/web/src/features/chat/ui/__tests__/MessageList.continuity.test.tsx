import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MessageView } from '@/entities/chat/model/types';

const { scrollToIndex, scrollToOffset, getTotalSize, scrollRect } = vi.hoisted(() => ({
  scrollToIndex: vi.fn(),
  scrollToOffset: vi.fn(),
  getTotalSize: vi.fn(() => 2000),
  scrollRect: { width: 500, height: 400 },
}));
vi.mock('@tanstack/react-virtual', () => {
  const virtualizer = {
    getVirtualItems: () => [],
    getTotalSize,
    scrollRect,
    takeSnapshot: () => [],
    scrollToIndex,
    scrollToOffset,
  };
  return { useVirtualizer: () => virtualizer };
});
import MessageList from '../MessageList';

const message = (id: string): MessageView => ({
  id,
  conversationId: 'history-follow',
  sender: { id: 'u2', username: 'alice', displayName: 'Alice', avatar: null },
  body: 'History',
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt: '2026-10-03T10:00:00Z',
  editedAt: null,
});

const frames = new Map<number, FrameRequestCallback>();
const resizeCallbacks = new Set<() => void>();
let nextFrame = 0;
const commitFrame = () => {
  const pending = [...frames.values()];
  frames.clear();
  act(() => pending.forEach((callback) => callback(0)));
};
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private notify: () => void;
      constructor(callback: ResizeObserverCallback) {
        this.notify = () => callback([], this);
        resizeCallbacks.add(this.notify);
      }
      observe() {}
      unobserve() {}
      disconnect() {
        resizeCallbacks.delete(this.notify);
      }
    },
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => {
  frames.clear();
  resizeCallbacks.clear();
  vi.unstubAllGlobals();
});

describe('chat following policy', () => {
  it('keeps partial-screen history while new messages arrive and resumes following only at the bottom', () => {
    const props: React.ComponentProps<typeof MessageList> = {
      conversationId: 'history-follow',
      messages: [],
      currentUserId: 'u1',
      otherParticipantId: 'u2',
      hasMore: false,
      isLoading: false,
      isFetchingMore: false,
      typingParticipants: [],
      isGroup: false,
      onLoadMore: vi.fn(),
      onReply: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onForward: vi.fn(),
      onTogglePin: vi.fn(),
      onReport: vi.fn(),
      onReact: vi.fn(),
      onUnreact: vi.fn(),
    };
    const client = new QueryClient();
    const content = (messages: MessageView[]) => (
      <QueryClientProvider client={client}>
        <MessageList {...props} messages={messages} />
      </QueryClientProvider>
    );
    const view = render(content([message('first')]));
    expect(scrollToIndex).not.toHaveBeenCalled();
    commitFrame();
    const scroller = screen.getByTestId('message-scroll');
    Object.defineProperties(scroller, {
      scrollHeight: { value: 2000 },
      clientHeight: { value: 400 },
    });
    scroller.scrollTop = 1600;
    fireEvent.scroll(scroller);
    vi.clearAllMocks();

    // A measurement correction without user input must retain its live target.
    scroller.scrollTop = 1520;
    fireEvent.scroll(scroller);
    expect(scrollToOffset).not.toHaveBeenCalled();
    commitFrame();
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: 'end' });
    vi.clearAllMocks();
    getTotalSize.mockReturnValue(2400);
    view.rerender(content([message('first')]));
    expect(scrollToIndex).not.toHaveBeenCalled();
    commitFrame();
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: 'end' });
    getTotalSize.mockReturnValue(2000);
    view.rerender(content([message('first')]));
    vi.clearAllMocks();
    scrollRect.height = 320;
    view.rerender(content([message('first')]));
    expect(scrollToIndex).not.toHaveBeenCalled();
    commitFrame();
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: 'end' });
    scroller.scrollTop = 1600;
    fireEvent.scroll(scroller);
    vi.clearAllMocks();

    // Committed container geometry can change after the effect already ran.
    act(() => resizeCallbacks.forEach((notify) => notify()));
    expect(scrollToIndex).not.toHaveBeenCalled();
    commitFrame();
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: 'end' });
    vi.clearAllMocks();

    getTotalSize.mockReturnValue(2500);
    view.rerender(content([message('first')]));
    fireEvent.wheel(scroller, { deltaY: -200 });
    expect(scrollToOffset).toHaveBeenCalledWith(1600);
    commitFrame();
    expect(scrollToIndex).not.toHaveBeenCalled();
    scroller.scrollTop = 1400;
    fireEvent.scroll(scroller);
    expect(screen.queryByTitle('Scroll to bottom')).not.toBeInTheDocument();
    view.rerender(content([message('first'), message('second')]));
    expect(scrollToIndex).not.toHaveBeenCalled();

    scroller.scrollTop = 1600;
    fireEvent.scroll(scroller);
    vi.clearAllMocks();
    view.rerender(content([message('first'), message('second'), message('third')]));
    commitFrame();
    expect(scrollToIndex).toHaveBeenCalledWith(3, { align: 'end' });

    // A deliberate jump to an older reply/search result must retain its target.
    view.rerender(
      <QueryClientProvider client={client}>
        <MessageList
          {...props}
          messages={[message('first'), message('second'), message('third')]}
          highlightMessageId="first"
        />
      </QueryClientProvider>,
    );
    expect(scrollToIndex).toHaveBeenCalledWith(1, { align: 'center', behavior: 'smooth' });
    vi.clearAllMocks();
    fireEvent.wheel(scroller, { deltaY: -200 });
    scroller.scrollTop = 1000;
    fireEvent.scroll(scroller);
    expect(scrollToOffset).not.toHaveBeenCalled();
    view.rerender(content([message('first'), message('second'), message('third')]));
    expect(scrollToIndex).not.toHaveBeenCalled();
  });
});
