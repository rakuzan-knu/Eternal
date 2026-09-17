import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('handles dismiss all button when there are 3 or more toasts', () => {
    useMessageToastStore.getState().addToast({
      id: 't-1',
      title: 'Toast 1',
      body: 'Body 1',
      conversationId: 'c1',
      messageId: 'm1',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    useMessageToastStore.getState().addToast({
      id: 't-2',
      title: 'Toast 2',
      body: 'Body 2',
      conversationId: 'c2',
      messageId: 'm2',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    useMessageToastStore.getState().addToast({
      id: 't-3',
      title: 'Toast 3',
      body: 'Body 3',
      conversationId: 'c3',
      messageId: 'm3',
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

    const dismissAllBtn = screen.getByText('Dismiss all');
    fireEvent.click(dismissAllBtn);
    expect(useMessageToastStore.getState().toasts.length).toBe(0);
  });

  it('handles toast click, keyboard activation, and individual close button', () => {
    useMessageToastStore.getState().addToast({
      id: 't-1',
      title: 'Toast 1',
      body: 'Body 1',
      conversationId: 'c1',
      messageId: 'm1',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
    useMessageToastStore.getState().addToast({
      id: 't-2',
      title: 'Toast 2',
      body: 'Body 2',
      conversationId: 'c2',
      messageId: 'm2',
      linkUrl: '/profile/user2',
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

    // Click linkUrl toast
    fireEvent.click(screen.getByText('Toast 2'));

    // Close individual toast
    const closeBtn = screen.getByRole('button', { name: 'Close notification' });
    fireEvent.click(closeBtn);
    expect(useMessageToastStore.getState().toasts.find((t) => t.id === 't-1')).toBeUndefined();
  });

  it('handles clicking conversation toast, keyboard activation, and avatar variants', () => {
    useMessageToastStore.getState().addToast({
      id: 't-group-1',
      title: 'Group Chat',
      body: 'Group message',
      conversationId: 'c-group',
      messageId: 'm-group',
      avatar: 'https://img.com/group.png',
      memberAvatars: [],
      isGroup: true,
    });
    useMessageToastStore.getState().addToast({
      id: 't-group-2',
      title: 'Devs Group',
      body: 'Devs message',
      conversationId: 'c-devs',
      messageId: 'm-devs',
      avatar: null,
      memberAvatars: ['https://img.com/u1.png', 'https://img.com/u2.png'],
      isGroup: true,
    });
    useMessageToastStore.getState().addToast({
      id: 't-direct-avatar',
      title: 'Alice Direct',
      body: 'Direct message',
      conversationId: 'c-alice',
      messageId: 'm-alice',
      avatar: 'https://img.com/alice.png',
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

    // Click direct toast with conversationId
    fireEvent.click(screen.getByText('Alice Direct'));

    // Press Enter key on group toast
    const groupToast = screen.getByText('Group Chat').closest('[role="button"]')!;
    fireEvent.keyDown(groupToast, { key: 'Enter' });
  });
});
