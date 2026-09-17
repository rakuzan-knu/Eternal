import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatThreadHeader from '../ChatThreadHeader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePresenceStore } from '@/shared/model/usePresenceStore';

describe('ChatThreadHeader', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  it('renders direct conversation title and controls', () => {
    const onToggleDetails = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <ChatThreadHeader
          display={{
            title: 'Alice',
            avatar: null,
            isGroup: false,
            otherUserId: 'usr-2',
            isVerified: true,
          }}
          otherUserId="usr-2"
          isOtherTyping={false}
          isDetailsOpen={true}
          onToggleDetails={onToggleDetails}
          isGroup={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();

    const audioCallBtn = screen.getByTitle('Audio call');
    fireEvent.click(audioCallBtn);

    const videoCallBtn = screen.getByTitle('Video call');
    fireEvent.click(videoCallBtn);

    const infoBtn = screen.getByTitle('Conversation info');
    fireEvent.click(infoBtn);
    expect(onToggleDetails).toHaveBeenCalled();
  });

  it('renders typing indicator when other user is typing', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ChatThreadHeader
          display={{ title: 'Alice', avatar: null, isGroup: false, otherUserId: 'usr-2' }}
          otherUserId="usr-2"
          isOtherTyping={true}
          isDetailsOpen={false}
          onToggleDetails={vi.fn()}
          isGroup={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Typing…')).toBeInTheDocument();
  });

  it('renders group conversation header with avatars and member count', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ChatThreadHeader
          display={{
            title: 'Group A',
            avatar: 'https://group.jpg',
            isGroup: true,
            otherUserId: null,
          }}
          otherUserId={null}
          isOtherTyping={false}
          isDetailsOpen={false}
          onToggleDetails={vi.fn()}
          isGroup={true}
          memberCount={5}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();

    // Group without avatar (falls back to collage)
    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatThreadHeader
          display={{ title: 'Group A', avatar: null, isGroup: true, otherUserId: null }}
          otherUserId={null}
          isOtherTyping={false}
          isDetailsOpen={false}
          onToggleDetails={vi.fn()}
          isGroup={true}
          memberAvatars={['https://a1.jpg', 'https://a2.jpg']}
          memberCount={2}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('renders "Playing [game]" when other user is playing a game in 1-on-1 chat', () => {
    usePresenceStore.setState({
      onlineUserIds: new Set(['usr-2']),
      userActivities: {
        'usr-2': { type: 'gaming', title: 'Dota 2', isSteam: true },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatThreadHeader
          display={{ title: 'Alice', avatar: null, isGroup: false, otherUserId: 'usr-2' }}
          otherUserId="usr-2"
          isOtherTyping={false}
          isDetailsOpen={false}
          onToggleDetails={vi.fn()}
          isGroup={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Playing/i)).toBeInTheDocument();
    expect(screen.getByText('Dota 2')).toBeInTheDocument();
  });
});
