import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareModal } from '../ShareModal';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useUIStore } from '@/shared/model/useUIStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { followApi } from '@/entities/user';
import { chatApi, type MessageView } from '@/entities/chat';
import { postsApi } from '@/features/posts/api/postsApi';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

const confirmedMessage: MessageView = {
  id: 'message-1',
  conversationId: 'conv-target-1',
  sender: { id: 'sender-1', username: 'sender', displayName: null, avatar: null },
  body: 'Post link',
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt: '2026-10-17T12:00:00.000Z',
  editedAt: null,
};

vi.mock('@/entities/profile/model/useCurrentUser');

describe('ShareModal (Comprehensive Suite)', () => {
  const mockPost = {
    id: 'post-123',
    author: 'Alice Wonderland',
    handle: 'alice',
    avatar: 'https://example.com/alice.jpg',
    text: 'Exciting announcement about our new release!',
    likes: 50,
    comments: 10,
    reposts: 5,
    isLiked: false,
    isSaved: false,
    isReposted: false,
  };

  const mockUsers = [
    {
      id: 'u-1',
      username: 'charlie',
      displayName: 'Charlie Brown',
      avatar: null,
      followsYou: true,
    },
    { id: 'u-2', username: 'david', displayName: 'David Bowie', avatar: null, followsYou: false },
  ];

  let writeTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useMessageToastStore.getState().dismissAll();
    vi.spyOn(chatApi, 'sendMessage').mockResolvedValue(confirmedMessage);
    useUIStore.setState({
      isShareModalOpen: true,
      activePostForShare: mockPost as any,
    });

    vi.mocked(useCurrentUser).mockReturnValue({
      data: { id: 'user-me-1', username: 'me' } as any,
      isLoading: false,
    } as any);

    vi.spyOn(followApi, 'getFollowing').mockResolvedValue({
      items: mockUsers as any,
      nextCursor: null,
    });
    vi.spyOn(followApi, 'getFollowers').mockResolvedValue({
      items: mockUsers as any,
      nextCursor: null,
    });
    vi.spyOn(postsApi, 'share').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'createDirectConversation').mockResolvedValue({ id: 'conv-target-1' } as any);

    writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextSpy,
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      configurable: true,
      writable: true,
    });

    Object.defineProperty(navigator, 'canShare', {
      value: vi.fn().mockReturnValue(true),
      configurable: true,
      writable: true,
    });

    window.open = vi.fn();
  });

  it('renders modal header, search input, and user list', async () => {
    renderWithProviders(<ShareModal />);

    expect(screen.getByText('Spread')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
      expect(screen.getByText('David Bowie')).toBeInTheDocument();
    });
  });

  it('filters users based on search input', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ShareModal />);

    await waitFor(() => expect(screen.getByText('Charlie Brown')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'Charlie');

    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.queryByText('David Bowie')).not.toBeInTheDocument();
  });

  it('copies post link to clipboard and tracks share when Copy link button is clicked', async () => {
    renderWithProviders(<ShareModal />);

    const copyBtn = screen.getByText('Copy link');
    fireEvent.click(copyBtn);

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('/profile/alice#post-post-123'),
    );
    expect(postsApi.share).toHaveBeenCalledWith('post-123');
  });

  it('allows selecting user, typing message, and sending with confirmed delivery', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ShareModal />);

    await waitFor(() => expect(screen.getByText('Charlie Brown')).toBeInTheDocument());

    const userBtn = screen.getByRole('button', { name: /charlie brown/i });
    await user.click(userBtn);

    // After selecting a user, textarea and Send to Direct appear
    const messageInput = screen.getByPlaceholderText('Write a message...');
    await user.type(messageInput, 'Check out this awesome post!');

    const sendBtn = screen.getByRole('button', { name: /send to direct/i });
    await user.click(sendBtn);

    expect(chatApi.createDirectConversation).toHaveBeenCalledWith('u-1');
    expect(chatApi.sendMessage).toHaveBeenCalledWith('conv-target-1', {
      text: expect.stringContaining('Check out this awesome post!'),
      clientMessageId: expect.any(String),
    });
    expect(useUIStore.getState().isShareModalOpen).toBe(false);
  });

  it('keeps failed recipients selected and retries only them after partial delivery', async () => {
    vi.mocked(chatApi.sendMessage)
      .mockResolvedValueOnce(confirmedMessage)
      .mockRejectedValueOnce(new Error('Unavailable'));
    renderWithProviders(<ShareModal />);
    fireEvent.click(await screen.findByText('Charlie Brown'));
    fireEvent.click(screen.getByText('David Bowie'));
    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'Read this' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to direct/i }));
    await waitFor(() =>
      expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Partially sent'),
    );
    expect(useUIStore.getState().isShareModalOpen).toBe(true);
    expect(screen.getByPlaceholderText('Write a message...')).toHaveValue('Read this');
    expect(postsApi.share).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /send to direct/i }));
    await waitFor(() => expect(useUIStore.getState().isShareModalOpen).toBe(false));
    expect(chatApi.createDirectConversation).toHaveBeenNthCalledWith(3, 'u-2');
    expect(chatApi.sendMessage).toHaveBeenCalledTimes(3);
    expect(vi.mocked(chatApi.sendMessage).mock.calls[2]?.[1].clientMessageId).toBe(
      vi.mocked(chatApi.sendMessage).mock.calls[1]?.[1].clientMessageId,
    );
  });

  it('uses a new message id after the draft changes or the modal is reopened', async () => {
    vi.mocked(chatApi.sendMessage).mockRejectedValue(new Error('Response timed out'));
    renderWithProviders(<ShareModal />);
    fireEvent.click(await screen.findByText('Charlie Brown'));
    const send = async () => {
      const previousCalls = vi.mocked(chatApi.sendMessage).mock.calls.length;
      fireEvent.click(screen.getByRole('button', { name: /send to direct/i }));
      await waitFor(() => expect(chatApi.sendMessage).toHaveBeenCalledTimes(previousCalls + 1));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /send to direct/i })).toBeEnabled(),
      );
      return vi.mocked(chatApi.sendMessage).mock.calls[previousCalls]?.[1].clientMessageId;
    };
    const firstId = await send();
    expect(firstId).toEqual(expect.any(String));
    expect(await send()).toBe(firstId);
    fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
      target: { value: 'Updated draft' },
    });
    const updatedId = await send();
    expect(updatedId).not.toBe(firstId);
    const activePostForShare = useUIStore.getState().activePostForShare;
    fireEvent.click(screen.getByTestId('close-button'));
    useUIStore.setState({ isShareModalOpen: true, activePostForShare });
    await screen.findByText('Charlie Brown');
    expect(await send()).not.toBe(updatedId);
  });

  it('does not report success or count a share when every delivery fails', async () => {
    vi.mocked(chatApi.sendMessage).mockRejectedValue(new Error('Delivery failed'));
    renderWithProviders(<ShareModal />);
    fireEvent.click(await screen.findByText('Charlie Brown'));
    fireEvent.click(screen.getByRole('button', { name: /send to direct/i }));
    await waitFor(() => expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Error'));
    expect(useUIStore.getState().isShareModalOpen).toBe(true);
    expect(postsApi.share).not.toHaveBeenCalled();
  });

  it('keeps the modal open when the server response has no persisted message id', async () => {
    vi.mocked(chatApi.sendMessage).mockResolvedValue({ ...confirmedMessage, id: '' });
    renderWithProviders(<ShareModal />);
    fireEvent.click(await screen.findByText('Charlie Brown'));
    fireEvent.click(screen.getByRole('button', { name: /send to direct/i }));
    await waitFor(() => expect(useMessageToastStore.getState().toasts[0]?.title).toBe('Error'));
    expect(useUIStore.getState().isShareModalOpen).toBe(true);
    expect(postsApi.share).not.toHaveBeenCalled();
  });

  it('waits for delivery confirmation before counting the share or closing', async () => {
    let confirmDelivery = (_message: MessageView) => {};
    vi.mocked(chatApi.sendMessage).mockReturnValue(
      new Promise<MessageView>((resolve) => {
        confirmDelivery = resolve;
      }),
    );
    renderWithProviders(<ShareModal />);
    fireEvent.click(await screen.findByText('Charlie Brown'));
    fireEvent.click(screen.getByRole('button', { name: /send to direct/i }));
    await waitFor(() => expect(chatApi.sendMessage).toHaveBeenCalledTimes(1));
    expect(useUIStore.getState().isShareModalOpen).toBe(true);
    expect(postsApi.share).not.toHaveBeenCalled();
    expect(useMessageToastStore.getState().toasts).toHaveLength(0);
    confirmDelivery(confirmedMessage);
    await waitFor(() => expect(useUIStore.getState().isShareModalOpen).toBe(false));
    expect(postsApi.share).toHaveBeenCalledTimes(1);
  });

  it('opens social sharing windows on click (X, Telegram, WhatsApp, Facebook)', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<ShareModal />);

    const xBtn = screen.getByRole('button', { name: /^x$/i });
    await user.click(xBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      'noopener,noreferrer',
    );

    const telegramBtn = screen.getByRole('button', { name: /telegram/i });
    await user.click(telegramBtn);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('t.me/share/url'),
      '_blank',
      'noopener,noreferrer',
    );
  });
});
