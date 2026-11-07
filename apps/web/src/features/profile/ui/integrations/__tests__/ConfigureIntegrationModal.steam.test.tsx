import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigureIntegrationModal, type PlatformConfig } from '../ConfigureIntegrationModal';

const { startSteamAuth, startOAuth, unlink, invalidateQueries, desktopMode, desktopConnect } =
  vi.hoisted(() => ({
    desktopMode: vi.fn<() => boolean>(),
    desktopConnect: vi.fn<(signal: AbortSignal) => Promise<Record<string, unknown>>>(),
    startSteamAuth:
      vi.fn<
        (origin: string, signal?: AbortSignal) => Promise<{ url: string; launchProof: string }>
      >(),
    startOAuth:
      vi.fn<
        (platform: string, signal?: AbortSignal) => Promise<{ url: string; launchProof: string }>
      >(),
    invalidateQueries: vi.fn(),
    unlink: vi.fn<(platform: string) => Promise<void>>(),
  }));
vi.mock('@/shared/lib/platform', () => ({ isDesktop: desktopMode }));
vi.mock('@/shared/lib/desktopYouTubeOAuth', () => ({ connectDesktopYouTube: desktopConnect }));
vi.mock('@/entities/showcase', () => ({
  DotaRankMedal: () => null,
  CS2PremierBadge: () => null,
  ShowcaseIntegrationCard: () => null,
  integrationsApi: { startSteamAuth, startOAuth, unlink },
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
    desktopMode.mockReturnValue(false);
    desktopConnect.mockReset();
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

  it.each([
    ['github', 'GitHub'],
    ['spotify', 'Spotify'],
    ['steam', 'Steam'],
    ['twitch', 'Twitch'],
  ])('preserves %s connect, completion and disconnect with cache refresh', async (id, name) => {
    const owner = id === 'github' ? 'https://core.example' : 'https://music.example';
    const path = id === 'github' ? '/auth/github/oauth/launch' : '/integrations/oauth/launch';
    startOAuth.mockResolvedValue({ url: `${owner}/v1${path}#${'a'.repeat(64)}`, launchProof });
    unlink.mockResolvedValue();
    show({ ...platform, id, name, authProviderName: name });
    fireEvent.click(screen.getByRole('button', { name: `Sign in through ${name}` }));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalled());
    expect(open).toHaveBeenCalledWith('about:blank', `${id}_oauth_window`, expect.any(String));
    if (id === 'steam') expect(startSteamAuth).toHaveBeenCalled();
    else expect(startOAuth).toHaveBeenCalledWith(id, expect.any(AbortSignal));
    const data = { username: 'linked-owner', steamId: '76561198000000001', verified: true };
    const message = new MessageEvent('message', {
      origin: owner,
      data: { type: 'INTEGRATION_AUTH_SUCCESS', platform: id, data },
    });
    Object.defineProperty(message, 'source', { value: popup });
    await act(async () => window.dispatchEvent(message));
    expect(save).toHaveBeenCalledWith(id, data);
    expect(popup.close).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect Account' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(unlink).toHaveBeenCalledWith(id));
    expect(save).toHaveBeenCalledWith(id, null);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['showcase'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
  });

  it('connects desktop YouTube through the native browser bridge and refreshes the profile', async () => {
    desktopMode.mockReturnValue(true);
    let finish: ((data: Record<string, unknown>) => void) | undefined;
    desktopConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    show({ ...platform, id: 'youtube', name: 'YouTube', authProviderName: 'Google OAuth' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in through YouTube' }));
    expect(screen.getByRole('button', { name: /Connecting to YouTube/ })).toBeDisabled();
    expect(open).not.toHaveBeenCalled();
    expect(startOAuth).not.toHaveBeenCalled();
    const data = { channelTitle: 'My YouTube', verified: true };
    await act(async () => finish?.(data));
    expect(save).toHaveBeenCalledWith('youtube', data);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['showcase'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['profile'] });
  });

  it('shows desktop YouTube errors and aborts on modal close without accepting late results', async () => {
    desktopMode.mockReturnValue(true);
    desktopConnect.mockRejectedValueOnce(
      new Error('YouTube authentication was cancelled or denied'),
    );
    const youtube = {
      ...platform,
      id: 'youtube',
      name: 'YouTube',
      authProviderName: 'Google OAuth',
    };
    const view = show(youtube);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in through YouTube' }));
    await screen.findByText('YouTube authentication was cancelled or denied');
    let finish: ((data: Record<string, unknown>) => void) | undefined;
    desktopConnect.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign in through YouTube' }));
    const signal = desktopConnect.mock.calls[1][0];
    view.rerender(
      <ConfigureIntegrationModal
        isOpen={false}
        platform={youtube}
        onClose={vi.fn()}
        onSaveSuccess={save}
      />,
    );
    expect(signal.aborted).toBe(true);
    await act(async () => finish?.({ verified: true }));
    expect(save).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('preserves the browser YouTube popup flow', async () => {
    startOAuth.mockResolvedValue({
      url: `https://music.example/v1/integrations/oauth/launch#${'a'.repeat(64)}`,
      launchProof,
    });
    show({ ...platform, id: 'youtube', name: 'YouTube', authProviderName: 'Google OAuth' });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in through YouTube' }));
    await waitFor(() => expect(popup.location.replace).toHaveBeenCalled());
    expect(startOAuth).toHaveBeenCalledWith('youtube', expect.any(AbortSignal));
    expect(desktopConnect).not.toHaveBeenCalled();
  });
});
