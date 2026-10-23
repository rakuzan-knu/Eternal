import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityNotificationDialog } from '../CommunityNotificationDialog';

const http = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('@/shared/api/httpClient', () => ({ apiClient: http }));
const channel = {
  id: 'channel',
  communityId: 'server',
  conversationId: 'conversation',
  name: 'general',
  description: '',
  position: 0,
};
const serverPreferences = { notificationMode: 'ALL', notificationMutedUntil: null };

function setup(selectedChannelId?: string) {
  const onClose = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <CommunityNotificationDialog
        communityId="server"
        channels={[channel]}
        selectedChannelId={selectedChannelId}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return onClose;
}

async function choose(name: string, option: string) {
  fireEvent.click(screen.getByRole('combobox', { name }));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

describe('personal community notification settings', () => {
  beforeEach(() => vi.resetAllMocks());

  it('keeps the draft after an invalid response and retries only the changed server field', async () => {
    http.get.mockResolvedValue({ data: serverPreferences });
    http.patch
      .mockResolvedValueOnce({ data: '<html>fallback</html>' })
      .mockResolvedValueOnce({ data: { ...serverPreferences, notificationMode: 'MENTIONS' } });
    const onClose = setup();
    await screen.findByRole('combobox', { name: 'Message alerts' });
    await choose('Message alerts', 'Only personal mentions');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByRole('alert');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Message alerts' })).toHaveTextContent(
      'Only personal mentions',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(http.patch).toHaveBeenLastCalledWith(
      '/messenger/communities/server/notification-preferences',
      { notificationMode: 'MENTIONS' },
    );
  });

  it('resets a channel override to inheritance without an admin revision', async () => {
    const initial = {
      notificationMode: 'NONE',
      effectiveNotificationMode: 'NONE',
      notificationMutedUntil: null,
    };
    http.get.mockResolvedValue({ data: initial });
    http.patch.mockResolvedValue({
      data: { ...initial, notificationMode: null, effectiveNotificationMode: 'ALL' },
    });
    const onClose = setup('channel');
    await screen.findByRole('combobox', { name: 'Message alerts' });
    await choose('Message alerts', 'Use server default');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(http.patch).toHaveBeenCalledWith(
      '/messenger/communities/server/channels/channel/notification-preferences',
      { notificationMode: null },
    );
  });

  it('preserves unsaved changes when keeping the dialog open after cancel', async () => {
    http.get.mockResolvedValue({ data: serverPreferences });
    const onClose = setup();
    await screen.findByRole('combobox', { name: 'Message alerts' });
    await choose('Message alerts', 'No message alerts');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Discard your unsaved notification changes?')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('combobox', { name: 'Message alerts' })).toHaveTextContent(
      'No message alerts',
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(http.patch).not.toHaveBeenCalled();
  });

  it('saves a temporary server mute independently of its alert mode', async () => {
    http.get.mockResolvedValue({ data: serverPreferences });
    http.patch.mockResolvedValue({ data: serverPreferences });
    const onClose = setup();
    await screen.findByRole('combobox', { name: 'Mute server' });
    await choose('Mute server', 'Mute for 1 hour');
    const before = Date.now();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    const body = http.patch.mock.calls[0][1];
    expect(body).not.toHaveProperty('notificationMode');
    expect(Date.parse(body.notificationMutedUntil)).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(Date.parse(body.notificationMutedUntil)).toBeLessThanOrEqual(Date.now() + 3_600_000);
  });

  it('offers retry when reading preferences fails', async () => {
    http.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: serverPreferences });
    setup();
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('combobox', { name: 'Message alerts' });
    expect(http.patch).not.toHaveBeenCalled();
  });
});
