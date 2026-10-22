import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityChannelArchiveDialog } from '../CommunityChannelArchiveDialog';
const http = vi.hoisted(() => ({ patch: vi.fn() }));
vi.mock('@/shared/api/httpClient', () => ({ apiClient: http }));
const channel = {
  id: 'channel',
  communityId: 'server',
  conversationId: 'conversation',
  name: 'general',
  description: '',
  position: 0,
  archivedAt: null,
};
describe('community channel archive confirmation', () => {
  beforeEach(() => vi.clearAllMocks());
  it('focuses Cancel, preserves errors and only acknowledges a valid archive response', async () => {
    const onSaved = vi.fn();
    http.patch
      .mockResolvedValueOnce({ data: '<html>fallback</html>' })
      .mockResolvedValueOnce({ data: { ...channel, archivedAt: '2026-10-22T00:00:00.000Z' } });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CommunityChannelArchiveDialog
          channel={channel}
          revision={4}
          onClose={vi.fn()}
          onSaved={onSaved}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Archive channel' }));
    await screen.findByRole('alert');
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Archive channel' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(http.patch).toHaveBeenCalledWith(
      '/messenger/communities/server/channels/channel/archive',
      { archived: true, revision: 4 },
    );
  });
});
