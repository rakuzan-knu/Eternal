import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ReelSendFriendsModal, type ReelDirectMessageSender } from '../ReelSendFriendsModal';
import { followApi } from '@/entities/user';
import { chatApi } from '@/entities/chat';
import { DEFAULT_SEED_REELS } from '@/entities/reel';

const mocks = vi.hoisted(() => ({ recordShare: vi.fn(), conversation: vi.fn() }));
vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'me' } }),
}));
vi.mock('@/entities/user', () => ({ followApi: { getFollowing: vi.fn(), getFollowers: vi.fn() } }));
vi.mock('@/entities/chat', () => ({ chatApi: { createDirectConversation: mocks.conversation } }));
vi.mock('../../api/reelsApi', () => ({
  useRecordReelShare: () => ({ mutate: mocks.recordShare }),
}));
vi.mock('@/shared/ui/Avatar', () => ({ default: () => <span aria-hidden="true" /> }));

function setup(sendMessage?: ReelDirectMessageSender) {
  const close = vi.fn();
  const toast = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ReelSendFriendsModal
          reel={DEFAULT_SEED_REELS[0]}
          isOpen
          onClose={close}
          onShowToast={toast}
          sendMessage={sendMessage}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { close, toast };
}

describe('confirmed Reel sharing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(followApi.getFollowing).mockResolvedValue({
      items: [
        { id: 'alice', username: 'Alice', isFollowing: true },
        { id: 'bob', username: 'Bob', isFollowing: true },
      ],
    });
    vi.mocked(followApi.getFollowers).mockResolvedValue({ items: [] });
    mocks.conversation.mockImplementation(async (id: string) => ({ id: `conversation-${id}` }));
  });

  it('keeps the message and only failed recipients for an idempotent retry', async () => {
    const sender = vi
      .fn<ReelDirectMessageSender>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('unconfirmed'))
      .mockResolvedValue(undefined);
    const { close, toast } = setup(sender);
    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Message to include' }), {
      target: { value: 'Keep my draft' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('1 message was not confirmed');
    expect(close).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith('Sent to 1 person.');
    expect(screen.getByRole('button', { name: 'Alice' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Bob' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('textbox', { name: 'Message to include' })).toHaveValue(
      'Keep my draft',
    );
    const firstId = sender.mock.calls[1][4];
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(sender).toHaveBeenCalledTimes(3);
    expect(sender.mock.calls[2][1]).toBe('bob');
    expect(sender.mock.calls[2][4]).toBe(firstId);
  });

  it('does not claim success or record a share when messaging is unavailable', async () => {
    const { close, toast } = setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Messaging is unavailable');
    expect(chatApi.createDirectConversation).not.toHaveBeenCalled();
    expect(mocks.recordShare).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows a real empty state and retry instead of invented recipients', async () => {
    vi.mocked(followApi.getFollowing)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ items: [] });
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('Connections could not be loaded');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Find people' })).toHaveAttribute(
      'href',
      '/search',
    );
    expect(screen.queryByText('justafreak')).not.toBeInTheDocument();
  });
});
