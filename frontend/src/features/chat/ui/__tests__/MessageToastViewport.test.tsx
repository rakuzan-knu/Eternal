import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageToastViewport from '../MessageToastViewport';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

describe('MessageToastViewport', () => {
  const queryClient = new QueryClient();

  beforeEach(() => {
    useMessageToastStore.getState().dismissAll();
  });

  it('renders null when no toasts exist', () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MessageToastViewport />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders active toasts with title and body', () => {
    useMessageToastStore.getState().addToast({
      id: 't-1',
      title: 'New message from Alice',
      body: 'Hey, are you free for a call?',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MessageToastViewport />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText('New message from Alice')).toBeInTheDocument();
    expect(screen.getByText('Hey, are you free for a call?')).toBeInTheDocument();
  });
});
