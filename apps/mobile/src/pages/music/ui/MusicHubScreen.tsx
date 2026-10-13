import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Folder,
  Heart,
  History,
  ListMusic,
  MoreHorizontal,
  Plus,
  Search,
  ChevronDown,
  ArrowDownUp,
  Users,
  Gamepad2,
  X,
} from 'lucide-react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMusic } from '../model/MusicProvider';
import { musicApi } from '../api/musicApi';
import { musicKeys, sortTracks, type Playlist, type Source, type Track } from '../model/music';
import { colors, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { Button } from '@/shared/ui';
import {
  Cover,
  m,
  PlaylistCard,
  PlayButton,
  Section,
  TrackRow,
  LibraryRow,
  MusicStatus,
} from './primitives';
import { MusicActions, type MusicAction } from './MusicActions';
import { MusicJam } from './MusicJam';
import { MusicMenu, type MusicMenuItem } from './MusicMenu';

type Page = 'Home' | 'Search' | 'Library' | 'History' | 'Playlist' | 'Track' | 'Jam';
const genres = ['For you', 'Phonk', 'Hip-Hop', 'Electronic', 'Lo-Fi', 'Rock', 'Pop'];
export function MusicHubScreen({ active, onBack }: { active: boolean; onBack: () => void }) {
  const music = useMusic();
  const [page, setPage] = React.useState<Page>('Home');
  const [selected, setSelected] = React.useState<Playlist | null>(null);
  const [selectedTrack, setSelectedTrack] = React.useState<Track | null>(null);
  const [action, setAction] = React.useState<MusicAction | null>(null);
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const searchSettled = query.trim() === debounced;
  const [source, setSource] = React.useState<Source>('all');
  const [resultType, setResultType] = React.useState('Tracks');
  const [genre, setGenre] = React.useState('For you');
  const [menu, setMenu] = React.useState<'more' | 'sort' | 'source' | 'genre' | null>(null);
  const [librarySearch, setLibrarySearch] = React.useState(false);
  const [playlistSearch, setPlaylistSearch] = React.useState(false);
  const [libraryFilter, setLibraryFilter] = React.useState('All');
  const [sort, setSort] = React.useState('Custom order');
  const [folder, setFolder] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  const searchRef = React.useRef<TextInput>(null);
  const navigation = React.useRef<Page[]>([]);
  function navigate(target: Page) {
    if (target !== page) navigation.current.push(page);
    setPage(target);
  }
  React.useEffect(() => {
    if (active) music.setVisited(true);
  }, [active, music.setVisited]);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  function back() {
    if (page === 'Library' && folder) {
      setFolder(null);
      setLibraryFilter('Folders');
      setFilter('');
      return;
    }
    if (page === 'Library' && (libraryFilter !== 'All' || librarySearch)) {
      setLibraryFilter('All');
      setLibrarySearch(false);
      setFilter('');
      return;
    }
    const previous = navigation.current.pop();
    if (previous) setPage(previous);
    else if (page === 'Home') onBack();
    else {
      setPage('Home');
      setFilter('');
      setFolder(null);
    }
  }
  React.useEffect(() => {
    if (!active) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (menu) {
        setMenu(null);
        return true;
      }
      if (action) {
        setAction(null);
        return true;
      }
      if (page !== 'Home') {
        back();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [active, page, action, menu, folder, libraryFilter, librarySearch]);
  const seed = genre === 'For you' ? music.preferences.history[0]?.artist || 'Top hits' : genre;
  const home = useQuery({
    queryKey: ['mobile', music.userId, 'music', 'home', seed],
    queryFn: async ({ signal }) => {
      const tracks = await musicApi.tracks(seed, 'soundcloud', 0, signal);
      return tracks;
    },
    enabled: active && page === 'Home' && music.isOnline,
  });
  const popular = useQuery({
    queryKey: ['mobile', music.userId, 'music', 'popular', genre],
    queryFn: ({ signal }) =>
      musicApi.playlists(genre === 'For you' ? 'Popular' : genre, 'soundcloud', 0, signal),
    enabled: active && page === 'Home' && music.isOnline,
  });
  const search = useInfiniteQuery({
    queryKey: ['mobile', music.userId, 'music', 'search', source, resultType, debounced],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const sources: ('soundcloud' | 'spotify')[] =
        source === 'all' ? ['soundcloud', 'spotify'] : [source];
      const results = await Promise.allSettled(
        sources.map((provider) =>
          resultType === 'Tracks'
            ? musicApi.tracks(debounced, provider, pageParam * 20, signal)
            : musicApi.playlists(debounced, provider, pageParam * 12, signal),
        ),
      );
      if (results.every((item) => item.status === 'rejected'))
        throw new Error('Search is unavailable');
      const tracks: Track[] = [];
      const playlists: Playlist[] = [];
      const unavailable: string[] = [];
      results.forEach((result, i) => {
        if (result.status === 'rejected') unavailable.push(sources[i]);
        else
          for (const item of result.value) {
            if ('artist' in item) tracks.push(item);
            else playlists.push(item);
          }
      });
      return {
        tracks,
        playlists,
        unavailable,
        more: results.some(
          (item) =>
            item.status === 'fulfilled' &&
            item.value.length === (resultType === 'Tracks' ? 20 : 12),
        ),
      };
    },
    getNextPageParam: (last, all) => (last.more ? all.length : undefined),
    enabled: active && page === 'Search' && searchSettled && !!debounced && music.isOnline,
  });
  const playlistQuery = useQuery({
    queryKey: [...musicKeys.library(music.userId), 'detail', selected?.id],
    queryFn: ({ signal }) => {
      if (!selected) throw new Error('No playlist');
      return musicApi.playlist(selected, signal);
    },
    enabled:
      active &&
      page === 'Playlist' &&
      !!selected &&
      selected.id !== 'liked-songs' &&
      music.isOnline,
  });
  const playlist =
    selected?.id === 'liked-songs'
      ? { ...selected, tracks: music.liked.data || [] }
      : playlistQuery.data
        ? { ...selected, ...playlistQuery.data }
        : selected;
  const related = useQuery({
    queryKey: ['mobile', music.userId, 'music', 'related', selectedTrack?.id],
    queryFn: ({ signal }) => {
      if (!selectedTrack) throw new Error('No track');
      return musicApi.recommendations(selectedTrack, signal);
    },
    enabled: active && page === 'Track' && !!selectedTrack && music.isOnline,
  });
  const searchTracks = [
    ...new Map(
      (searchSettled && !!debounced
        ? search.data?.pages.flatMap((item) => item.tracks).map((track) => [track.id, track])
        : []) || [],
    ).values(),
  ];
  const searchPlaylists = [
    ...new Map(
      (searchSettled && !!debounced
        ? search.data?.pages.flatMap((item) => item.playlists).map((item) => [item.id, item])
        : []) || [],
    ).values(),
  ];
  const allLibrary = [
    ...new Map(
      [...(music.playlists.data || []), ...music.preferences.saved].map((item) => [item.id, item]),
    ).values(),
  ];
  const library = allLibrary
    .filter(
      (item) =>
        (!folder ||
          music.folders.data?.find((f) => f.id === folder)?.playlistIds.includes(item.id)) &&
        `${item.title} ${item.creator || ''}`.toLowerCase().includes(filter.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(music.preferences.pinned.includes(b.id)) -
          Number(music.preferences.pinned.includes(a.id)) ||
        (sort === 'Title'
          ? a.title.localeCompare(b.title)
          : sort === 'Artist'
            ? (a.creator || '').localeCompare(b.creator || '')
            : sort === 'Recently added'
              ? (b.createdAt || '').localeCompare(a.createdAt || '')
              : 0),
    );
  function openPlaylist(value: Playlist) {
    setSelected(value);
    setFilter('');
    setSort('Custom order');
    setPlaylistSearch(false);
    navigate('Playlist');
  }
  function openTrack(value: Track) {
    setSelectedTrack(value);
    setAction(null);
    navigate('Track');
  }
  const openLiked = () =>
    openPlaylist({
      id: 'liked-songs',
      title: 'Liked Songs',
      creator: 'You',
      tracks: music.liked.data || [],
    });
  function row(track: Track, list: Track[]) {
    return (
      <TrackRow
        key={track.id}
        track={track}
        active={music.current?.id === track.id}
        playing={music.playing}
        onPlay={() => (music.current?.id === track.id ? music.toggle() : music.play(track, list))}
        onMore={() =>
          setAction({
            type: 'track',
            track,
            playlist: page === 'Playlist' ? playlist || undefined : undefined,
          })
        }
      />
    );
  }
  const tracks =
    page === 'Search'
      ? searchTracks
      : page === 'Playlist'
        ? sortTracks(playlist?.tracks || [], sort, filter)
        : page === 'History'
          ? music.preferences.history
          : page === 'Track'
            ? related.data || []
            : page === 'Library' && libraryFilter === 'Tracks'
              ? sortTracks(music.liked.data || [], sort, filter)
              : [];
  const loading =
    page === 'Search'
      ? music.isOnline && !!query.trim() && (!searchSettled || (search.isFetching && !search.data))
      : page === 'Playlist'
        ? selected?.id === 'liked-songs'
          ? music.liked.isFetching && !music.liked.data
          : playlistQuery.isFetching && !playlistQuery.data
        : false;
  const refresh = async () => {
    if (!music.isOnline || refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all(
        page === 'Home'
          ? [home.refetch(), popular.refetch()]
          : [music.liked.refetch(), music.playlists.refetch(), music.folders.refetch()],
      );
    } finally {
      setRefreshing(false);
    }
  };
  const visibleFolders = [...(music.folders.data || [])]
    .filter((item) => item.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) =>
      sort === 'Title'
        ? a.name.localeCompare(b.name)
        : sort === 'Recently added'
          ? (b.createdAt || '').localeCompare(a.createdAt || '')
          : 0,
    );
  const heading =
    page === 'Library'
      ? folder
        ? music.folders.data?.find((item) => item.id === folder)?.name || 'Folder'
        : libraryFilter === 'All'
          ? 'Library'
          : libraryFilter
      : page === 'Playlist'
        ? 'Playlist'
        : page === 'History'
          ? 'Recently played'
          : page === 'Jam'
            ? 'Listen together'
            : page === 'Search'
              ? 'Search'
              : page === 'Track'
                ? 'Track'
                : 'Music Hub';
  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${page === 'Playlist' ? playlist?.title || heading : heading} • Music • Eternal`;
  }, [active, heading, page, playlist?.title]);
  const menuTitle =
    menu === 'source'
      ? 'Music catalog'
      : menu === 'sort'
        ? 'Sort by'
        : menu === 'genre'
          ? 'Explore genres'
          : 'Your music';
  const menuItems: MusicMenuItem[] =
    menu === 'source'
      ? (['all', 'soundcloud', 'spotify'] as const).map((value) => ({
          label: value === 'all' ? 'All music' : value === 'spotify' ? 'Spotify' : 'SoundCloud',
          selected: source === value,
          onPress: () => setSource(value),
        }))
      : menu === 'sort'
        ? (page === 'Playlist'
            ? ['Custom order', 'Title', 'Artist', 'Album', 'Recently added', 'Duration']
            : libraryFilter === 'Folders'
              ? ['Custom order', 'Title', 'Recently added']
              : ['Custom order', 'Title', 'Artist', 'Recently added']
          ).map((value) => ({
            label: value,
            selected: sort === value,
            onPress: () => setSort(value),
          }))
        : menu === 'genre'
          ? genres.map((value) => ({
              label: value,
              selected: genre === value,
              onPress: () => setGenre(value),
            }))
          : [
              {
                label: 'Game Mode',
                description: 'Your music. Fewer distractions.',
                icon: <Gamepad2 size={23} color={colors.purple} />,
                onPress: music.enterGameMode,
              },
              {
                label: 'Listen together · Jam',
                description: 'Start or join a listening room',
                icon: <Users size={23} color={colors.purple} />,
                onPress: () => navigate('Jam'),
              },
              {
                label: 'Listening history',
                icon: <History size={23} color={colors.purple} />,
                onPress: () => navigate('History'),
              },
            ];
  function playlistRow(item: Playlist) {
    return (
      <View key={item.id} style={m.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open playlist ${item.title}`}
          onPress={() => openPlaylist(item)}
          style={m.trackMain}
        >
          <Cover uri={item.coverUrl || item.tracks[0]?.albumArt} />
          <View style={m.flex}>
            <Text style={m.trackTitle} numberOfLines={1}>
              {music.preferences.pinned.includes(item.id) ? '• ' : ''}
              {item.title}
            </Text>
            <Text style={m.muted}>
              {item.isPrivate ? 'Private playlist' : 'Playlist'} · {item.creator || 'You'}
            </Text>
          </View>
        </Pressable>
        <IconButton
          label={`Playlist options for ${item.title}`}
          onPress={() => setAction({ type: 'playlist', playlist: item })}
        >
          <MoreHorizontal size={21} color={colors.muted} />
        </IconButton>
      </View>
    );
  }
  return (
    <View style={m.flex} testID="music-hub">
      <View style={[m.row, { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6, gap: 6 }]}>
        <IconButton label="Back from Music Hub" onPress={back}>
          <ArrowLeft size={22} color="white" />
        </IconButton>
        <Text accessibilityRole="header" style={[m.heading, m.flex, { fontSize: 28 }]}>
          {heading}
        </Text>
        {page === 'Library' &&
          (allLibrary.length > 0 || !!music.folders.data?.length || librarySearch) && (
            <IconButton
              label={librarySearch ? 'Close library search' : 'Search your library'}
              selected={librarySearch}
              onPress={() => {
                setLibrarySearch(!librarySearch);
                setFilter('');
              }}
            >
              <Search size={22} color="white" />
            </IconButton>
          )}
        {page === 'Library' ? (
          <IconButton
            label="Create playlist or folder"
            disabled={!music.isOnline}
            onPress={() => setAction({ type: 'create' })}
          >
            <Plus size={24} color="white" />
          </IconButton>
        ) : page === 'Home' ? (
          <View style={m.row}>
            <IconButton label="Enter Game Mode" onPress={music.enterGameMode}>
              <Gamepad2 size={24} color="#c9a4ff" />
            </IconButton>
            <IconButton label="Music options" onPress={() => setMenu('more')}>
              <MoreHorizontal size={24} color="white" />
            </IconButton>
          </View>
        ) : null}
      </View>
      {['Home', 'Search', 'Library'].includes(page) && (
        <View accessibilityRole="tablist" accessibilityLabel="Music navigation" style={s.tabs}>
          {(['Home', 'Search', 'Library'] as const).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityLabel={`Music ${tab}`}
              accessibilityState={{ selected: page === tab }}
              aria-selected={page === tab}
              onPress={() => {
                navigation.current = [];
                setFolder(null);
                setPage(tab);
                setFilter('');
                setLibraryFilter('All');
                setLibrarySearch(false);
              }}
              style={[s.tab, page === tab && s.activeTab]}
            >
              <Text style={[s.tabText, page === tab && { color: '#fff', fontWeight: '700' }]}>
                {tab === 'Home' ? 'Discover' : tab}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {music.notice && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Dismiss: ${music.notice}`}
          onPress={() => music.setNotice(null)}
          style={{ paddingHorizontal: 20, paddingVertical: 8 }}
        >
          <Text accessibilityLiveRegion="polite" style={m.accent}>
            {music.notice}
          </Text>
        </Pressable>
      )}
      {music.error && <ErrorNotice message={music.error} onRetry={() => music.setError(null)} />}
      {!music.isOnline && (
        <Text
          accessibilityLiveRegion="polite"
          style={[m.muted, { paddingHorizontal: 20, paddingVertical: 8 }]}
        >
          You're offline. Connect to search, play music or update your library.
        </Text>
      )}
      <FlatList
        data={tracks}
        keyExtractor={(item, index) => `${item.id}:${index}`}
        renderItem={({ item }) => row(item, tracks)}
        contentContainerStyle={m.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          page === 'Home' || page === 'Library' ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              enabled={music.isOnline}
              tintColor={colors.purple}
            />
          ) : undefined
        }
        ListHeaderComponent={
          <>
            {page === 'Jam' && <MusicJam />}
            {page === 'Home' && (
              <>
                {!!music.preferences.history.length && (
                  <>
                    <Section
                      title="Jump back in"
                      action="See all"
                      onAction={() => navigate('History')}
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {music.preferences.history.slice(0, 8).map((track) => (
                        <Pressable
                          key={track.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Play ${track.title} by ${track.artist}`}
                          onPress={() => music.play(track, music.preferences.history)}
                          style={m.card}
                        >
                          <Cover uri={track.albumArt} size={140} rounded={16} />
                          <Text style={m.trackTitle} numberOfLines={1}>
                            {track.title}
                          </Text>
                          <Text style={m.muted} numberOfLines={1}>
                            {track.artist}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}
                <Section
                  title="Made for you"
                  action={genre === 'For you' ? 'Genres' : genre}
                  onAction={() => setMenu('genre')}
                />
                {home.isFetching && !home.data ? (
                  <ActivityIndicator
                    color={colors.purple}
                    accessibilityLabel="Loading recommendations"
                  />
                ) : home.isError ? (
                  <MusicStatus
                    message="Recommendations couldn't be loaded."
                    onRetry={() => void home.refetch()}
                  />
                ) : home.data?.length ? (
                  home.data.slice(0, 5).map((track) => row(track, home.data || []))
                ) : (
                  <Text style={m.muted}>Find your next favourite in Search.</Text>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Listen together · Jam"
                  onPress={() => navigate('Jam')}
                  style={s.jamCard}
                >
                  <Users size={26} color="#c49bf9" />
                  <View style={m.flex}>
                    <Text style={[m.trackTitle, { fontSize: 16 }]}>Better together</Text>
                    <Text style={m.muted}>Start or join a listening room</Text>
                  </View>
                  <ArrowLeft
                    size={19}
                    color="#c49bf9"
                    style={{ transform: [{ rotate: '180deg' }] }}
                  />
                </Pressable>
                <Section title="Discover playlists" />
                {popular.isFetching && !popular.data ? (
                  <ActivityIndicator color={colors.purple} accessibilityLabel="Loading playlists" />
                ) : popular.isError ? (
                  <MusicStatus
                    message="Playlists couldn't be loaded."
                    onRetry={() => void popular.refetch()}
                  />
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {popular.data?.map((item) => (
                      <PlaylistCard
                        key={item.id}
                        playlist={item}
                        onPress={() => openPlaylist(item)}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            )}
            {page === 'Search' && (
              <>
                <View style={[m.row, m.input, { marginTop: 14, paddingRight: 4 }]}>
                  <Search size={19} color={colors.muted} />
                  <TextInput
                    ref={searchRef}
                    accessibilityLabel="Search music"
                    placeholder="Songs, artists, playlists"
                    placeholderTextColor={colors.muted}
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                    style={[m.text, m.flex, { minHeight: 48 }]}
                  />
                  {!!query && (
                    <IconButton label="Clear music search" onPress={() => setQuery('')}>
                      <X size={19} color={colors.muted} />
                    </IconButton>
                  )}
                </View>
                <View style={[m.row, { justifyContent: 'space-between' }]}>
                  <View style={[m.row, { gap: 2 }]}>
                    {['Tracks', 'Playlists'].map((type) => (
                      <Pressable
                        key={type}
                        accessibilityRole="button"
                        accessibilityState={{ selected: resultType === type }}
                        aria-pressed={resultType === type}
                        onPress={() => setResultType(type)}
                        style={[
                          s.resultType,
                          resultType === type && { backgroundColor: '#ffffff12' },
                        ]}
                      >
                        <Text
                          style={[m.text, { color: resultType === type ? '#fff' : colors.muted }]}
                        >
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose music catalog"
                    onPress={() => setMenu('source')}
                    style={[m.touch, m.row, { gap: 4 }]}
                  >
                    <Text style={m.muted}>
                      {source === 'all'
                        ? 'All music'
                        : source === 'spotify'
                          ? 'Spotify'
                          : 'SoundCloud'}
                    </Text>
                    <ChevronDown size={16} color={colors.muted} />
                  </Pressable>
                </View>
                {!query.trim() && (
                  <View style={m.empty}>
                    <Search size={36} color={colors.purple} />
                    <Text style={m.heading}>What do you want to hear?</Text>
                    <Text style={m.muted}>Search SoundCloud and Spotify together.</Text>
                  </View>
                )}
                {searchSettled && search.isError && !!debounced && (
                  <ErrorNotice
                    message="Music search is unavailable."
                    onRetry={() => void search.refetch()}
                  />
                )}
                {searchSettled &&
                  !!debounced &&
                  !!search.data?.pages.some((item) => item.unavailable.length) && (
                    <ErrorNotice
                      message="One catalog is temporarily unavailable. Showing available results."
                      onRetry={() => void search.refetch()}
                    />
                  )}
                {resultType === 'Playlists' && searchSettled && (
                  <View style={s.playlistGrid}>
                    {searchPlaylists.map((item) => (
                      <PlaylistCard
                        key={item.id}
                        playlist={item}
                        onPress={() => openPlaylist(item)}
                      />
                    ))}
                  </View>
                )}
                {resultType === 'Playlists' &&
                  searchSettled &&
                  !!debounced &&
                  search.isSuccess &&
                  !searchPlaylists.length && (
                    <View style={m.empty}>
                      <Text style={m.muted}>No playlists found. Try another artist or title.</Text>
                    </View>
                  )}
              </>
            )}
            {page === 'Library' && (
              <>
                {librarySearch && (
                  <View style={[m.row, m.input, { marginTop: 12, paddingRight: 4 }]}>
                    <Search size={19} color={colors.muted} />
                    <TextInput
                      autoFocus
                      accessibilityLabel={
                        libraryFilter === 'Folders' ? 'Search folders' : 'Search your music library'
                      }
                      placeholder={
                        libraryFilter === 'Folders' ? 'Find a folder' : 'Find a playlist'
                      }
                      placeholderTextColor={colors.muted}
                      value={filter}
                      onChangeText={setFilter}
                      style={[m.flex, m.text, { minHeight: 48 }]}
                    />
                    {!!filter && (
                      <IconButton label="Clear library search" onPress={() => setFilter('')}>
                        <X size={18} color={colors.muted} />
                      </IconButton>
                    )}
                  </View>
                )}
                {(music.playlists.isError || music.liked.isError || music.folders.isError) && (
                  <MusicStatus
                    message="Some saved music couldn't load."
                    onRetry={() => void refresh()}
                  />
                )}
                {libraryFilter === 'All' && !librarySearch && (
                  <>
                    <View style={{ marginTop: 12 }}>
                      <LibraryRow
                        title="Liked songs"
                        subtitle={queryCount(music.liked, 'songs')}
                        icon={<Heart size={23} color="#c49bf9" fill="#c49bf9" />}
                        onPress={openLiked}
                      />
                      <LibraryRow
                        title="Playlists"
                        subtitle={
                          music.playlists.data
                            ? `${allLibrary.length} saved`
                            : queryCount(music.playlists, 'saved')
                        }
                        icon={<ListMusic size={23} color="#c49bf9" />}
                        onPress={() => setLibraryFilter('Playlists')}
                      />
                      <LibraryRow
                        title="Folders"
                        subtitle={queryCount(music.folders, 'folders')}
                        icon={<Folder size={23} color="#c49bf9" />}
                        onPress={() => setLibraryFilter('Folders')}
                      />
                      <LibraryRow
                        title="Recently played"
                        subtitle="Your listening history"
                        icon={<History size={23} color="#c49bf9" />}
                        onPress={() => navigate('History')}
                      />
                    </View>
                    {!!library.length && (
                      <>
                        <Section
                          title="Your playlists"
                          action="See all"
                          onAction={() => setLibraryFilter('Playlists')}
                        />
                        {library.slice(0, 4).map(playlistRow)}
                      </>
                    )}
                    {!allLibrary.length &&
                      music.playlists.data &&
                      !music.playlists.isError &&
                      music.liked.data?.length === 0 &&
                      music.folders.data?.length === 0 &&
                      !music.liked.isError &&
                      !music.folders.isError && (
                        <View style={m.empty}>
                          <Text style={[m.heading, { textAlign: 'center' }]}>
                            Keep the music you love
                          </Text>
                          <Text style={[m.muted, { textAlign: 'center' }]}>
                            Like a song or save a playlist. It'll be waiting here.
                          </Text>
                          <Button
                            title="Find music"
                            variant="secondary"
                            onPress={() => navigate('Search')}
                          />
                        </View>
                      )}
                  </>
                )}
                {(libraryFilter !== 'All' || librarySearch) && (
                  <>
                    <View style={[m.row, { justifyContent: 'space-between', marginTop: 12 }]}>
                      <Text style={m.muted}>
                        {folder
                          ? 'In this folder'
                          : libraryFilter === 'Folders'
                            ? 'Your folders'
                            : 'Saved playlists'}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Sort library"
                        onPress={() => setMenu('sort')}
                        style={[m.touch, m.row, { gap: 6 }]}
                      >
                        <ArrowDownUp size={17} color={colors.muted} />
                        <Text style={m.muted}>{sort === 'Custom order' ? 'Sort' : sort}</Text>
                      </Pressable>
                    </View>
                    {libraryFilter === 'Folders' ? (
                      <>
                        {music.folders.isFetching && !music.folders.data && (
                          <ActivityIndicator
                            color={colors.purple}
                            accessibilityLabel="Loading folders"
                          />
                        )}
                        {visibleFolders.map((item) => (
                          <View key={item.id} style={m.row}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Open folder ${item.name}`}
                              onPress={() => {
                                setFolder(item.id);
                                setLibraryFilter('Playlists');
                                setLibrarySearch(false);
                                setFilter('');
                              }}
                              style={m.trackMain}
                            >
                              <Folder size={36} color={colors.purple} />
                              <View style={m.flex}>
                                <Text style={m.trackTitle}>{item.name}</Text>
                                <Text style={m.muted}>{item.playlistIds.length} playlists</Text>
                              </View>
                            </Pressable>
                            <IconButton
                              label={`Folder options for ${item.name}`}
                              onPress={() => setAction({ type: 'folder', folder: item })}
                            >
                              <MoreHorizontal size={22} color={colors.muted} />
                            </IconButton>
                          </View>
                        ))}
                        {!!music.folders.data &&
                          !music.folders.isError &&
                          !visibleFolders.length && (
                            <View style={m.empty}>
                              <Folder size={36} color={colors.purple} />
                              <Text style={m.heading}>
                                {filter ? 'No matching folders' : 'A place for your playlists'}
                              </Text>
                              <Text style={[m.muted, { textAlign: 'center' }]}>
                                {filter
                                  ? 'Try a different name.'
                                  : 'Create a folder to organise your collection.'}
                              </Text>
                              {!filter && (
                                <Button
                                  title="Create a folder"
                                  disabled={!music.isOnline}
                                  onPress={() => setAction({ type: 'create' })}
                                />
                              )}
                            </View>
                          )}
                      </>
                    ) : (
                      <>
                        {music.playlists.isFetching && !music.playlists.data && (
                          <ActivityIndicator
                            color={colors.purple}
                            accessibilityLabel="Loading your playlists"
                          />
                        )}
                        {library.map(playlistRow)}
                        {!!music.playlists.data && !music.playlists.isError && !library.length && (
                          <View style={m.empty}>
                            <ListMusic size={36} color={colors.purple} />
                            <Text style={m.heading}>
                              {filter
                                ? 'No matching playlists'
                                : folder
                                  ? 'This folder is empty'
                                  : 'Your next favourite mix'}
                            </Text>
                            <Text style={[m.muted, { textAlign: 'center' }]}>
                              {filter
                                ? 'Try a different name.'
                                : folder
                                  ? 'Move a playlist here from its options menu.'
                                  : 'Bring your favourite tracks together in a playlist.'}
                            </Text>
                            {!filter && (
                              <Button
                                title="Create a playlist"
                                disabled={!music.isOnline}
                                onPress={() => setAction({ type: 'create' })}
                              />
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
            {page === 'Playlist' && playlist && (
              <>
                <View style={{ alignItems: 'center', gap: 12, paddingTop: 15 }}>
                  <Cover
                    uri={playlist.coverUrl || playlist.tracks[0]?.albumArt}
                    size={190}
                    rounded={24}
                  />
                  <Text style={[m.title, { textAlign: 'center' }]}>{playlist.title}</Text>
                  <Text style={m.muted}>
                    {playlist.creator || 'You'} ·{' '}
                    {selected?.id === 'liked-songs'
                      ? queryCount(music.liked, 'songs')
                      : `${playlist.tracks.length || playlist.trackCount || 0} tracks`}
                    {playlist.isPrivate ? ' · Private' : ''}
                  </Text>
                  {!!playlist.description && (
                    <Text style={[m.muted, { textAlign: 'center' }]}>{playlist.description}</Text>
                  )}
                </View>
                <View style={[m.row, { justifyContent: 'space-between', paddingVertical: 12 }]}>
                  <IconButton
                    label="Playlist options"
                    onPress={() => setAction({ type: 'playlist', playlist })}
                  >
                    <MoreHorizontal size={26} color="white" />
                  </IconButton>
                  <PlayButton
                    label={`Play ${playlist.title}`}
                    disabled={!playlist.tracks.length || !music.isOnline}
                    onPress={() => music.play(playlist.tracks[0], playlist.tracks)}
                  />
                </View>
                {playlistQuery.isError && selected?.id !== 'liked-songs' && (
                  <ErrorNotice
                    message="This playlist is unavailable or private."
                    onRetry={() => void playlistQuery.refetch()}
                  />
                )}
                {selected?.id === 'liked-songs' && music.liked.isError && (
                  <MusicStatus
                    message="Liked songs couldn't be loaded."
                    onRetry={() => void music.liked.refetch()}
                  />
                )}
                {!!playlist.tracks.length && (
                  <View style={[m.row, { justifyContent: 'space-between' }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Search this playlist"
                      onPress={() => {
                        setPlaylistSearch(!playlistSearch);
                        setFilter('');
                      }}
                      style={[m.touch, m.row, { gap: 6 }]}
                    >
                      <Search size={17} color={colors.muted} />
                      <Text style={m.muted}>Find a song</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Sort playlist"
                      onPress={() => setMenu('sort')}
                      style={[m.touch, m.row, { gap: 6 }]}
                    >
                      <ArrowDownUp size={17} color={colors.muted} />
                      <Text style={m.muted}>{sort === 'Custom order' ? 'Sort' : sort}</Text>
                    </Pressable>
                  </View>
                )}
                {playlistSearch && (
                  <TextInput
                    autoFocus
                    accessibilityLabel="Find in playlist"
                    placeholder="Find in playlist"
                    placeholderTextColor={colors.muted}
                    value={filter}
                    onChangeText={setFilter}
                    style={m.input}
                  />
                )}
                {!!filter && !!playlist.tracks.length && !tracks.length && (
                  <Text style={[m.muted, { textAlign: 'center', padding: 20 }]}>
                    No songs match this search.
                  </Text>
                )}
                {!playlist.tracks.length &&
                  !loading &&
                  (selected?.id === 'liked-songs'
                    ? !!music.liked.data && !music.liked.isError
                    : !!playlistQuery.data && !playlistQuery.isError) && (
                    <View style={m.empty}>
                      <ListMusic size={35} color={colors.purple} />
                      <Text style={m.heading}>Let's find something to play</Text>
                      <Button title="Search for songs" onPress={() => navigate('Search')} />
                    </View>
                  )}
              </>
            )}
            {page === 'Track' && selectedTrack && (
              <>
                <View style={{ alignItems: 'center', gap: 13, paddingVertical: 15 }}>
                  <Cover uri={selectedTrack.albumArt} size={210} rounded={24} />
                  <Text style={[m.title, { textAlign: 'center' }]}>{selectedTrack.title}</Text>
                  <Text style={m.muted}>{selectedTrack.artist}</Text>
                  <View style={m.row}>
                    <PlayButton onPress={() => music.play(selectedTrack)} />
                    <IconButton
                      label="Track options"
                      onPress={() => setAction({ type: 'track', track: selectedTrack })}
                    >
                      <MoreHorizontal size={24} color="white" />
                    </IconButton>
                  </View>
                </View>
                <Text style={m.muted}>
                  {[selectedTrack.album, selectedTrack.releaseDate, selectedTrack.source]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Section title="More like this" />
                {related.isError && (
                  <ErrorNotice
                    message="Related music couldn't be loaded."
                    onRetry={() => void related.refetch()}
                  />
                )}
              </>
            )}
            {page === 'History' && (
              <View style={m.row}>
                <Text style={[m.muted, m.flex]}>Your recently played tracks</Text>
                <Button
                  title="Clear history"
                  variant="ghost"
                  fullWidth={false}
                  disabled={!music.preferences.history.length}
                  onPress={() => setAction({ type: 'history' })}
                />
              </View>
            )}
            {loading && (
              <ActivityIndicator color={colors.purple} accessibilityLabel="Loading music" />
            )}
          </>
        }
        ListEmptyComponent={
          !loading &&
          ((page === 'Search' &&
            searchSettled &&
            !!debounced &&
            search.isSuccess &&
            resultType === 'Tracks') ||
            page === 'History') ? (
            <View style={m.empty}>
              <Text style={m.muted}>
                {page === 'History'
                  ? 'Play something you love. It will appear here.'
                  : 'No tracks found. Try another artist or title.'}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          page === 'Search' && searchSettled && !!debounced && search.hasNextPage ? (
            <Button
              title={search.isFetchingNextPage ? 'Loading…' : 'Load more results'}
              loading={search.isFetchingNextPage}
              disabled={!music.isOnline}
              variant="ghost"
              onPress={() => void search.fetchNextPage()}
            />
          ) : null
        }
      />
      {menu && <MusicMenu title={menuTitle} items={menuItems} onClose={() => setMenu(null)} />}
      {action && (
        <MusicActions
          action={action}
          onClose={() => setAction(null)}
          onOpenTrack={openTrack}
          onOpenPlaylist={openPlaylist}
        />
      )}
    </View>
  );
}
function queryCount(
  query: { data?: unknown[]; isFetching?: boolean; isError: boolean },
  unit: string,
) {
  if (query.data)
    return `${query.data.length} ${query.data.length === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit}`;
  return query.isError ? 'Unavailable' : query.isFetching ? 'Loading…' : 'Connect to load';
}
const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff12',
    marginBottom: 2,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: '#b889ff' },
  tabText: { color: '#a7a2af', fontSize: 15, fontWeight: '500' },
  resultType: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 12 },
  jamCard: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    backgroundColor: '#a66af811',
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#b47cfb20',
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
    marginTop: 12,
  },
});
