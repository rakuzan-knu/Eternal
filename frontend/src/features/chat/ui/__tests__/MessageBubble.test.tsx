import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBubble from '../MessageBubble';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MessageView } from '@/entities/chat/model/types';

describe('MessageBubble', () => {
  const queryClient = new QueryClient();

  const mockMessage: MessageView = {
    id: 'msg-1',
    conversationId: 'conv-1',
    body: 'Hello from the other side',
    messageType: 'TEXT',
    replyTo: null,
    forwardedFrom: null,
    readBy: [],
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    createdAt: new Date().toISOString(),
    editedAt: null,
    reactions: [],
    attachments: [],
    sender: {
      id: 'usr-1',
      username: 'alice',
      displayName: 'Alice',
      avatar: null,
    },
  };

  it('renders message text and time', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          showAvatar={true}
          isReadByOther={true}
          currentUserId="me"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Hello from the other side')).toBeInTheDocument();
  });

  it('renders solo emoji with big transparent font', () => {
    const emojiMessage: MessageView = {
      ...mockMessage,
      id: 'msg-emoji',
      body: '🔥',
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={emojiMessage}
          isOwnMessage={true}
          showAvatar={false}
          isReadByOther={false}
          currentUserId="usr-1"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const emojiElement = screen.getByText('🔥');
    expect(emojiElement).toBeInTheDocument();
    expect(emojiElement.className).toContain('text-4xl');
  });

  it('shows hover action bar with React, Reply, More on mouse enter for own message', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={mockMessage}
          isOwnMessage={true}
          showAvatar={false}
          isReadByOther={true}
          currentUserId="usr-1"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const messageContainer = screen.getByText('Hello from the other side').closest('.group');
    expect(messageContainer).toBeTruthy();
  });

  it('shows hover action bar with React, Reply, More on mouse enter for other message', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          showAvatar={true}
          isReadByOther={true}
          currentUserId="other-user"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    const messageContainer = screen.getByText('Hello from the other side').closest('.group');
    expect(messageContainer).toBeTruthy();
  });

  it('renders reaction badges and toggles reaction on click', () => {
    const onReact = vi.fn();
    const onUnreact = vi.fn();

    const reactedMessage: MessageView = {
      ...mockMessage,
      id: 'msg-with-reactions',
      reactions: [
        {
          emoji: '🔥',
          count: 3,
          selfReacted: false,
          users: [{ id: 'usr-2', username: 'bob', displayName: 'Bob', avatar: null }],
        },
      ],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={reactedMessage}
          isOwnMessage={false}
          showAvatar={true}
          isReadByOther={true}
          currentUserId="me"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={onReact}
          onUnreact={onUnreact}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    const badgeButton = screen.getByText('🔥').closest('button')!;
    badgeButton.click();

    expect(onReact).toHaveBeenCalledWith('msg-with-reactions', '🔥');
  });

  it('renders quoted reply message preview with sender name and jump handler', () => {
    const onJumpToMessage = vi.fn();
    const replyMessage: MessageView = {
      ...mockMessage,
      id: 'msg-reply',
      body: 'yoyoyo',
      replyTo: {
        ...mockMessage,
        id: 'msg-original',
        body: 'Original message text',
        sender: {
          id: 'usr-orig',
          username: 'doxer',
          displayName: 'Misha Doxer',
          avatar: null,
        },
      },
    };

    render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={replyMessage}
          isOwnMessage={true}
          showAvatar={false}
          isReadByOther={true}
          currentUserId="usr-1"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
          onJumpToMessage={onJumpToMessage}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Misha Doxer')).toBeInTheDocument();
    expect(screen.getByText('Original message text')).toBeInTheDocument();
    expect(screen.getByText('yoyoyo')).toBeInTheDocument();

    const replyBox = screen.getByText('Misha Doxer').closest('.group\\/reply');
    expect(replyBox).toBeInTheDocument();
    replyBox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onJumpToMessage).toHaveBeenCalledWith('msg-original');
  });

  it('renders interactive Spotify preview embed with dedicated width and 80px height without widening normal messages', () => {
    const spotifyMessage: MessageView = {
      ...mockMessage,
      id: 'msg-spotify',
      body: 'https://open.spotify.com/track/4rNCvZBSq4ER38uEpJOr3o',
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={spotifyMessage}
          isOwnMessage={true}
          showAvatar={false}
          isReadByOther={true}
          currentUserId="usr-1"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // Verify outer bubble wrapper has w-fit and ml-auto for leftward expansion
    const outerWrapper = container.querySelector('.w-fit');
    expect(outerWrapper).toBeInTheDocument();
    expect(outerWrapper?.className).toContain('ml-auto');

    // Verify inner bubble has link width
    const innerBubble = container.querySelector('.max-w-\\[460px\\]');
    expect(innerBubble).toBeInTheDocument();

    // Verify the expanded Spotify iframe embed is rendered directly without scrollbars
    const expandedCard = screen.getByTestId('audio-embed-card-expanded');
    expect(expandedCard).toBeInTheDocument();
    expect(expandedCard).toHaveStyle({ height: '80px' });

    const iframe = expandedCard.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.getAttribute('src')).toContain(
      'open.spotify.com/embed/track/4rNCvZBSq4ER38uEpJOr3o',
    );
    expect(iframe?.getAttribute('scrolling')).toBe('no');
    expect(iframe?.getAttribute('height')).toBe('80');
  });

  it('keeps hover bar at exact 8px distance from bubble on small messages without overlapping', () => {
    const smallMessage: MessageView = {
      ...mockMessage,
      id: 'msg-small',
      body: 'Hello!',
    };

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MessageBubble
          message={smallMessage}
          isOwnMessage={true}
          showAvatar={false}
          isReadByOther={true}
          currentUserId="usr-1"
          onReply={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onForward={vi.fn()}
          onTogglePin={vi.fn()}
          onReport={vi.fn()}
          onReact={vi.fn()}
          onUnreact={vi.fn()}
        />
      </QueryClientProvider>,
    );

    // Verify outer bubble has w-fit wrapping the content snugly
    const outerWrapper = container.querySelector('.w-fit');
    expect(outerWrapper).toBeInTheDocument();
    expect(outerWrapper?.className).toContain('ml-auto');

    // Hover to reveal action bar
    const bubbleRow = container.firstElementChild as HTMLElement;
    fireEvent.mouseEnter(bubbleRow);

    // Find the hover bar and assert it is positioned outside with right-full mr-2
    const reactButton = screen.getByTitle('React');
    const hoverBar = reactButton.closest('.absolute');
    expect(hoverBar).toBeInTheDocument();
    expect(hoverBar?.className).toContain('right-full');
    expect(hoverBar?.className).toContain('mr-2');
  });
});
