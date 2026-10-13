// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MusicGameMode } from './MusicGameMode';
import { trackSchema, type Track, type Playlist } from '../model/music';

const mocks = vi.hoisted(() => ({
  playlist: vi.fn(),
  tracks: vi.fn(),
  play: vi.fn(),
  addToQueue: vi.fn(),
  exit: vi.fn(),
  setMuted: vi.fn(),
  setPreferences: vi.fn(),
  music: {
    userId: 'qa',
    gameMode: true,
    isOnline: true,
    jam: { error: null, room: null },
    error: null,
    current: null,
    queue: [],
    index: 0,
    playing: false,
    listener: false,
    muted: true,
    preferences: { saved: [] as Playlist[], history: [] as Track[], volume: 0.8 },
    liked: { data: [] as Track[], isFetching: false, isError: false, refetch: vi.fn() },
    playlists: {
      data: [{ id: 'saved', title: 'Saved mix', tracks: [] }] as Playlist[],
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    },
  },
}));
vi.mock('../model/MusicProvider', () => ({
  useMusic: () => ({
    ...mocks.music,
    exitGameMode: mocks.exit,
    play: mocks.play,
    addToQueue: mocks.addToQueue,
    setMuted: mocks.setMuted,
    setPreferences: mocks.setPreferences,
  }),
}));
vi.mock('../api/musicApi', () => ({
  musicApi: { playlist: mocks.playlist, tracks: mocks.tracks },
}));
vi.mock('./MusicTransport', () => ({ MusicTransport: () => null }));
vi.mock('./MusicLyrics', () => ({ MusicLyrics: () => null }));
vi.mock('./MusicBackdrop', () => ({
  MusicBackdrop: () => null,
  musicGradient: () => ['#000', '#111'],
}));
vi.mock('./MusicSlider', () => ({
  MusicSlider: ({
    value,
    onValueChange,
    accessibilityLabel,
  }: {
    value: number;
    onValueChange: (value: number) => void;
    accessibilityLabel: string;
  }) => (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      aria-label={accessibilityLabel}
      value={value}
      onInput={(event) => onValueChange(Number(event.currentTarget.value))}
    />
  ),
}));
vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    ['ArrowLeft', 'Gamepad2', 'Heart', 'ListMusic', 'Mic2', 'Plus', 'Search', 'Volume2', 'X'].map(
      (name) => [name, () => null],
    ),
  ),
);
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../../feed/ui/primitives', () => ({
  IconButton: ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button aria-label={label} onClick={onPress} />
  ),
}));
vi.mock('@/shared/ui', () => ({
  Button: ({
    title,
    onPress,
    disabled,
  }: {
    title: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <button disabled={disabled} onClick={onPress}>
      {title}
    </button>
  ),
}));
vi.mock('./primitives', () => ({
  m: {},
  Cover: () => null,
  MusicStatus: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  TrackRow: ({ track, onPlay }: { track: Track; onPlay: () => void }) => (
    <button onClick={onPlay}>{track.title}</button>
  ),
}));
vi.mock('react-native', () => {
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    View,
    ScrollView: View,
    Text: View,
    Platform: { OS: 'web' },
    BackHandler: { addEventListener: () => ({ remove: () => {} }) },
    StyleSheet: { create: (styles: unknown) => styles },
    ActivityIndicator: () => <div role="status">Loading</div>,
    Pressable: ({
      children,
      accessibilityLabel,
      onPress,
      disabled,
    }: {
      children?: React.ReactNode;
      accessibilityLabel?: string;
      onPress: () => void;
      disabled?: boolean;
    }) => (
      <button aria-label={accessibilityLabel} disabled={disabled} onClick={onPress}>
        {children}
      </button>
    ),
    TextInput: ({
      value,
      onChangeText,
      accessibilityLabel,
    }: {
      value: string;
      onChangeText: (value: string) => void;
      accessibilityLabel: string;
    }) => (
      <input
        aria-label={accessibilityLabel}
        value={value}
        onChange={(event) => onChangeText(event.currentTarget.value)}
        onInput={(event) => onChangeText(event.currentTarget.value)}
      />
    ),
    FlatList: <T,>({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent,
    }: {
      data: T[];
      renderItem: (info: { item: T; index: number }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      ListFooterComponent?: React.ReactNode;
    }) => (
      <div>
        {ListHeaderComponent}
        {data.length
          ? data.map((item, index) => <div key={index}>{renderItem({ item, index })}</div>)
          : ListEmptyComponent}
        {ListFooterComponent}
      </div>
    ),
  };
});
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
const track = trackSchema.parse({
  id: 'sc-song',
  title: 'Real response',
  artist: 'Artist',
  durationMs: 180000,
});
beforeEach(() => {
  mocks.playlist.mockResolvedValue({ id: 'saved', title: 'Saved mix', tracks: [track] });
  mocks.tracks.mockResolvedValue([]);
  mocks.music.liked.isError = false;
});
afterEach(async () => {
  await dispose?.();
  dispose = undefined;
  vi.clearAllMocks();
});
async function mount() {
  const element = document.createElement('div');
  const root = createRoot(element);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MusicGameMode />
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
  };
  const click = async (label: string) => {
    const button = Array.from(element.querySelectorAll('button')).find(
      (item) => item.getAttribute('aria-label') === label || item.textContent === label,
    );
    if (!button) throw new Error(`Missing ${label}`);
    await act(async () => button.click());
  };
  return { element, click };
}
it('loads a saved playlist and changes its music without exiting Game Mode', async () => {
  const screen = await mount();
  await screen.click('Game playlist Saved mix');
  expect(mocks.playlist).toHaveBeenCalledWith(
    mocks.music.playlists.data[0],
    expect.any(AbortSignal),
  );
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(screen.element.textContent).toContain('Play this mix');
  });
  await screen.click('Add Real response to queue');
  expect(mocks.addToQueue).toHaveBeenCalledWith(track);
  await screen.click('Play this mix');
  expect(mocks.play).toHaveBeenCalledWith(track, [track]);
  expect(mocks.exit).not.toHaveBeenCalled();
  await screen.click('Back to game playlists');
  expect(screen.element.textContent).toContain('Pick your soundtrack');
  await screen.click('Exit Game Mode');
  expect(mocks.exit).toHaveBeenCalledTimes(1);
});
it('distinguishes an unavailable playlist from an empty playlist', async () => {
  mocks.playlist.mockRejectedValue(new Error('Unavailable'));
  const screen = await mount();
  await screen.click('Game playlist Saved mix');
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(screen.element.querySelector('[role="alert"]')).not.toBeNull();
  });
  expect(screen.element.querySelector('[role="alert"]')?.textContent).toContain(
    "couldn't be loaded",
  );
  expect(screen.element.textContent).not.toContain('No songs in this collection');
});
it('aborts an in-flight search when returning to playlists', async () => {
  const aborted = vi.fn();
  mocks.tracks.mockImplementation(
    (_query: string, _source: string, _offset: number, signal: AbortSignal) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener('abort', () => {
          aborted();
          reject(new Error('Cancelled'));
        }),
      ),
  );
  const screen = await mount();
  await screen.click('Game search');
  const input = screen.element.querySelector('input');
  if (!input) throw new Error('No search input');
  await act(async () => {
    input.value = 'Artist';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
  expect(mocks.tracks).toHaveBeenCalledTimes(2);
  await screen.click('Game playlists');
  expect(aborted).toHaveBeenCalledTimes(2);
  expect(mocks.exit).not.toHaveBeenCalled();
});
it('can restore muted audio using the in-mode volume control', async () => {
  const screen = await mount();
  await screen.click('Game audio settings');
  const input = screen.element.querySelector('input');
  if (!input) throw new Error('No volume control');
  expect(input.value).toBe('0');
  await act(async () => {
    input.value = '0.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(mocks.setMuted).toHaveBeenCalledWith(false);
  expect(mocks.setPreferences).toHaveBeenCalledWith(expect.any(Function));
  expect(mocks.exit).not.toHaveBeenCalled();
});
