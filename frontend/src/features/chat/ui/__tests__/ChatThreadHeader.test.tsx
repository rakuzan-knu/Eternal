import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatThreadHeader from '../ChatThreadHeader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePresenceStore } from '@/shared/model/usePresenceStore';

describe('ChatThreadHeader', () => {
  const queryClient = new QueryClient();

  it('renders direct conversation title and controls', () => {
    const onToggleDetails = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <ChatThreadHeader
          display={{ title: 'Alice', avatar: null, isGroup: false, otherUserId: 'usr-2' }}
          otherUserId="usr-2"
          isOtherTyping={false}
          isDetailsOpen={false}
          onToggleDetails={onToggleDetails}
          isGroup={false}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();

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
