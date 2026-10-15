// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { MusicModeBoundary } from './MusicModeBoundary';
import { useUnreadNotifications } from '../../notifications/model/queries';

const state = vi.hoisted(() => ({ gameMode: false, unread: vi.fn() }));
vi.mock('../model/MusicProvider', () => ({ useMusic: () => state }));
vi.mock('./MusicGameMode', () => ({ MusicGameMode: () => <div>Game player</div> }));
vi.mock('../../notifications/api/notificationsApi', () => ({
  notificationsApi: { unread: state.unread },
}));
vi.mock('@/shared/api/client', () => ({ assertSession: vi.fn() }));
vi.mock('@social-network/shared-stores', () => ({ useAuthStore: { getState: () => ({}) } }));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

it('unmounts background work, cancels consumed requests, stops notification polling and restores the app', async () => {
  vi.useFakeTimers();
  state.gameMode = false;
  state.unread.mockResolvedValue({ total: 0 });
  const cleanup = vi.fn();
  const aborted = vi.fn();
  function SocialScreen() {
    useUnreadNotifications('qa');
    useQuery({
      queryKey: ['mobile', 'qa', 'slow-feed'],
      queryFn: ({ signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            aborted();
            reject(new Error('cancelled'));
          });
        }),
    });
    React.useEffect(() => () => cleanup(), []);
    return <div>Social screens</div>;
  }
  const element = document.createElement('div');
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = () =>
    act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <MusicModeBoundary>
            <SocialScreen />
          </MusicModeBoundary>
        </QueryClientProvider>,
      ),
    );
  try {
    await render();
    expect(state.unread).toHaveBeenCalledTimes(1);
    state.gameMode = true;
    await render();
    expect(element.textContent).toBe('Game player');
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(aborted).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(90000));
    expect(state.unread).toHaveBeenCalledTimes(1);
    state.gameMode = false;
    await render();
    expect(element.textContent).toBe('Social screens');
    expect(state.unread).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    vi.useRealTimers();
  }
});
