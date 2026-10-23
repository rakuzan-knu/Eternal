import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { CommunityChannelLayoutDialog } from '../CommunityChannelLayoutDialog';

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/shared/api/httpClient', () => ({ apiClient: http }));
const channelId = '10000000-0000-4000-8000-000000000001';
const layout = {
  communityId: 'server',
  revision: 0,
  role: 'OWNER' as const,
  categories: [],
  data: [
    {
      id: channelId,
      communityId: 'server',
      conversationId: 'conversation',
      name: 'general',
      description: '',
      position: 0,
      categoryId: null,
    },
  ],
};
function setup() {
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommunityChannelLayoutDialog layout={layout} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose, client };
}
describe('channel layout management', () => {
  beforeEach(() => vi.clearAllMocks());
  it('preserves drafts after failed saves and validates acknowledgements before closing', async () => {
    http.patch
      .mockResolvedValueOnce({ data: '<html>fallback</html>' })
      .mockResolvedValueOnce({ data: { ...layout, revision: 1 } });
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText('Channel name'), { target: { value: 'renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('alert');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Channel name')).toHaveValue('renamed');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(http.patch).toHaveBeenLastCalledWith(
      '/messenger/communities/server/channel-layout',
      expect.objectContaining({
        revision: 0,
        channels: [expect.objectContaining({ id: channelId, name: 'renamed' })],
      }),
    );
  });
  it('keeps conflict drafts and blocks repeated stale saves', async () => {
    http.patch.mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        data: {},
        headers: {},
        config: { headers: new (await import('axios')).AxiosHeaders() },
      }),
    );
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText('Channel name'), { target: { value: 'my draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Channels changed');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByLabelText('Channel name')).toHaveValue('my draft');
    expect(onClose).not.toHaveBeenCalled();
  });
  it('asks before discarding edits and supports returning to the draft', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add category' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Category 1 name')).toHaveValue('New category');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it('focuses invalid names without issuing a write', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Channel name'), { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByLabelText('Channel name')).toHaveFocus();
    expect(screen.getByLabelText('Channel name')).toHaveAttribute('aria-invalid', 'true');
    expect(http.patch).not.toHaveBeenCalled();
  });
  it('keeps the discard prompt visible on Escape and recovers the draft', async () => {
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText('Channel name'), { target: { value: 'Kept draft' } });
    fireEvent.keyDown(screen.getByLabelText('Channel name'), { key: 'Escape' });
    expect(await screen.findByText('Discard your unsaved channel changes?')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText('Channel name')).toBeVisible();
    expect(screen.getByLabelText('Channel name')).toHaveValue('Kept draft');
    expect(onClose).not.toHaveBeenCalled();
  });
});
