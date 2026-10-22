import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationView } from '@/entities/chat';
import { chatApi } from '@/entities/chat';
import { queryKeys } from '@/shared/api/queryKeys';
import { useUIStore } from '@/shared/model/useUIStore';
import { CommunityConversation } from '../CommunityConversation';

vi.mock('@/entities/chat', () => ({ chatApi: { getConversation: vi.fn() } }));
vi.mock('../ChatThread', () => ({ default: () => <div data-testid="thread">Conversation</div> }));
const detail: ConversationView = {
  id: 'conv',
  communityId: 'server',
  type: 'GROUP',
  name: 'general',
  avatar: null,
  description: null,
  createdById: 'me',
  participants: [],
  lastMessage: null,
  unreadCount: 0,
  myTheme: 'default',
  myMuteLevel: 'NONE',
  myNickname: null,
  isArchived: false,
  isPinned: false,
  blockedByMe: false,
  pinnedMessages: [],
  blockingMe: false,
  isBlocked: false,
  createdAt: '2026-10-21T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
};
function setup(cached?: ConversationView) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  if (cached) client.setQueryData(queryKeys.conversations.detail('conv'), cached);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    client,
    ...render(
      <CommunityConversation
        communityId="server"
        conversationId="conv"
        onClose={vi.fn()}
        onSelectConversation={vi.fn()}
      />,
      { wrapper },
    ),
  };
}
describe('community conversation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ activeConversationId: null });
  });
  it('mounts an authorized group and clears its active identity on unmount', async () => {
    vi.mocked(chatApi.getConversation).mockResolvedValue(detail);
    const view = setup();
    await screen.findByTestId('thread');
    await waitFor(() => expect(useUIStore.getState().activeConversationId).toBe('conv'));
    view.unmount();
    expect(useUIStore.getState().activeConversationId).toBeNull();
  });
  it('does not render a cached conversation from another community', async () => {
    vi.mocked(chatApi.getConversation).mockResolvedValue({ ...detail, communityId: 'other' });
    setup({ ...detail, communityId: 'other' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Conversation unavailable');
    expect(screen.queryByTestId('thread')).not.toBeInTheDocument();
    expect(useUIStore.getState().activeConversationId).toBeNull();
  });
  it('retracts stale cached chat and its active identity after an access failure', async () => {
    vi.mocked(chatApi.getConversation).mockResolvedValue(detail);
    const { client } = setup(detail);
    await screen.findByTestId('thread');
    await waitFor(() => expect(useUIStore.getState().activeConversationId).toBe('conv'));
    vi.mocked(chatApi.getConversation).mockRejectedValue(new Error('403'));
    await act(async () => {
      await client.invalidateQueries({ queryKey: queryKeys.conversations.detail('conv') });
    });
    await screen.findByRole('alert');
    expect(screen.queryByTestId('thread')).not.toBeInTheDocument();
    expect(useUIStore.getState().activeConversationId).toBeNull();
  });
  it('does not erase an active identity owned by a different mounted channel', async () => {
    vi.mocked(chatApi.getConversation).mockResolvedValue(detail);
    const view = setup();
    await screen.findByTestId('thread');
    useUIStore.setState({ activeConversationId: 'other-conversation' });
    view.unmount();
    expect(useUIStore.getState().activeConversationId).toBe('other-conversation');
  });
});
