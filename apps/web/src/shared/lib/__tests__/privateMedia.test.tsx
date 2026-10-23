import { vi, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/httpClient';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { fetchMedia, resolveMediaUrl } from '@/shared/lib/privateMedia';
import { MediaImage } from '@/shared/lib/privateMediaView';
import { isPersistableQuery } from '@/shared/api/queryPersistencePolicy';

vi.mock('@/shared/api/httpClient', () => ({ apiClient: { get: vi.fn() } }));
const ref = 'private-media://10000000-0000-4000-8000-000000000001';
const signed = (url = 'https://closed.test/file?signature=one') => ({
  data: { url, expiresAt: new Date(Date.now() + 60_000).toISOString() },
});
const clients: QueryClient[] = [];
const wrap = (element: React.ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
};
beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ userId: 'alice', isAuthenticated: true });
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
});

it('leaves public images usable without a QueryProvider', () => {
  render(<MediaImage src="https://public.test/file" alt="Public" />);
  expect(screen.getByAltText('Public')).toHaveAttribute('src', 'https://public.test/file');
  expect(apiClient.get).not.toHaveBeenCalled();
});
it('keeps the raw ref in query identity while rendering a transient signed image', async () => {
  vi.mocked(apiClient.get).mockResolvedValue(signed());
  wrap(<MediaImage src={ref} alt="Private" />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByAltText('Private')).toHaveAttribute(
    'src',
    'https://closed.test/file?signature=one',
  );
  expect(clients[0].getQueryCache().getAll()[0].queryKey).toEqual(['private-media', 'alice', ref]);
  expect(
    isPersistableQuery({ queryKey: ['private-media', 'alice', ref], state: { status: 'success' } }),
  ).toBe(false);
});
it('shows a recoverable denial and retries only on explicit action', async () => {
  vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('revoked')).mockResolvedValue(signed());
  wrap(<MediaImage src={ref} alt="Private" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  expect(screen.queryByAltText('Private')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry attachment' }));
  expect(await screen.findByAltText('Private')).toBeInTheDocument();
});
it('refreshes an expired media GET once without a playback refresh interval', async () => {
  vi.mocked(apiClient.get)
    .mockResolvedValueOnce(signed())
    .mockResolvedValue(signed('https://closed.test/file?signature=two'));
  wrap(<MediaImage src={ref} alt="Private" />);
  fireEvent.error(await screen.findByAltText('Private'));
  await waitFor(() =>
    expect(screen.getByAltText('Private')).toHaveAttribute(
      'src',
      'https://closed.test/file?signature=two',
    ),
  );
  fireEvent.error(screen.getByAltText('Private'));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(apiClient.get).toHaveBeenCalledTimes(2);
});
it('discards a late signed URL after switching accounts', async () => {
  vi.mocked(apiClient.get).mockImplementation(async () => {
    useAuthStore.setState({ userId: 'bob' });
    return signed();
  });
  await expect(resolveMediaUrl(ref)).rejects.toThrow('Sign in');
});
it.each(['http://outside.test/file', 'https://user:secret@outside.test/file'])(
  'rejects unsafe returned URL %s',
  async (url) => {
    vi.mocked(apiClient.get).mockResolvedValue(signed(url));
    await expect(resolveMediaUrl(ref)).rejects.toThrow('Invalid private attachment URL');
  },
);
it('fetches bytes directly without app credentials or referrer', async () => {
  vi.mocked(apiClient.get).mockResolvedValue(signed());
  const fetch = vi.fn().mockResolvedValue(new Response('file'));
  vi.stubGlobal('fetch', fetch);
  await fetchMedia(ref, { credentials: 'include' });
  expect(fetch).toHaveBeenCalledWith(
    'https://closed.test/file?signature=one',
    expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
  );
});
