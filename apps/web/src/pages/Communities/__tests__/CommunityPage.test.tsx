import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityPage from '../CommunityPage';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { useUIStore } from '@/shared/model/useUIStore';

const fixture = vi.hoisted(() => ({
  community: {
    id: 'server',
    name: 'Creative House',
    description: 'Make things together.',
    avatar: null,
    memberCount: 7,
    createdAt: '2026-10-21T00:00:00.000Z',
  },
  channels: [
    {
      id: 'general',
      communityId: 'server',
      conversationId: 'conv-general',
      name: 'general',
      description: 'Say hello',
      position: 0,
    },
    {
      id: 'design',
      communityId: 'server',
      conversationId: 'conv-design',
      name: 'design',
      description: 'Share your work',
      position: 1,
    },
  ],
  membersEnabled: vi.fn(),
  channelsError: false,
}));
vi.mock('@/features/communities', () => ({
  useCommunity: () => ({ data: fixture.community, isPending: false, isError: false }),
  useMyCommunities: () => ({ data: { data: [fixture.community], nextCursor: null } }),
  useCommunityChannels: () =>
    fixture.channelsError
      ? {
          isSuccess: false,
          isError: true,
          isPending: false,
          data: { role: 'OWNER', data: fixture.channels },
          error: new Error('offline'),
          refetch: vi.fn(),
        }
      : { data: { role: 'OWNER', data: fixture.channels }, isSuccess: true, isPending: false },
  useCommunityMembers: (_id: string, enabled: boolean) => {
    fixture.membersEnabled(enabled);
    return { data: { data: [], nextCursor: null }, isPending: false };
  },
}));
vi.mock('@/features/chat', () => ({
  CommunityConversation: ({
    conversationId,
    onClose,
    onSelectConversation,
  }: {
    conversationId: string;
    onClose: () => void;
    onSelectConversation: (id: string) => void;
  }) => (
    <div data-testid="embedded-conversation">
      {conversationId}
      <button onClick={onClose}>Close embedded chat</button>
      <button onClick={() => onSelectConversation('conv-design')}>Select another channel</button>
    </div>
  ),
}));
vi.mock('@/widgets/communities', () => ({
  CommunityCreateDialog: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog">
      <button onClick={onClose}>Close creation</button>
    </div>
  ),
  CommunityInviteDialog: () => <div role="dialog">Invitations</div>,
  CommunityMembers: () => (
    <section aria-label="Community members">Manage members and roles</section>
  ),
}));
vi.mock('@/shared/seo', () => ({ SEOHead: () => null }));
function Location() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function setup(route = '/communities/server') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={[route]}>
        <Location />
        <Routes>
          <Route path="/communities/:communityId" element={<CommunityPage />} />
          <Route path="/communities/:communityId/channels/:channelId" element={<CommunityPage />} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe('community workspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.channelsError = false;
    useAuthStore.setState({ isAuthenticated: true, userId: 'me' });
    useUIStore.setState({ isSidebarExpanded: false });
  });
  it('keeps channels, people and server management within the same workspace', () => {
    setup();
    expect(screen.getByRole('navigation', { name: 'Your servers' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Community channels' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit community' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Invite people' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Direct messages' })).toHaveAttribute(
      'href',
      '/messages',
    );
  });
  it('opens a channel without leaving its server and close restores channel focus', async () => {
    setup();
    fireEvent.click(screen.getByRole('link', { name: 'general' }));
    expect(await screen.findByTestId('embedded-conversation')).toHaveTextContent('conv-general');
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/communities/server/channels/general',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close embedded chat' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/communities/server');
    await waitFor(() => expect(screen.getByRole('link', { name: 'general' })).toHaveFocus());
  });
  it('resolves conversation search results to community channel links', async () => {
    setup('/communities/server/channels/general');
    fireEvent.click(await screen.findByRole('button', { name: 'Select another channel' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/communities/server/channels/design');
    expect(await screen.findByTestId('embedded-conversation')).toHaveTextContent('conv-design');
  });
  it('does not mount arbitrary conversation ids from an unknown channel deep link', () => {
    setup('/communities/server/channels/not-authorized');
    expect(screen.getByRole('heading', { name: 'Channel unavailable' })).toBeInTheDocument();
    expect(screen.queryByTestId('embedded-conversation')).not.toBeInTheDocument();
  });
  it('does not mount private channel content or enable member queries for guests', () => {
    useAuthStore.setState({ isAuthenticated: false, userId: null });
    setup('/communities/server/channels/general');
    expect(
      screen.getByRole('heading', { name: 'An invitation opens the door.' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('embedded-conversation')).not.toBeInTheDocument();
    expect(fixture.membersEnabled).toHaveBeenLastCalledWith(false);
  });
  it('replaces channel content with recovery on membership lookup errors', () => {
    fixture.channelsError = true;
    setup('/communities/server/channels/general');
    expect(
      screen.getByRole('heading', { name: 'Channels could not be loaded' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('embedded-conversation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit community' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invite people' })).not.toBeInTheDocument();
  });
  it('filters channels locally and clear restores search focus', () => {
    setup();
    const search = screen.getByRole('textbox', { name: 'Filter channels' });
    fireEvent.change(search, { target: { value: 'design' } });
    expect(screen.queryByRole('link', { name: 'general' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear channel search' }));
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(screen.getByRole('link', { name: 'general' })).toBeInTheDocument();
  });
  it('keeps member moderation in a bookmarkable section', () => {
    setup('/communities/server?view=members');
    expect(screen.getByRole('region', { name: 'Community members' })).toHaveTextContent(
      'Manage members and roles',
    );
    expect(screen.queryByTestId('embedded-conversation')).not.toBeInTheDocument();
  });
});
