import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getValidAccessToken } from '@/shared/api/httpClient';
import OAuthCallbackHandler from '../OAuthCallbackHandler';

vi.mock('@/shared/api/httpClient', () => ({
  getApiUrl: (path: string) => `https://music.example/v1${path}`,
  getValidAccessToken: vi.fn(),
}));

describe('OAuthCallbackHandler', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    vi.mocked(getValidAccessToken).mockReset();
    localStorage.setItem('accessToken', 'expired-token');
    window.history.replaceState(
      {},
      '',
      '/integrations/twitch/callback?code=provider-code&state=twitch%3Atransaction#ignored',
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.removeItem('accessToken');
    window.history.replaceState({}, '', '/');
  });

  it('shows success and closes the popup after an authenticated exchange succeeds', async () => {
    vi.useFakeTimers();
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});
    vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    await act(async () => {
      render(
        <MemoryRouter>
          <OAuthCallbackHandler platform="twitch" />
        </MemoryRouter>,
      );
    });

    expect(screen.getByText('twitch Connected!')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(close).toHaveBeenCalledOnce();
  });

  it('exchanges with the valid session token and exact callback URL without query or hash', async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue('fresh-token');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    render(
      <MemoryRouter>
        <OAuthCallbackHandler platform="twitch" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://music.example/v1/integrations/twitch/exchange-code',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fresh-token' },
        credentials: 'include',
        body: JSON.stringify({
          code: 'provider-code',
          state: 'twitch:transaction',
          redirectUri: `${window.location.origin}/integrations/twitch/callback`,
        }),
      },
    );
    expect(await screen.findByText('Authentication Failed')).toBeInTheDocument();
  });

  it('does not exchange the provider code without an authenticated session', async () => {
    vi.mocked(getValidAccessToken).mockResolvedValue(null);

    render(
      <MemoryRouter>
        <OAuthCallbackHandler platform="twitch" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Authentication Failed')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves the root YouTube redirect URI when the callback has no pathname', async () => {
    window.history.replaceState({}, '', '/?code=provider-code&state=youtube%3Atransaction#ignored');
    vi.mocked(getValidAccessToken).mockResolvedValue('valid-token');
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

    render(
      <MemoryRouter>
        <OAuthCallbackHandler platform="youtube" />
      </MemoryRouter>,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://music.example/v1/integrations/youtube/exchange-code',
      expect.objectContaining({
        body: JSON.stringify({
          code: 'provider-code',
          state: 'youtube:transaction',
          redirectUri: `${window.location.origin}/`,
        }),
      }),
    );
    expect(await screen.findByText('Authentication Failed')).toBeInTheDocument();
  });

  it('does not refresh or exchange when the provider returned an error', async () => {
    window.history.replaceState({}, '', '/integrations/twitch/callback?error=access_denied');

    render(
      <MemoryRouter>
        <OAuthCallbackHandler platform="twitch" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('access_denied')).toBeInTheDocument();
    expect(getValidAccessToken).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
