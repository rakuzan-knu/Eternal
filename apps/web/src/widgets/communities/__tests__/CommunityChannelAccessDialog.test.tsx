import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityChannelAccessDialog } from '../CommunityChannelAccessDialog';
import { CommunityCreateDialog } from '../CommunityManagement';
import { communityKeys } from '@/features/communities';

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('@/shared/api/httpClient', () => ({ apiClient: http }));
const memberId = '10000000-0000-4000-8000-000000000001';
const ownerId = '10000000-0000-4000-8000-000000000002';
const channel = {
  id: 'channel',
  communityId: 'server',
  conversationId: 'conversation',
  name: 'general',
  description: '',
  position: 0,
  archivedAt: null,
};
const member = {
  userId: memberId,
  username: 'alice',
  displayName: 'Alice',
  avatar: null,
  role: 'MEMBER',
  state: 'ACTIVE',
};
const access = { isPrivate: false, memberIds: [], revision: 4 };
function setup(create = false) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      {create ? (
        <CommunityCreateDialog communityId="server" onClose={onClose} onCreated={onSaved} />
      ) : (
        <CommunityChannelAccessDialog channel={channel} onClose={onClose} onSaved={onSaved} />
      )}
    </QueryClientProvider>,
  );
  return { onSaved, onClose, client };
}
describe('private channel access management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    http.get.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.endsWith('/access')
          ? access
          : {
              data: [
                member,
                {
                  ...member,
                  userId: ownerId,
                  username: 'owner',
                  displayName: 'Owner',
                  role: 'OWNER',
                },
              ],
              nextCursor: null,
            },
      }),
    );
  });
  it('reviews grants, preserves invalid acknowledgements and closes only after a valid save', async () => {
    http.patch
      .mockResolvedValueOnce({ data: '<html>fallback</html>' })
      .mockResolvedValueOnce({ data: { isPrivate: true, memberIds: [memberId], revision: 5 } });
    const { onSaved } = setup();
    fireEvent.click(await screen.findByLabelText('Private channel'));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Alice/ }));
    expect(screen.getByRole('checkbox', { name: /Owner/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Owner/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Review access changes' }));
    expect(screen.getByText(/Other members will lose access/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to editing' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Apply access changes' }));
    await screen.findByRole('alert');
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply access changes' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(http.patch).toHaveBeenLastCalledWith(
      '/messenger/communities/server/channels/channel/access',
      { isPrivate: true, memberIds: [memberId], revision: 4 },
    );
  });
  it('keeps conflict drafts and requires explicit discard', async () => {
    http.patch.mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        data: {},
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    );
    const { onClose } = setup();
    fireEvent.click(await screen.findByLabelText('Private channel'));
    fireEvent.click(screen.getByRole('button', { name: 'Review access changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply access changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('changed while you were editing');
    expect(screen.getByRole('button', { name: 'Apply access changes' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Back to editing' }));
    expect(screen.getByLabelText('Private channel')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Private channel')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('fails closed on an incompatible access read', async () => {
    http.get.mockResolvedValue({ data: '<html>fallback</html>' });
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByLabelText('Private channel')).not.toBeInTheDocument();
    expect(http.patch).not.toHaveBeenCalled();
  });
  it('retains the original revision when a background refresh sees concurrent changes', async () => {
    const { client } = setup();
    fireEvent.click(await screen.findByLabelText('Private channel'));
    http.get.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.endsWith('/access')
          ? { ...access, revision: 9 }
          : { data: [member], nextCursor: null },
      }),
    );
    await act(async () => {
      await client.invalidateQueries({ queryKey: communityKeys.channels('server') });
    });
    expect(screen.getByLabelText('Private channel')).toBeChecked();
    http.patch.mockResolvedValue({ data: { isPrivate: true, memberIds: [], revision: 5 } });
    fireEvent.click(screen.getByRole('button', { name: 'Review access changes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply access changes' }));
    await waitFor(() =>
      expect(http.patch).toHaveBeenCalledWith(
        '/messenger/communities/server/channels/channel/access',
        { isPrivate: true, memberIds: [], revision: 4 },
      ),
    );
  });
  it('limits explicit selections to 200 while retaining removal', async () => {
    const ids = Array.from(
      { length: 200 },
      (_, index) => `20000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    );
    http.get.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.endsWith('/access')
          ? { isPrivate: true, memberIds: ids, revision: 4 }
          : { data: [member], nextCursor: null },
      }),
    );
    setup();
    expect(await screen.findByRole('checkbox', { name: /Alice/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Remove access for ${ids[0]}` }));
    expect(screen.getByRole('checkbox', { name: /Alice/ })).toBeEnabled();
    expect(screen.getByText('199 / 200 selected')).toBeVisible();
  });
  it('creates a private channel with explicit grants and preserves its draft on failure', async () => {
    http.post
      .mockResolvedValueOnce({ data: '<html>fallback</html>' })
      .mockResolvedValueOnce({ data: { ...channel, isPrivate: true } });
    const { onSaved, onClose } = setup(true);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'staff' } });
    fireEvent.click(screen.getByLabelText('Private channel'));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Alice/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create channel' }));
    await screen.findByRole('alert');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveValue('staff');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create channel' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved.mock.calls[0]?.[0]).toBe('server');
    expect(http.post).toHaveBeenLastCalledWith('/messenger/communities/server/channels', {
      name: 'staff',
      description: '',
      isPrivate: true,
      memberIds: [memberId],
    });
  });
  it('paginates and searches members without losing selected grants', async () => {
    http.get.mockImplementation(
      (url: string, config?: { params?: { after?: string; q?: string } }) =>
        Promise.resolve({
          data: url.endsWith('/access')
            ? access
            : config?.params?.q
              ? { data: [], nextCursor: null }
              : config?.params?.after
                ? {
                    data: [{ ...member, userId: ownerId, username: 'bob', displayName: 'Bob' }],
                    nextCursor: null,
                  }
                : { data: [member], nextCursor: memberId },
        }),
    );
    setup();
    fireEvent.click(await screen.findByLabelText('Private channel'));
    fireEvent.click(await screen.findByRole('checkbox', { name: /Alice/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next members' }));
    await screen.findByRole('checkbox', { name: /Bob/ });
    expect(
      within(screen.getByRole('list', { name: 'Selected members' })).getByText('Alice'),
    ).toBeVisible();
    const search = screen.getByLabelText('Find community members');
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: 'nobody' } });
    expect(http.get).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ params: expect.objectContaining({ q: 'nobody' }) }),
    );
    fireEvent.compositionEnd(search);
    await screen.findByText('No members found. Try another name.');
    expect(http.get).toHaveBeenCalledWith(
      '/messenger/communities/server/members',
      expect.objectContaining({
        params: { after: undefined, limit: 25, q: 'nobody' },
        signal: expect.any(AbortSignal),
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear member search' }));
    expect(search).toHaveFocus();
    expect(search).toHaveValue('');
    expect(screen.getByText('1 / 200 selected')).toBeVisible();
  });
});
