import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatThreadHeader from '../ChatThreadHeader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { useMediaDetailModalStore } from '@/entities/showcase/model/useMediaDetailModalStore';

describe('ChatThreadHeader', () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const renderHeader = (props: any) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ChatThreadHeader {...props} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('renders direct conversation title and controls', () => {
    const onToggleDetails = vi.fn();
    renderHeader({
      display: {
        title: 'Alice',
        avatar: null,
        isGroup: false,
        otherUserId: 'usr-2',
        isVerified: true,
      },
      otherUserId: 'usr-2',
      isOtherTyping: false,
      isDetailsOpen: true,
      onToggleDetails: onToggleDetails,
      isGroup: false,
    });

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
    renderHeader({
      display: { title: 'Alice', avatar: null, isGroup: false, otherUserId: 'usr-2' },
      otherUserId: 'usr-2',
      isOtherTyping: true,
      isDetailsOpen: false,
      onToggleDetails: vi.fn(),
      isGroup: false,
    });

    expect(screen.getByText('Typing…')).toBeInTheDocument();
  });

  it('renders group conversation header with avatars and member count', () => {
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
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
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('5 members')).toBeInTheDocument();

    // Group without avatar (falls back to collage)
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
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
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });

  it('renders "Playing [game]" when other user is playing a game in 1-on-1 chat and opens modal on click', () => {
    usePresenceStore.setState({
      onlineUserIds: new Set(['usr-2']),
      userActivities: {
        'usr-2': { type: 'gaming', title: 'Dota 2', isSteam: true },
      },
    });
    useMediaDetailModalStore.getState().closeMediaDetail();

    renderHeader({
      display: { title: 'Alice', avatar: null, isGroup: false, otherUserId: 'usr-2' },
      otherUserId: 'usr-2',
      isOtherTyping: false,
      isDetailsOpen: false,
      onToggleDetails: vi.fn(),
      isGroup: false,
    });

    expect(screen.getByText(/Playing/i)).toBeInTheDocument();
    const gameTitle = screen.getByText('Dota 2');
    expect(gameTitle).toBeInTheDocument();
    expect(gameTitle).toHaveClass('hover:underline');

    fireEvent.click(gameTitle);
    expect(useMediaDetailModalStore.getState().isOpen).toBe(true);
    expect(useMediaDetailModalStore.getState().activeItem?.title).toBe('Dota 2');
  });
});
