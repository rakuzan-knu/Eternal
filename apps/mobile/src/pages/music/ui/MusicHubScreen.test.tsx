// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Track, Playlist, Folder } from '../model/music';
import { MusicHubScreen } from './MusicHubScreen';

const mocks = vi.hoisted(() => ({
  tracks: vi.fn(),
  playlists: vi.fn(),
  playlist: vi.fn(),
  music: {
    userId: 'owner',
    isOnline: true,
    notice: null,
    error: null,
    busy: false,
    current: null,
    playing: false,
    setVisited: vi.fn(),
    preferences: { history: [], saved: [], pinned: [] },
    liked: { data: [] as Track[] | undefined, isError: false, isFetching: false, refetch: vi.fn() },
    playlists: {
      data: [{ id: 'favourites', title: 'Favourites', tracks: [], creatorId: 'owner' }] as
        Playlist[] | undefined,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: vi.fn(),
    },
    folders: {
      data: [] as Folder[] | undefined,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    },
  },
}));
vi.mock('../model/MusicProvider', () => ({ useMusic: () => mocks.music }));
vi.mock('../api/musicApi', () => ({
  musicApi: { tracks: mocks.tracks, playlists: mocks.playlists, playlist: mocks.playlist },
}));
vi.mock('./MusicMenu', () => ({
  MusicMenu: ({
    title,
    items,
    onClose,
  }: {
    title: string;
    items: { label: string; onPress: () => void }[];
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label={title}>
      {items.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            onClose();
            item.onPress();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('./MusicActions', () => ({ MusicActions: () => null }));
vi.mock('./MusicJam', () => ({ MusicJam: () => <div>Jam room controls</div> }));
vi.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('lucide-react-native', () =>
  Object.fromEntries(
    [
      'ArrowLeft',
      'ArrowDownUp',
      'ChevronDown',
      'Users',
      'Gamepad2',
      'Bell',
      'Folder',
      'Heart',
      'History',
      'Library',
      'ListMusic',
      'MoreHorizontal',
      'Plus',
      'Search',
      'Sparkles',
      'X',
    ].map((name) => [name, () => null]),
  ),
);
vi.mock('../../feed/ui/primitives', () => ({
  colors: {},
  IconButton: ({ label, onPress }: { label: string; onPress: () => void }) => (
    <button aria-label={label} onClick={onPress} />
  ),
  ErrorNotice: ({ message }: { message: string }) => <div role="alert">{message}</div>,
}));
vi.mock('@/shared/ui', () => ({
  Button: ({ title, onPress }: { title: string; onPress: () => void }) => (
    <button onClick={onPress}>{title}</button>
  ),
}));
vi.mock('./primitives', () => ({
  m: {},
  Cover: () => null,
  LibraryRow: ({
    title,
    subtitle,
    onPress,
  }: {
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <button aria-label={`Open ${title.toLowerCase()}`} onClick={onPress}>
      {title} {subtitle}
    </button>
  ),
  MusicStatus: ({ message }: { message: string }) => <div role="alert">{message}</div>,
  Section: ({ title }: { title: string }) => <h2>{title}</h2>,
  PlayButton: () => null,
  PlaylistCard: () => null,
  TrackRow: ({ track }: { track: Track }) => <div>{track.title}</div>,
  Chips: ({ values, onChange }: { values: string[]; onChange: (value: string) => void }) => (
    <div>
      {values.map((value) => (
        <button key={value} onClick={() => onChange(value)}>
          {value}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('react-native', () => {
  const View = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Platform: { OS: 'web' },
    View,
    Text: View,
    ScrollView: View,
    ActivityIndicator: () => <div role="status">Loading</div>,
    RefreshControl: () => null,
    BackHandler: { addEventListener: () => ({ remove: () => {} }) },
    StyleSheet: { create: (styles: unknown) => styles },
    Pressable: ({
      children,
      accessibilityLabel,
      accessibilityState,
      onPress,
    }: {
      children?: React.ReactNode;
      accessibilityLabel?: string;
      accessibilityState?: { selected?: boolean };
      onPress: () => void;
    }) => (
      <button
        aria-label={accessibilityLabel}
        aria-selected={accessibilityState?.selected}
        onClick={onPress}
      >
        {children}
      </button>
    ),
    TextInput: React.forwardRef<
      HTMLInputElement,
      { value: string; onChangeText: (value: string) => void; accessibilityLabel: string }
    >((props, ref) => (
      <input
        ref={ref}
        aria-label={props.accessibilityLabel}
        value={props.value}
        onInput={(event) => props.onChangeText(event.currentTarget.value)}
        onChange={() => {}}
      />
    )),
    FlatList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent,
    }: {
      data: Track[];
      renderItem: (info: { item: Track }) => React.ReactNode;
      ListHeaderComponent: React.ReactNode;
      ListEmptyComponent: React.ReactNode;
      ListFooterComponent: React.ReactNode;
    }) => (
      <div>
        {ListHeaderComponent}
        {data.length
          ? data.map((item) => <div key={item.id}>{renderItem({ item })}</div>)
          : ListEmptyComponent}
        {ListFooterComponent}
      </div>
    ),
  };
});
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
beforeEach(() => {
  mocks.music.isOnline = true;
  mocks.music.liked.data = [];
  mocks.music.liked.isError = false;
  mocks.music.liked.isFetching = false;
  mocks.music.folders.data = [];
  mocks.music.folders.isError = false;
  mocks.music.folders.isFetching = false;
  mocks.music.playlists.data = [
    { id: 'favourites', title: 'Favourites', tracks: [], creatorId: 'owner' },
  ];
  mocks.tracks.mockResolvedValue([]);
  mocks.playlists.mockResolvedValue([]);
  mocks.playlist.mockResolvedValue(mocks.music.playlists.data[0]);
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
  const back = vi.fn();
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MusicHubScreen active onBack={back} />
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
    if (!button) throw new Error(`Missing action ${label}`);
    await act(async () => button.click());
  };
  const typeSearch = async (value: string, settle = true) => {
    const input = element.querySelector('input');
    if (!input) throw new Error('Missing search input');
    await act(async () => {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    if (settle)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 350));
      });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  };
  return { element, click, back, typeSearch };
}
it('returns from a playlist to the library where it was opened', async () => {
  const screen = await mount();
  await screen.click('Music Library');
  await screen.click('Open playlist Favourites');
  expect(screen.element.textContent).toContain('Favourites');
  await screen.click('Back from Music Hub');
  expect(
    screen.element.querySelector('[aria-label="Music Library"]')?.getAttribute('aria-selected'),
  ).toBe('true');
  expect(screen.back).not.toHaveBeenCalled();
});
it('allows joining Jam before selecting any track', async () => {
  const screen = await mount();
  await screen.click('Listen together · Jam');
  expect(screen.element.textContent).toContain('Jam room controls');
});
it('shows the offline state without indefinite loading or starting catalog requests', async () => {
  mocks.music.isOnline = false;
  const screen = await mount();
  expect(screen.element.textContent).toContain("You're offline");
  expect(screen.element.querySelector('[role="status"]')).toBeNull();
  expect(mocks.tracks).not.toHaveBeenCalled();
  expect(mocks.playlists).not.toHaveBeenCalled();
});

it('uses the entered query and hides previous results immediately when editing or clearing it', async () => {
  mocks.tracks.mockImplementation(async (query: string, source: string) => [
    {
      id: `${source}-${query}`,
      title: `${query} result`,
      artist: query,
      durationMs: 180000,
    },
  ]);
  const screen = await mount();
  await screen.click('Music Search');
  await screen.typeSearch('The Weeknd');
  expect(screen.element.textContent).toContain('The Weeknd result');
  await screen.typeSearch('Моргенштерн', false);
  expect(screen.element.textContent).not.toContain('The Weeknd result');
  await screen.typeSearch('Моргенштерн');
  expect(mocks.tracks).toHaveBeenCalledWith(
    'Моргенштерн',
    'soundcloud',
    0,
    expect.any(AbortSignal),
  );
  expect(mocks.tracks).toHaveBeenCalledWith('Моргенштерн', 'spotify', 0, expect.any(AbortSignal));
  expect(screen.element.textContent).toContain('Моргенштерн result');
  await screen.click('Clear music search');
  expect(screen.element.textContent).not.toContain('Моргенштерн result');
  expect(screen.element.textContent).toContain('What do you want to hear?');
});

it('keeps available catalog results and tells the user when another catalog fails', async () => {
  mocks.tracks.mockImplementation(async (query: string, source: string) => {
    if (source === 'soundcloud') throw new Error('Provider unavailable');
    return [{ id: 'real-response', title: 'Available result', artist: query, durationMs: 180000 }];
  });
  const screen = await mount();
  await screen.click('Music Search');
  await screen.typeSearch('Моргенштерн');
  expect(screen.element.textContent).toContain('Available result');
  expect(screen.element.textContent).toContain('One catalog is temporarily unavailable');
  await screen.click('Choose music catalog');
  await screen.click('SoundCloud');
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  expect(screen.element.textContent).toContain('Music search is unavailable.');
  expect(screen.element.textContent).not.toContain('No tracks found');
});

it('shows an empty playlist state for a successful search with no matches', async () => {
  const screen = await mount();
  await screen.click('Music Search');
  await screen.click('Playlists');
  await screen.typeSearch('Unmatched playlist');
  expect(screen.element.textContent).toContain('No playlists found.');
});

it('keeps library controls out of the overview and opens sorting on demand', async () => {
  const screen = await mount();
  await screen.click('Music Library');
  expect(screen.element.querySelector('input')).toBeNull();
  expect(screen.element.textContent).not.toContain('Custom order');
  await screen.click('Open playlists');
  await screen.click('Sort library');
  expect(screen.element.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
    'Sort by',
  );
  await screen.click('Title');
  expect(screen.element.querySelector('[role="dialog"]')).toBeNull();
});
it('searches folders and returns from a folder to the folder list', async () => {
  mocks.music.folders.data = [
    { id: 'one', name: 'Workout', playlistIds: ['favourites'] },
    { id: 'two', name: 'Evenings', playlistIds: [] },
  ];
  const screen = await mount();
  await screen.click('Music Library');
  await screen.click('Open folders');
  await screen.click('Search your library');
  await screen.typeSearch('Evenings');
  expect(screen.element.textContent).not.toContain('Workout');
  expect(screen.element.textContent).toContain('Evenings');
  await screen.click('Open folder Evenings');
  expect(screen.element.textContent).toContain('This folder is empty');
  await screen.click('Back from Music Hub');
  expect(screen.element.textContent).toContain('Workout');
  expect(screen.element.textContent).toContain('Evenings');
});
it('does not report zero liked songs or an empty collection when likes failed to load', async () => {
  mocks.music.liked.data = undefined;
  mocks.music.liked.isError = true;
  const screen = await mount();
  await screen.click('Music Library');
  expect(screen.element.textContent).toContain('Unavailable');
  expect(screen.element.textContent).not.toContain('0 songs');
  await screen.click('Open liked songs');
  expect(screen.element.querySelector('[role="alert"]')).not.toBeNull();
  expect(screen.element.textContent).not.toContain("Let's find something to play");
});
it('shows loading in liked songs until the server responds', async () => {
  mocks.music.liked.data = undefined;
  mocks.music.liked.isFetching = true;
  const screen = await mount();
  await screen.click('Music Library');
  await screen.click('Open liked songs');
  expect(screen.element.querySelector('[role="status"]')).not.toBeNull();
});

it('does not show a first-use empty library message when songs are already liked', async () => {
  mocks.music.liked.data = [
    { id: 'liked', title: 'Song', artist: 'Artist', albumArt: '', durationMs: 60000 },
  ];
  const screen = await mount();
  await screen.click('Music Library');
  expect(screen.element.textContent).toContain('1 song');
  expect(screen.element.textContent).not.toContain('Keep the music you love');
});
