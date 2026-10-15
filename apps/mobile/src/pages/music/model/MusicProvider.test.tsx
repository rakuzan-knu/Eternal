// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MusicProvider, useMusic } from './MusicProvider';
import { trackSchema, emptyPreferences } from './music';

const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), stream: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: mocks.get, setItem: mocks.set },
}));
vi.mock('../api/musicApi', () => ({
  musicApi: {
    stream: mocks.stream,
    liked: async () => [],
    library: async () => [],
    folders: async () => [],
  },
}));
vi.mock('../ui/MusicAudio', () => ({ MusicAudio: () => null }));
vi.mock('./useMusicJam', () => ({
  useMusicJam: () => ({ room: null, isHost: false, leave: vi.fn(), add: vi.fn() }),
}));
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

let controller: ReturnType<typeof useMusic> | undefined;
let dispose: (() => Promise<void>) | undefined;
function Probe() {
  controller = useMusic();
  return null;
}
function music() {
  if (!controller) throw new Error('Provider not mounted');
  return controller;
}
const tracks = ['a', 'b', 'c'].map((id) =>
  trackSchema.parse({ id: `sc-${id}`, title: id, artist: 'Artist', durationMs: 60_000 }),
);
beforeEach(() => {
  mocks.get.mockResolvedValue(null);
  mocks.set.mockResolvedValue(undefined);
  mocks.stream.mockResolvedValue({
    uri: 'https://audio.example/track.mp3',
    preview: false,
    isHls: false,
  });
});
afterEach(async () => {
  await dispose?.();
  dispose = undefined;
  controller = undefined;
  vi.clearAllMocks();
});
async function mount() {
  const element = document.createElement('div');
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MusicProvider userId="listener" isOnline>
          <Probe />
        </MusicProvider>
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
  };
}
it('adds exactly one queue entry and never restores a removed track after toggling shuffle', async () => {
  await mount();
  await act(async () => music().play(tracks[0], tracks));
  await act(async () => music().addToQueue(tracks[1]));
  expect(music().queue.map((track) => track.id)).toEqual(['sc-a', 'sc-b', 'sc-c', 'sc-b']);
  await act(async () => music().removeQueue(1));
  await act(async () => music().toggleShuffle());
  await act(async () => music().toggleShuffle());
  expect(music().queue.map((track) => track.id)).toEqual(['sc-a', 'sc-c', 'sc-b']);
});
it('resets seeking when advancing and restarting the previous track', async () => {
  await mount();
  await act(async () => music().play(tracks[0], tracks));
  await act(async () => music().seekTo(35_000));
  await act(async () => music().next());
  expect(music().current?.id).toBe('sc-b');
  expect(music().seek.value).toBe(0);
  await act(async () => music().previous());
  expect(music().current?.id).toBe('sc-a');
  expect(music().position).toBe(0);
});
it('restarts playback after reaching the end of the queue', async () => {
  await mount();
  await act(async () => music().play(tracks[0]));
  await act(async () => {
    music().onProgress(60_000, 60_000);
    music().next(true);
  });
  expect(music().playing).toBe(false);
  await act(async () => music().toggle());
  expect(music().playing).toBe(true);
  expect(music().seek.value).toBe(0);
});
it('preserves actions made while device history is being restored', async () => {
  let restore: ((value: string) => void) | undefined;
  mocks.get.mockImplementation(
    () =>
      new Promise<string>((resolve) => {
        restore = resolve;
      }),
  );
  await mount();
  await act(async () => music().play(tracks[0]));
  await act(async () =>
    restore?.(JSON.stringify({ ...emptyPreferences(), history: [tracks[1]], pinned: ['saved'] })),
  );
  expect(music().preferences.history.map((track) => track.id)).toEqual(['sc-a', 'sc-b']);
  expect(music().preferences.pinned).toEqual(['saved']);
});

it('flushes the latest history when leaving the account before the persistence debounce', async () => {
  await mount();
  await act(async () => music().play(tracks[0]));
  await dispose?.();
  dispose = undefined;
  expect(mocks.set).toHaveBeenCalledWith('eternal-mobile-music:listener', expect.any(String));
  const stored = mocks.set.mock.calls.at(-1)?.[1];
  expect(typeof stored).toBe('string');
  expect(JSON.parse(stored).history[0].id).toBe('sc-a');
});

it('preserves playback, queue and seek across entering and leaving Game Mode', async () => {
  await mount();
  await act(async () => music().play(tracks[0], tracks));
  await act(async () => music().seekTo(25000));
  await act(async () => music().enterGameMode());
  expect(music().gameMode).toBe(true);
  expect(music().playing).toBe(true);
  expect(music().position).toBe(25000);
  await act(async () => music().next());
  expect(music().current?.id).toBe('sc-b');
  expect(music().gameMode).toBe(true);
  await act(async () => music().exitGameMode());
  expect(music().gameMode).toBe(false);
  expect(music().playing).toBe(true);
  expect(music().queue).toHaveLength(3);
});
