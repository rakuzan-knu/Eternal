import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import {
  ArrowLeft,
  Gamepad2,
  Heart,
  ListMusic,
  Mic2,
  Plus,
  Search,
  Volume2,
  X,
} from 'lucide-react-native';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useMusic } from '../model/MusicProvider';
import { musicApi } from '../api/musicApi';
import { trackSource, type Playlist } from '../model/music';
import { IconButton } from '../../feed/ui/primitives';
import { Button } from '@/shared/ui';
import { Cover, m, MusicStatus, TrackRow } from './primitives';
import { MusicBackdrop, musicGradient } from './MusicBackdrop';
import { MusicTransport } from './MusicTransport';
import { MusicLyrics } from './MusicLyrics';
import { MusicSlider } from './MusicSlider';
import { tr } from '@/shared/lib/i18n';

type Panel = 'Playlists' | 'Queue' | 'Search' | 'Lyrics' | 'Controls';
export function MusicGameMode() {
  const music = useMusic();
  const [panel, setPanel] = React.useState<Panel>('Playlists');
  const [selected, setSelected] = React.useState<Playlist | null>(null);
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const settled = query.trim() === debounced;
  const client = useQueryClient();
  React.useEffect(() => {
    if (panel !== 'Search' || !settled)
      void client.cancelQueries({ queryKey: ['mobile', music.userId, 'music', 'game-search'] });
    if (panel !== 'Playlists')
      void client.cancelQueries({ queryKey: ['mobile', music.userId, 'music', 'game-playlist'] });
  }, [client, panel, settled, music.userId]);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${tr('Game Mode')} • Eternal`;
    const back = () => {
      if (panel !== 'Playlists') setPanel('Playlists');
      else if (selected) setSelected(null);
      else music.exitGameMode();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        back();
      }
    };
    if (Platform.OS === 'web') window.addEventListener('keydown', keyboard);
    return () => {
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('keydown', keyboard);
    };
  }, [panel, selected, music.exitGameMode]);
  const detail = useQuery({
    queryKey: ['mobile', music.userId, 'music', 'game-playlist', selected?.id],
    queryFn: ({ signal }) => {
      if (!selected) throw new Error('Choose a playlist');
      return musicApi.playlist(selected, signal);
    },
    enabled:
      panel === 'Playlists' &&
      !!selected &&
      selected.id !== 'liked-songs' &&
      selected.id !== 'history' &&
      music.isOnline,
    refetchOnWindowFocus: false,
  });
  const search = useInfiniteQuery({
    queryKey: ['mobile', music.userId, 'music', 'game-search', debounced],
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const results = await Promise.allSettled(
        (['soundcloud', 'spotify'] as const).map((source) =>
          musicApi.tracks(debounced, source, pageParam, signal),
        ),
      );
      if (results.every((result) => result.status === 'rejected'))
        throw new Error(tr('Music search is unavailable.'));
      const lists = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      return {
        tracks: lists.flat(),
        partial: results.some((result) => result.status === 'rejected'),
        more: lists.some((list) => list.length === 20),
      };
    },
    getNextPageParam: (last, _pages, lastOffset) => (last.more ? lastOffset + 20 : undefined),
    enabled: panel === 'Search' && !!debounced && settled && music.isOnline,
    refetchOnWindowFocus: false,
    retry: 0,
  });
  const playlists = [
    ...new Map(
      [...music.preferences.saved, ...(music.playlists.data || [])].map((item) => [item.id, item]),
    ).values(),
  ];
  const playlistTracks =
    selected?.id === 'liked-songs'
      ? music.liked.data || []
      : selected?.id === 'history'
        ? music.preferences.history
        : detail.data?.tracks || [];
  const searchTracks = settled
    ? [
        ...new Map(
          (search.data?.pages.flatMap((page) => page.tracks) || []).map((track) => [
            track.id,
            track,
          ]),
        ).values(),
      ]
    : [];
  const tracks =
    panel === 'Queue' ? music.queue : panel === 'Search' ? searchTracks : playlistTracks;
  const playlistLoading =
    selected?.id === 'liked-songs'
      ? music.liked.isFetching && !music.liked.data
      : selected?.id === 'history'
        ? false
        : detail.isFetching && !detail.data;
  const playlistError =
    selected?.id === 'liked-songs'
      ? music.liked.isError
      : selected?.id === 'history'
        ? false
        : detail.isError;
  const retryPlaylist = () => {
    if (selected?.id === 'liked-songs') void music.liked.refetch();
    else void detail.refetch();
  };
  const openCollection = (id: string, title: string) => setSelected({ id, title, tracks: [] });
  const externalOnly =
    !!music.current && trackSource(music.current) === 'spotify' && !music.current.previewUrl;
  return (
    <View style={s.root} testID="music-game-mode">
      <MusicBackdrop seed={music.current?.id || 'game-mode'} />
      <View style={s.header}>
        <Gamepad2 size={24} color="#d9bfff" />
        <View style={m.flex}>
          <Text accessibilityRole="header" style={s.heading}>
            {tr('Game Mode')}
          </Text>
          <Text style={m.muted}>{tr('Just you and the music')}</Text>
        </View>
        <IconButton
          label={tr('Game audio settings')}
          selected={panel === 'Controls'}
          onPress={() => setPanel(panel === 'Controls' ? 'Playlists' : 'Controls')}
        >
          <Volume2 size={21} color="#fff" />
        </IconButton>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Exit Game Mode')}
          onPress={music.exitGameMode}
          style={s.exit}
        >
          <X size={17} color="#fff" />
          <Text style={m.text}>{tr('Exit')}</Text>
        </Pressable>
      </View>
      {!!music.notice && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('Dismiss: {text}', { text: music.notice })}
          onPress={() => music.setNotice(null)}
          style={[m.row, { minHeight: 44, paddingHorizontal: 20, backgroundColor: '#c9a4ff15' }]}
        >
          <Text accessibilityLiveRegion="polite" style={[m.text, m.flex]}>
            {music.notice}
          </Text>
          <X size={16} color="#d9bfff" />
        </Pressable>
      )}
      {!!music.jam.error && (
        <Text accessibilityRole="alert" style={[m.muted, { paddingHorizontal: 20 }]}>
          {music.jam.error}
        </Text>
      )}
      {!music.isOnline && (
        <Text accessibilityRole="alert" style={[m.muted, { paddingHorizontal: 20 }]}>
          {tr("You're offline. Reconnect to load music.")}
        </Text>
      )}
      {!!music.error && (
        <View style={{ paddingHorizontal: 16 }}>
          <MusicStatus message={music.error} onRetry={externalOnly ? undefined : music.toggle} />
        </View>
      )}
      {panel === 'Lyrics' ? (
        <MusicLyrics onBack={() => setPanel('Playlists')} />
      ) : (
        <>
          {panel === 'Controls' ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={m.flex}
              contentContainerStyle={{ padding: 24, gap: 18 }}
            >
              <Text style={m.heading}>{tr('Your sound')}</Text>
              <Text style={m.muted}>{tr('Volume')}</Text>
              <MusicSlider
                accessibilityLabel={tr('Game music volume')}
                minimumValue={0}
                maximumValue={1}
                step={0.05}
                value={music.muted ? 0 : music.preferences.volume}
                onValueChange={(volume) => {
                  music.setPreferences((value) => ({ ...value, volume }));
                  if (volume > 0) music.setMuted(false);
                }}
                minimumTrackTintColor="#c9a4ff"
                thumbTintColor="white"
                style={{ height: 44 }}
              />
              <Text style={m.muted}>{tr('Sleep timer')}</Text>
              <View style={[m.row, { flexWrap: 'wrap' }]}>
                {[15, 30, 60].map((minutes) => (
                  <Button
                    key={minutes}
                    title={`${minutes} min`}
                    fullWidth={false}
                    variant="secondary"
                    onPress={() => music.setSleepUntil(Date.now() + minutes * 60000)}
                  />
                ))}
              </View>
              {!!music.sleepUntil && (
                <Button
                  title={tr('Turn off sleep timer')}
                  variant="ghost"
                  onPress={() => music.setSleepUntil(null)}
                />
              )}
              <Text style={m.muted}>
                {tr(
                  'Game Mode pauses the social screens and their updates. Your music keeps playing when you return to the game.',
                )}
              </Text>
              <Button
                title={tr('Back to music')}
                variant="secondary"
                onPress={() => setPanel('Playlists')}
              />
            </ScrollView>
          ) : panel === 'Playlists' && !selected ? (
            <FlatList
              key="collections"
              showsVerticalScrollIndicator={false}
              data={playlists}
              numColumns={2}
              keyExtractor={(item) => item.id}
              initialNumToRender={6}
              windowSize={3}
              contentContainerStyle={s.content}
              columnWrapperStyle={{ gap: 12 }}
              ListHeaderComponent={
                <View style={{ gap: 12, paddingBottom: 18 }}>
                  <Text style={s.hero}>{tr('Pick your soundtrack.')}</Text>
                  <Text style={m.muted}>{tr('Change the mix. Stay in the game.')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tr('Game liked songs')}
                    onPress={() => openCollection('liked-songs', tr('Liked songs'))}
                  >
                    <LinearGradient
                      colors={['#7340b5', '#382650']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.collection}
                    >
                      <Heart size={30} color="#fff" fill="#fff" />
                      <View style={m.flex}>
                        <Text style={s.collectionTitle}>{tr('Liked songs')}</Text>
                        <Text style={s.caption}>
                          {music.liked.data
                            ? tr('{count} saved', { count: music.liked.data.length })
                            : music.liked.isError
                              ? tr('Tap to retry')
                              : tr('Loading…')}
                        </Text>
                      </View>
                      <ListMusic size={22} color="#e5d5fa" />
                    </LinearGradient>
                  </Pressable>
                  {!!music.preferences.history.length && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={tr('Game recently played')}
                      onPress={() => openCollection('history', tr('Recently played'))}
                      style={s.recent}
                    >
                      <Cover uri={music.preferences.history[0].albumArt} size={48} />
                      <View style={m.flex}>
                        <Text style={m.trackTitle}>{tr('Jump back in')}</Text>
                        <Text numberOfLines={1} style={m.muted}>
                          {music.preferences.history[0].title}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  <Text style={[m.heading, { fontSize: 18, marginTop: 8 }]}>
                    {tr('Your playlists')}
                  </Text>
                  {music.playlists.isFetching && !music.playlists.data && (
                    <ActivityIndicator
                      color="#c9a4ff"
                      accessibilityLabel={tr('Loading game playlists')}
                    />
                  )}
                  {music.playlists.isError && (
                    <MusicStatus
                      message={tr("Playlists couldn't load.")}
                      onRetry={() => void music.playlists.refetch()}
                    />
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={tr('Game playlist {name}', { name: item.title })}
                  onPress={() => setSelected(item)}
                  style={s.tile}
                >
                  <LinearGradient colors={musicGradient(item.id)} style={s.tileArt}>
                    <Cover uri={item.coverUrl || item.tracks[0]?.albumArt} size={94} rounded={16} />
                  </LinearGradient>
                  <Text numberOfLines={2} style={m.trackTitle}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={m.muted}>
                    {item.creator || tr('Your playlist')}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                !music.playlists.isFetching && !music.playlists.isError ? (
                  <View style={{ paddingVertical: 18, gap: 12 }}>
                    <Text style={m.muted}>
                      {tr(
                        'Your saved playlists will appear here. Find a song to start your next session.',
                      )}
                    </Text>
                    <Button
                      title={tr('Find music')}
                      variant="secondary"
                      onPress={() => setPanel('Search')}
                    />
                  </View>
                ) : null
              }
            />
          ) : (
            <FlatList
              key="tracks"
              showsVerticalScrollIndicator={false}
              data={tracks}
              keyExtractor={(item, index) => `${item.id}:${index}`}
              initialNumToRender={6}
              windowSize={3}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
              ListHeaderComponent={
                <View style={{ gap: 12, paddingBottom: 14 }}>
                  {panel === 'Playlists' && (
                    <>
                      <View style={m.row}>
                        <IconButton
                          label={tr('Back to game playlists')}
                          onPress={() => setSelected(null)}
                        >
                          <ArrowLeft size={22} color="white" />
                        </IconButton>
                        <Text style={[m.heading, m.flex]}>{selected?.title}</Text>
                      </View>
                      {playlistLoading && (
                        <ActivityIndicator
                          color="#c9a4ff"
                          accessibilityLabel={tr('Loading playlist')}
                        />
                      )}
                      {playlistError ? (
                        <MusicStatus
                          message={tr("This playlist couldn't be loaded.")}
                          onRetry={retryPlaylist}
                        />
                      ) : (
                        !!playlistTracks.length && (
                          <Button
                            title={tr('Play this mix')}
                            onPress={() => music.play(playlistTracks[0], playlistTracks)}
                            disabled={!music.isOnline}
                          />
                        )
                      )}
                    </>
                  )}
                  {panel === 'Queue' && (
                    <View style={m.row}>
                      <Text style={[m.heading, m.flex]}>{tr('Your queue')}</Text>
                      <Button
                        title={tr('Clear upcoming')}
                        fullWidth={false}
                        variant="ghost"
                        disabled={music.listener || music.queue.length < 2}
                        onPress={music.clearQueue}
                      />
                    </View>
                  )}
                  {panel === 'Search' && (
                    <>
                      <TextInput
                        autoFocus
                        accessibilityLabel={tr('Search in Game Mode')}
                        placeholder={tr('Songs or artists')}
                        placeholderTextColor="#b7afc4"
                        value={query}
                        onChangeText={setQuery}
                        style={m.input}
                      />
                      {!!query && (
                        <Button
                          title={tr('Clear search')}
                          variant="ghost"
                          onPress={() => setQuery('')}
                        />
                      )}
                      {music.isOnline &&
                        !!query.trim() &&
                        (!settled || (search.isFetching && !search.data)) && (
                          <ActivityIndicator
                            color="#c9a4ff"
                            accessibilityLabel={tr('Searching music')}
                          />
                        )}
                      {settled && search.isError && (
                        <MusicStatus
                          message={tr('Music search is unavailable.')}
                          onRetry={() => void search.refetch()}
                        />
                      )}
                      {settled && search.data?.pages.some((page) => page.partial) && (
                        <MusicStatus
                          message={tr('One catalog is unavailable. Showing available music.')}
                          onRetry={() => void search.refetch()}
                        />
                      )}
                    </>
                  )}
                </View>
              }
              renderItem={({ item, index }) => (
                <View style={m.row}>
                  <View style={m.flex}>
                    <TrackRow
                      track={item}
                      active={music.current?.id === item.id}
                      playing={music.playing}
                      onPlay={() =>
                        music.current?.id === item.id ? music.toggle() : music.play(item, tracks)
                      }
                    />
                  </View>
                  {panel === 'Queue' && index !== music.index && (
                    <IconButton
                      label={tr('Remove {name} from queue', { name: item.title })}
                      disabled={music.listener}
                      onPress={() => music.removeQueue(index)}
                    >
                      <X size={18} color="#c4b7d0" />
                    </IconButton>
                  )}
                  {panel !== 'Queue' && (
                    <IconButton
                      label={tr('Add {name} to queue', { name: item.title })}
                      disabled={
                        !music.isOnline ||
                        (music.listener && music.jam.room?.queuePolicy === 'dj_only')
                      }
                      onPress={() => music.addToQueue(item)}
                    >
                      <Plus size={20} color="#c9a4ff" />
                    </IconButton>
                  )}
                </View>
              )}
              ListEmptyComponent={
                panel === 'Queue' ? (
                  <Text style={m.muted}>
                    {tr('Pick a playlist or find a song to start listening.')}
                  </Text>
                ) : panel === 'Search' ? (
                  !query.trim() ? (
                    <Text style={m.muted}>
                      {tr('Search SoundCloud and Spotify without leaving the game.')}
                    </Text>
                  ) : settled && search.isSuccess ? (
                    <Text style={m.muted}>{tr('No matches. Try another artist or song.')}</Text>
                  ) : null
                ) : !playlistLoading && !playlistError && music.isOnline ? (
                  <Text style={m.muted}>{tr('No songs in this collection yet.')}</Text>
                ) : null
              }
              ListFooterComponent={
                panel === 'Search' && settled && search.hasNextPage ? (
                  <Button
                    title={tr('Load more music')}
                    variant="ghost"
                    loading={search.isFetchingNextPage}
                    onPress={() => void search.fetchNextPage()}
                  />
                ) : null
              }
            />
          )}
          <MusicTransport />
        </>
      )}
      <View style={s.tabs}>
        {(
          [
            { title: 'Playlists', Icon: ListMusic },
            { title: 'Queue', Icon: ListMusic },
            { title: 'Search', Icon: Search },
            { title: 'Lyrics', Icon: Mic2 },
          ] as const
        ).map(({ title, Icon }) => (
          <Pressable
            key={tr(title)}

            accessibilityRole="button"
            accessibilityLabel={tr('Game {name}', { name: tr(title).toLowerCase() })}
            accessibilityState={{
              selected: panel === title,
              disabled: title === 'Lyrics' && !music.current,
            }}
            aria-pressed={panel === title}
            disabled={title === 'Lyrics' && !music.current}
            onPress={() => setPanel(title)}
            style={[
              s.tab,
              panel === title && s.active,
              title === 'Lyrics' && !music.current && { opacity: 0.4 },
            ]}
          >
            <Icon size={20} color={panel === title ? '#eadcff' : '#b7afc4'} />
            <Text style={[m.small, { color: panel === title ? '#eadcff' : '#b7afc4' }]}>
              {tr(title)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090b13' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  heading: { color: '#fff', fontSize: 19, fontWeight: '800' },
  exit: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff10',
    borderRadius: 22,
  },
  hero: { fontSize: 27, lineHeight: 34, fontWeight: '800', color: '#fff', letterSpacing: -0.6 },
  content: { padding: 18, paddingBottom: 24 },
  collection: {
    padding: 20,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 100,
  },
  collectionTitle: { fontSize: 19, fontWeight: '700', color: '#fff' },
  caption: { fontSize: 13, color: '#e5d5fa', marginTop: 5 },
  recent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff08',
  },
  tile: { flex: 1, maxWidth: '49%', paddingBottom: 16, gap: 7 },
  tileArt: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 20,
    minHeight: 130,
  },
  tabs: {
    flexDirection: 'row',
    padding: 8,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#ffffff12',
    backgroundColor: '#090b1366',
  },
  tab: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 16,
  },
  active: { backgroundColor: '#c9a4ff20' },
});
