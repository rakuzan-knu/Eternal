import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigureIntegrationModal, type PlatformConfig } from '../ConfigureIntegrationModal';

const { startSteamAuth, startOAuth, invalidateQueries } = vi.hoisted(() => ({
  startSteamAuth:
    vi.fn<
      (origin: string, signal?: AbortSignal) => Promise<{ url: string; launchProof: string }>
    >(),
  startOAuth:
    vi.fn<
      (platform: string, signal?: AbortSignal) => Promise<{ url: string; launchProof: string }>
    >(),
  invalidateQueries: vi.fn(),
}));
vi.mock('@/entities/showcase', () => ({
  DotaRankMedal: () => null,
  CS2PremierBadge: () => null,
  ShowcaseIntegrationCard: () => null,
  integrationsApi: { startSteamAuth, startOAuth },
}));
vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { id: 'current-user', username: 'owner' } }),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries }) }));
vi.mock('@/shared/api/httpClient', () => ({
  getApiUrl: (path: string) =>
    `https://${path.startsWith('/auth/github') ? 'core' : 'music'}.example/v1${path}`,
}));
vi.mock('@/shared/model/useSpotifyPlayerStore', () => ({
  useSpotifyPlayerStore: { getState: vi.fn() },
}));

describe('Steam integration popup', () => {
  const platform: PlatformConfig = {
    id: 'steam',
    name: 'Steam',
    icon: <span>Steam</span>,
    accentColor: '#000',
    placeholder: 'Steam ID',
    description: 'Steam connection',
    authProviderName: 'Steam OpenID',
  };
  const launchUrl = 'https://music.example/v1/integrations/steam/launch#' + 'a'.repeat(64);
  const launchProof = 'b'.repeat(64);
  const popup = {
    closed: false,
    close: vi.fn(),
    postMessage: vi.fn(),
    location: { replace: vi.fn() },
  };
  const open = vi.fn(() => popup);
  const save = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    popup.closed = false;
    startSteamAuth.mockReset().mockResolvedValue({ url: launchUrl, launchProof });
    vi.stubGlobal('open', open);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function show(selectedPlatform = platform) {
    return render(
      <ConfigureIntegrationModal
        isOpen
        platform={selectedPlatform}
        onClose={vi.fn()}
        onSaveSuccess={save}
      />,
    );
  }

  it('opens a blank popup during the click, then starts authenticated linking without a userId and navigates', async () => {
    let complete: ((result: { url: string; launchProof: string }) => void) | undefined;
    startSteamAuth.mockImplementation(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    show();
    fireEvent.click(screen.getByRole('button', { name: /Sign in through Steam/ }));
    expect(open).toHaveBeenCalledWith(
      'about:blank',
      'steam_oauth_window',
      expect.stringContaining('width=640'),
    );
    expect(startSteamAuth).toHaveBeenCalledWith(window.location.origin, expect.any(AbortSignal));
    expect(screen.getByRole('button', { name: /Connecting to Steam/ })).toBeDisabled();
    expect(popup.location.replace).not.toHaveBeenCalled();
    await act(async () => complete?.({ url: launchUrl, launchProof }));
    expect(popup.location.replace).toHaveBeenCalledWith(launchUrl);
  });

  it('shows a recoverable error and closes the blank popup if authenticated start fails', async () => {
    startSteamAuth.mockRejectedValue(new Error('Unauthorized'));
    show();
    fireEvent.click(screen.getByRole('button', { name: /Sign in through Steam/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not start Steam authentication',
    );
    expect(popup.close).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Sign in through Steam/ })).toBeEnabled();
    expect(popup.location.replace).not.toHaveBeenCalled();
  });

  it('does not start a transaction when the browser blocks the popup', () => {
    vi.stubGlobal(
      'open',
      vi.fn(() => null),
    );
    show();
    fireEvent.click(screen.getByRole('button', { name: /Sign in through Steam/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('Allow popups');
    expect(startSteamAuth).not.toHaveBeenCalled();
  });

  it('rejects an unexpected launch origin and cleans up pending work on unmount', async () => {
    startSteamAuth.mockResolvedValue({
      url: 'https://attacker.example/launch#' + 'a'.repeat(64),
      launchProof,
    });
    const mounted = show();
    fireEvent.click(screen.getByRole('button', { name: /Sign in through Steam/ }));
    await screen.findByRole('alert');
    expect(popup.location.replace).not.toHaveBeenCalled();
    const signal = startSteamAuth.mock.calls[0]?.[1];
    mounted.unmount();
    expect(signal?.aborted).toBe(true);
    expect(popup.close).toHaveBeenCalled();
  });

  it('accepts success only from the exact Music origin and its own popup', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /Sign in through Steam/ }));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalled());
    const data = {
      type: 'INTEGRATION_AUTH_SUCCESS',
      platform: 'steam',
      data: { steamId: '76561198000000001', verified: true },
    };
    window.dispatchEvent(
      new MessageEvent('message', { origin: 'https://music.example', source: window, data }),
    );
    expect(save).not.toHaveBeenCalled();
    const spoofed = new MessageEvent('message', { origin: 'https://attacker.vercel.app', data });
    Object.defineProperty(spoofed, 'source', { value: popup });
    window.dispatchEvent(spoofed);
    expect(save).not.toHaveBeenCalled();
    const success = new MessageEvent('message', { origin: 'https://music.example', data });
    Object.defineProperty(success, 'source', { value: popup });
    await act(async () => {
      window.dispatchEvent(success);
    });
    expect(save).toHaveBeenCalledWith('steam', data.data);
  });

  it('starts GitHub on core and shares its generic proof only with the exact launch popup', async () => {
    const result = {
      url: 'https://core.example/v1/auth/github/oauth/launch#' + 'c'.repeat(64),
      launchProof: 'd'.repeat(64),
    };
    startOAuth.mockResolvedValue(result);
    show({ ...platform, id: 'github', name: 'GitHub', authProviderName: 'GitHub' });
    fireEvent.click(screen.getByRole('button', { name: /Sign in through GitHub/ }));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalledWith(result.url));
    expect(startOAuth).toHaveBeenCalledWith('github', expect.any(AbortSignal));
    const data = { type: 'OAUTH_LAUNCH_REQUEST' };
    const untrusted = new MessageEvent('message', { origin: 'https://attacker.vercel.app', data });
    Object.defineProperty(untrusted, 'source', { value: popup });
    window.dispatchEvent(untrusted);
    expect(popup.postMessage).not.toHaveBeenCalled();
    const message = new MessageEvent('message', { origin: 'https://core.example', data });
    Object.defineProperty(message, 'source', { value: popup });
    window.dispatchEvent(message);
    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: 'OAUTH_LAUNCH_PROOF', proof: result.launchProof },
      'https://core.example',
    );
  });

  it('shares the launch proof only with the exact Music popup and never in its URL', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: /Sign in through Steam/ }));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalled());
    const data = { type: 'STEAM_LAUNCH_REQUEST', platform: 'steam' };
    window.dispatchEvent(
      new MessageEvent('message', { origin: 'https://music.example', source: window, data }),
    );
    const spoofed = new MessageEvent('message', { origin: 'https://attacker.example', data });
    Object.defineProperty(spoofed, 'source', { value: popup });
    window.dispatchEvent(spoofed);
    expect(popup.postMessage).not.toHaveBeenCalled();
    const challenge = new MessageEvent('message', { origin: 'https://music.example', data });
    Object.defineProperty(challenge, 'source', { value: popup });
    window.dispatchEvent(challenge);
    expect(popup.postMessage).toHaveBeenCalledWith(
      { type: 'STEAM_LAUNCH_PROOF', proof: launchProof },
      'https://music.example',
    );
    expect(launchUrl).not.toContain(launchProof);
  });
});
