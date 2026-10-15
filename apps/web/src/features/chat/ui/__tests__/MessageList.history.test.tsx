import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MessageList from '../MessageList';
import type { MessageView } from '@/entities/chat/model/types';

const mountedRange = vi.hoisted(() => ({ start: 0, end: Infinity }));

vi.mock('../MessageBubble', () => ({
  default: ({ message }: { message: MessageView }) => <span>{message.body}</span>,
}));
vi.mock('@/shared/model/useSpotifyDockOffset', () => ({
  useSpotifyDockOffset: () => ({ dockOffset: 0 }),
}));
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: {
    count: number;
    getScrollElement: () => HTMLDivElement | null;
    getItemKey?: (index: number) => string;
  }) => ({
    measurementsCache: Array.from({ length: options.count }, (_, index) => ({
      index,
      key: options.getItemKey?.(index) ?? index,
      start: index * 64,
      end: (index + 1) * 64,
      size: 64,
    })),
    getVirtualItems: () =>
      Array.from({ length: options.count }, (_, index) => ({
        index,
        key: options.getItemKey?.(index) ?? index,
        start: index * 64,
      })).filter((item) => item.index >= mountedRange.start && item.index < mountedRange.end),
    getTotalSize: () => options.count * 64,
    takeSnapshot: () => [],
    measureElement: () => {},
    getOffsetForIndex: (index: number) => [index * 64, 'start'],
    scrollToOffset: (offset: number) => {
      const node = options.getScrollElement();
      if (node) node.scrollTop = offset;
    },
    scrollToIndex: (index: number) => {
      const node = options.getScrollElement();
      if (node) node.scrollTop = index * 64;
    },
  }),
}));

function messages(first: number, last: number) {
  return Array.from(
    { length: last - first + 1 },
    (_, index) =>
      ({
        id: `m${first + index}`,
        conversationId: 'history-chat',
        body: `Message ${first + index}`,
        sender: { id: 'peer', username: 'peer', avatar: null, displayName: null },
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, first + index)).toISOString(),
        attachments: [],
        reactions: [],
        readBy: [],
        editedAt: null,
        replyTo: null,
        messageType: 'TEXT',
        forwardedFrom: null,
        isEdited: false,
        isDeleted: false,
        isPinned: false,
      }) as MessageView,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  mountedRange.start = 0;
  mountedRange.end = Infinity;
});

describe('history viewport anchoring', () => {
  it('keeps the first visible message at the same pixel offset when older/newer pages replace the bounded window', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const scroller = this.closest('[data-testid="message-scroll"]') as HTMLElement | null;
      const top = this.hasAttribute('data-index')
        ? Number(this.dataset.index) * 64 +
          (parseFloat(scroller?.style.paddingTop ?? '') || 0) -
          (scroller?.scrollTop ?? 0)
        : 0;
      return {
        top,
        bottom: top + (this.hasAttribute('data-index') ? 64 : 400),
        left: 0,
        right: 500,
        width: 500,
        height: 64,
        x: 0,
        y: top,
        toJSON: () => ({}),
      };
    });
    const props = {
      currentUserId: 'me',
      otherParticipantId: 'peer',
      hasMore: true,
      isLoading: false,
      isFetchingMore: false,
      typingParticipants: [],
      isGroup: false,
      isAnchoredInHistory: true,
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
    const { rerender } = render(<MessageList {...props} messages={messages(201, 280)} />);
    const scroller = screen.getByTestId('message-scroll');
    scroller.style.paddingTop = '8px';
    Object.defineProperties(scroller, {
      clientHeight: { value: 400, configurable: true },
      scrollHeight: { value: 5184, configurable: true },
    });
    act(() => {
      scroller.scrollTop = 300;
      fireEvent.scroll(scroller);
    });
    const row = () => scroller.querySelector<HTMLElement>('[data-message-id="m205"]')!;
    const originalOffset = row().getBoundingClientRect().top;
    expect(originalOffset).toBe(28);
    rerender(<MessageList {...props} messages={messages(181, 260)} />);
    expect(row().getBoundingClientRect().top).toBe(originalOffset);
    rerender(<MessageList {...props} messages={messages(201, 280)} />);
    expect(row().getBoundingClientRect().top).toBe(originalOffset);
  });

  it('captures the newly reached top even before virtualized DOM rows catch up with the scroll event', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const scroller = this.closest('[data-testid="message-scroll"]') as HTMLElement | null;
      const top = this.hasAttribute('data-index')
        ? Number(this.dataset.index) * 64 - (scroller?.scrollTop ?? 0)
        : 0;
      return {
        top,
        bottom: top + (this.hasAttribute('data-index') ? 64 : 400),
        left: 0,
        right: 500,
        width: 500,
        height: 64,
        x: 0,
        y: top,
        toJSON: () => ({}),
      };
    });
    const props = {
      currentUserId: 'me',
      otherParticipantId: 'peer',
      hasMore: true,
      isLoading: false,
      isFetchingMore: false,
      typingParticipants: [],
      isGroup: false,
      isAnchoredInHistory: true,
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
    mountedRange.start = 60;
    const { rerender } = render(<MessageList {...props} messages={messages(201, 280)} />);
    const scroller = screen.getByTestId('message-scroll');
    Object.defineProperties(scroller, {
      clientHeight: { value: 400, configurable: true },
      scrollHeight: { value: 5184, configurable: true },
    });
    act(() => {
      scroller.scrollTop = 0;
      fireEvent.scroll(scroller);
    });
    expect(scroller.querySelector('[data-message-id="m201"]')).toBeNull();
    mountedRange.start = 0;
    rerender(<MessageList {...props} messages={messages(181, 260)} />);
    expect(
      scroller.querySelector<HTMLElement>('[data-message-id="m201"]')!.getBoundingClientRect().top,
    ).toBe(64);
  });
});
