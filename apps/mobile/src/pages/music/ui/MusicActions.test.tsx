// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { MusicActions } from './MusicActions';
import { MusicProvider } from '../model/MusicProvider';
import { playlistSchema, trackSchema } from '../model/music';

const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), addTrack: vi.fn() }));
vi.mock('../api/musicApi', () => ({ musicApi: api }));
vi.mock('../model/useMusicJam', () => ({
  useMusicJam: () => ({ room: null, leave: vi.fn(), isHost: false }),
}));
vi.mock('./MusicAudio', () => ({ MusicAudio: () => null }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: () => Promise.resolve(null), setItem: () => Promise.resolve(undefined) },
}));
vi.mock('@/shared/api/client', () => ({
  webOrigin: 'https://eternal.example',
  getMobileApi: () => ({ get: vi.fn() }),
}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-clipboard', () => ({}));
vi.mock('../../feed/ui/shareLink', () => ({ shareLink: vi.fn() }));
vi.mock('./primitives', () => ({ Cover: () => null, m: {} }));
vi.mock('../../feed/ui/primitives', () => ({
  colors: {},
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ErrorNotice: ({ message }: { message: string }) => <div role="alert">{message}</div>,
}));
vi.mock('@/shared/ui', () => ({
  Button: ({
    title,
    onPress,
    disabled,
    loading,
  }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <button disabled={disabled || loading} onClick={onPress}>
      {title}
    </button>
  ),
}));
vi.mock('react-native', () => {
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    Text: View,
    ScrollView: View,
    ActivityIndicator: () => null,
    Platform: { OS: 'web' },
    Linking: {},
    Pressable: ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
      <button onClick={onPress}>{children}</button>
    ),
    TextInput: ({
      value,
      onChangeText,
      accessibilityLabel,
    }: {
      value: string;
      onChangeText: (text: string) => void;
      accessibilityLabel: string;
    }) => (
      <input
        aria-label={accessibilityLabel}
        value={value}
        onInput={(event) => onChangeText(event.currentTarget.value)}
        onChange={() => {}}
      />
    ),
    Switch: ({
      value,
      onValueChange,
      accessibilityLabel,
    }: {
      value: boolean;
      onValueChange: (value: boolean) => void;
      accessibilityLabel: string;
    }) => (
      <input
        type="checkbox"
        aria-label={accessibilityLabel}
        checked={value}
        onChange={(event) => onValueChange(event.target.checked)}
      />
    ),
  };
});
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  dispose = undefined;
  vi.clearAllMocks();
});
it('retries adding a track to the already-created private playlist without creating a duplicate', async () => {
  const track = trackSchema.parse({ id: 'sc-123', title: 'Song', artist: 'Artist' });
  const playlist = playlistSchema.parse({
    id: 'created',
    title: 'Evening',
    creatorId: 'owner',
    isPrivate: true,
  });
  api.create.mockResolvedValue(playlist);
  api.update.mockResolvedValue(playlist);
  api.addTrack.mockRejectedValueOnce(new Error('Disconnected')).mockResolvedValueOnce({});
  const element = document.createElement('div');
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const close = vi.fn();
  const open = vi.fn();
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MusicProvider userId="owner" isOnline>
          <MusicActions
            action={{ type: 'track', track }}
            onClose={close}
            onOpenTrack={vi.fn()}
            onOpenPlaylist={open}
          />
        </MusicProvider>
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
  };
  async function click(label: string) {
    const button = Array.from(element.querySelectorAll('button')).find(
      (item) => item.textContent === label,
    );
    if (!button) throw new Error(`Missing button ${label}`);
    await act(async () => button.click());
  }
  await click('Add to playlist');
  await click('Create a new playlist');
  const name = element.querySelector<HTMLInputElement>('[aria-label="Name"]');
  const privacy = element.querySelector<HTMLInputElement>('[aria-label="Private playlist"]');
  if (!name || !privacy) throw new Error('Missing playlist fields');
  await act(async () => {
    name.value = 'Evening';
    name.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => privacy.click());
  await click('Save');
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ isPublic: false }));
  expect(close).not.toHaveBeenCalled();
  expect(element.textContent).toContain('Changes could not be saved');
  await click('Save');
  expect(api.create).toHaveBeenCalledOnce();
  expect(api.update).toHaveBeenCalledWith(
    'created',
    expect.objectContaining({ title: 'Evening', isPublic: false }),
  );
  expect(api.addTrack).toHaveBeenCalledTimes(2);
  expect(api.addTrack).toHaveBeenLastCalledWith('created', track);
  expect(close).toHaveBeenCalledOnce();
  expect(open).toHaveBeenCalledWith(playlist);
});
