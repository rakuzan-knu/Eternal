import * as React from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { getMobileApi, webOrigin } from '@/shared/api/client';
import { Button } from '@/shared/ui';
import { colors, ErrorNotice, Sheet } from '../../feed/ui/primitives';
import { shareLink } from '../../feed/ui/shareLink';
import { useMusic } from '../model/MusicProvider';
import { musicApi } from '../api/musicApi';
import { musicLink, type Track, type Playlist, type Folder } from '../model/music';
import { Cover, m } from './primitives';
import { tr } from '@/shared/lib/i18n';

export type MusicAction =
  | { type: 'track'; track: Track; playlist?: Playlist }
  | { type: 'playlist'; playlist: Playlist }
  | { type: 'folder'; folder: Folder }
  | { type: 'create' }
  | { type: 'history' };
export function MusicActions({
  action,
  onClose,
  onOpenTrack,
  onOpenPlaylist,
}: {
  action: MusicAction;
  onClose: () => void;
  onOpenTrack: (track: Track) => void;
  onOpenPlaylist: (playlist: Playlist) => void;
}) {
  const music = useMusic();
  const [mode, setMode] = React.useState(action.type === 'history' ? 'delete' : 'menu');
  const [name, setName] = React.useState(
    action.type === 'playlist'
      ? action.playlist.title
      : action.type === 'folder'
        ? action.folder.name
        : '',
  );
  const [description, setDescription] = React.useState(
    action.type === 'playlist' ? action.playlist.description || '' : '',
  );
  const [cover, setCover] = React.useState(
    action.type === 'playlist' ? action.playlist.coverUrl || '' : '',
  );
  const [privatePlaylist, setPrivate] = React.useState(
    action.type === 'playlist' ? !!action.playlist.isPrivate : false,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [recipient, setRecipient] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const [friendFilter, setFriendFilter] = React.useState('');
  const createdPlaylist = React.useRef<Playlist | null>(null);
  const playlist = action.type === 'playlist' ? action.playlist : null;
  const track = action.type === 'track' ? action.track : null;
  const own = playlist?.creatorId === music.userId;
  const title =
    track?.title ||
    playlist?.title ||
    (action.type === 'folder'
      ? action.folder.name
      : action.type === 'history'
        ? tr('Clear history')
        : 'Create');
  const url = musicLink(track ? 'track' : 'playlist', track?.id || playlist?.id || '', webOrigin);
  const following = useInfiniteQuery({
    queryKey: ['mobile', music.userId, 'music', 'share-friends'],
    initialPageParam: '',
    queryFn: async ({ pageParam, signal }) => {
      const data = (
        await getMobileApi().get(`/users/${encodeURIComponent(music.userId)}/following`, {
          params: { limit: 20, after: pageParam || undefined },
          signal,
        })
      ).data;
      const person = z.object({
        id: z.string(),
        username: z.string(),
        displayName: z.string().nullish(),
        avatar: z.string().nullish(),
      });
      const parsed = z
        .union([
          z.array(person),
          z.object({ items: z.array(person), nextCursor: z.string().nullish() }),
          z.object({
            data: z.array(person),
            meta: z.object({ nextCursor: z.string().nullish() }).optional(),
          }),
        ])
        .parse(data);
      return Array.isArray(parsed)
        ? { items: parsed, nextCursor: null }
        : 'items' in parsed
          ? parsed
          : { items: parsed.data, nextCursor: parsed.meta?.nextCursor };
    },
    getNextPageParam: (last) => last.nextCursor || undefined,
    enabled: mode === 'share' && music.isOnline,
  });
  async function complete(fn: () => Promise<unknown>, notice?: string) {
    if (await music.run(fn, notice)) onClose();
  }
  async function chooseCover() {
    setPicking(true);
    setError(null);
    try {
      if (
        Platform.OS !== 'web' &&
        !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted
      ) {
        setError(tr('Allow photo access to choose a playlist cover.'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.65,
        base64: true,
      });
      if (result.canceled) return;
      const photo = result.assets[0];
      if (!photo?.base64) throw new Error('Image unavailable');
      if (photo.base64.length > 2_500_000)
        throw new Error('Choose a smaller cover photo (under 2 MB).');
      const mimeType = Platform.OS === 'web' ? photo.mimeType || 'image/jpeg' : 'image/jpeg';
      setCover(`data:${mimeType};base64,${photo.base64}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : tr('The cover could not be opened.'));
    } finally {
      setPicking(false);
    }
  }
  async function save() {
    if (!name.trim()) {
      setError(tr('Enter a name.'));
      return;
    }
    if (mode === 'newFolder')
      await complete(() => musicApi.createFolder(name.trim()), 'Folder created');
    else if (mode === 'folderEdit' && action.type === 'folder')
      await complete(() => musicApi.renameFolder(action.folder.id, name.trim()), 'Folder renamed');
    else if (mode === 'edit' && playlist)
      await complete(
        () =>
          musicApi.update(playlist.id, {
            title: name.trim(),
            description: description.trim(),
            coverUrl: cover,
            isPublic: !privatePlaylist,
          }),
        'Playlist updated',
      );
    else if (mode === 'newPlaylist') {
      if (
        await music.run(async () => {
          const details = {
            title: name.trim(),
            description: description.trim(),
            coverUrl: cover,
            isPublic: !privatePlaylist,
          };
          createdPlaylist.current = createdPlaylist.current
            ? await musicApi.update(createdPlaylist.current.id, details)
            : await musicApi.create(details);
          if (track) await musicApi.addTrack(createdPlaylist.current.id, track);
        }, 'Playlist created')
      ) {
        onClose();
        if (createdPlaylist.current) onOpenPlaylist(createdPlaylist.current);
      }
    }
  }
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Button
      key={label}
      title={label}
      variant="secondary"
      disabled={disabled || music.busy || picking}
      onPress={onPress}
    />
  );
  const shareButtons = (
    <>
      {button(
        'Share link',
        () => void shareLink(title, url).catch(() => setError(tr('Sharing is unavailable.'))),
      )}
      {button(
        'Copy link',
        () =>
          void Clipboard.setStringAsync(url)
            .then(() => music.setNotice(tr('Link copied')))
            .catch(() => setError(tr('The link could not be copied.'))),
      )}
      {button('Send to chat', () => setMode('share'), !music.isOnline)}
    </>
  );
  return (
    <Sheet
      title={
        mode === 'menu'
          ? title
          : mode === 'delete'
            ? tr('Confirm removal')
            : mode === 'share'
              ? tr('Share to chat')
              : mode === 'add'
                ? tr('Add to playlist')
                : mode === 'move'
                  ? tr('Move to folder')
                  : mode === 'collaborators'
                    ? 'Collaborators'
                    : tr('Playlist details')
      }
      onClose={onClose}
      closeDisabled={music.busy || picking}
    >
      <ScrollView
        contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        {(error || music.error) && <ErrorNotice message={error || music.error || ''} />}
        {mode === 'menu' && (
          <>
            {track && (
              <>
                <View style={m.row}>
                  <Cover uri={track.albumArt} size={64} />
                  <View style={m.flex}>
                    <Text style={m.heading}>{track.title}</Text>
                    <Text style={m.muted}>{track.artist}</Text>
                  </View>
                </View>
                {button(
                  music.liked.data?.some((item) => item.id === track.id)
                    ? tr('Remove from Liked Songs')
                    : tr('Save to Liked Songs'),
                  () => void music.like(track),
                  !music.isOnline,
                )}
                {button('Add to queue', () => {
                  music.addToQueue(track);
                  onClose();
                })}
                {music.jam.room &&
                  button(
                    'Add to Jam queue',
                    () => music.jam.add(track),
                    !music.jam.isHost && music.jam.room.queuePolicy === 'dj_only',
                  )}
                {button(tr('Add to playlist'), () => setMode('add'), !music.isOnline)}
                {action.type === 'track' &&
                  action.playlist?.creatorId === music.userId &&
                  button(
                    'Remove from this playlist',
                    () =>
                      void complete(
                        () => musicApi.removeTrack(action.playlist!.id, track.id),
                        'Track removed',
                      ),
                    !music.isOnline,
                  )}
                {button('Track details and related songs', () => onOpenTrack(track))}
                {shareButtons}
              </>
            )}
            {playlist && (
              <>
                {button(
                  music.preferences.pinned.includes(playlist.id)
                    ? tr('Unpin playlist')
                    : tr('Pin playlist'),
                  () => {
                    music.pin(playlist.id);
                    onClose();
                  },
                )}
                {!own &&
                  playlist.id !== 'liked-songs' &&
                  button(
                    music.preferences.saved.some((item) => item.id === playlist.id)
                      ? tr('Remove from your library')
                      : tr('Save to your library'),
                    () => {
                      music.save(playlist);
                      onClose();
                    },
                  )}
                {own && (
                  <>
                    {button('Edit details', () => setMode('edit'), !music.isOnline)}
                    {button(
                      playlist.isPrivate ? tr('Make public') : tr('Make private'),
                      () =>
                        void complete(
                          () => musicApi.update(playlist.id, { isPublic: !!playlist.isPrivate }),
                          'Privacy updated',
                        ),
                      !music.isOnline,
                    )}
                    {button(tr('Move to folder'), () => setMode('move'), !music.isOnline)}
                    {button('Collaborators', () => setMode('collaborators'))}
                    {button('Delete playlist', () => setMode('delete'), !music.isOnline)}
                  </>
                )}
                {playlist.id !== 'liked-songs' && !playlist.isPrivate && shareButtons}
                {playlist.isPrivate && (
                  <Text style={m.muted}>
                    {tr(
                      'Only you can open this private playlist. Make it public before sharing its link.',
                    )}
                  </Text>
                )}
              </>
            )}
            {action.type === 'folder' && (
              <>
                {button('Rename folder', () => setMode('folderEdit'), !music.isOnline)}
                {button('Delete folder', () => setMode('delete'), !music.isOnline)}
              </>
            )}
            {action.type === 'create' && (
              <>
                {button('Create playlist', () => setMode('newPlaylist'), !music.isOnline)}
                {button('Create folder', () => setMode('newFolder'), !music.isOnline)}
              </>
            )}
          </>
        )}
        {['newPlaylist', 'newFolder', 'folderEdit', 'edit'].includes(mode) && (
          <>
            <Text style={m.muted}>{tr('Name')}</Text>
            <TextInput
              accessibilityLabel={tr('Name')}
              placeholder={tr('Give it a name')}
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!music.busy}
              style={m.input}
            />
            {['newPlaylist', 'edit'].includes(mode) && (
              <>
                <Text style={m.muted}>{tr('Description')}</Text>
                <TextInput
                  accessibilityLabel={tr('Playlist description')}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={1000}
                  multiline
                  style={[m.input, { minHeight: 85, paddingTop: 12 }]}
                  editable={!music.busy}
                />
                <View style={m.row}>
                  <Cover uri={cover} size={72} />
                  <View style={m.flex}>
                    {button('Choose cover photo', () => void chooseCover())}
                  </View>
                </View>
                {!!cover && button('Remove cover', () => setCover(''))}
                <View style={[m.row, { justifyContent: 'space-between', paddingVertical: 10 }]}>
                  <Text style={m.text}>{tr('Private playlist')}</Text>
                  <Switch
                    accessibilityLabel={tr('Private playlist')}
                    value={privatePlaylist}
                    onValueChange={setPrivate}
                    disabled={music.busy}
                    trackColor={{ true: '#9852ee', false: '#47404f' }}
                  />
                </View>
              </>
            )}
            <Button
              title={tr('Save')}
              loading={music.busy || picking}
              disabled={!name.trim() || !music.isOnline}
              onPress={() => void save()}
            />
          </>
        )}
        {mode === 'add' && track && (
          <>
            {button('Create a new playlist', () => setMode('newPlaylist'))}
            {music.playlists.data?.map((item) =>
              button(
                item.title,
                () => void complete(() => musicApi.addTrack(item.id, track), 'Added to playlist'),
              ),
            )}
            {!music.playlists.data?.length && (
              <Text style={m.muted}>{tr('Create your first playlist above.')}</Text>
            )}
          </>
        )}
        {mode === 'move' && playlist && (
          <>
            {button(
              'Outside folders',
              () =>
                void complete(
                  () => musicApi.update(playlist.id, { folderId: null }),
                  'Playlist moved',
                ),
            )}
            {music.folders.data?.map((item) =>
              button(
                item.name,
                () =>
                  void complete(
                    () => musicApi.update(playlist.id, { folderId: item.id }),
                    'Playlist moved',
                  ),
              ),
            )}
            {!music.folders.data?.length && (
              <Text style={m.muted}>{tr('Create a folder in Your Library first.')}</Text>
            )}
          </>
        )}
        {mode === 'delete' && (
          <>
            <Text style={m.text}>
              {action.type === 'history'
                ? tr('Clear your listening history on this device?')
                : action.type === 'folder'
                  ? tr('Delete this folder? Its playlists will remain in your library.')
                  : tr('Delete this playlist? This cannot be undone.')}
            </Text>
            <Button
              title={tr('Keep it')}
              variant="secondary"
              onPress={onClose}
              disabled={music.busy}
            />
            <Button
              title={tr('Confirm removal')}
              loading={music.busy}
              onPress={() => {
                if (action.type === 'history') {
                  music.setPreferences((value) => ({ ...value, history: [] }));
                  onClose();
                } else if (action.type === 'folder')
                  void complete(() => musicApi.removeFolder(action.folder.id), 'Folder removed');
                else if (playlist)
                  void complete(() => musicApi.remove(playlist.id), 'Playlist removed');
              }}
            />
          </>
        )}
        {mode === 'share' && (
          <>
            {!following.isFetching &&
              !following.isError &&
              !following.data?.pages.some((page) => page.items.length > 0) && (
                <Text style={m.muted}>
                  {tr('Follow a friend to send music to their chat. You can also share the link.')}
                </Text>
              )}
            <TextInput
              accessibilityLabel={tr('Find a friend')}
              placeholder={tr('Find a friend')}
              placeholderTextColor={colors.muted}
              value={friendFilter}
              onChangeText={setFriendFilter}
              style={m.input}
            />
            {following.isPending ? (
              <ActivityIndicator color={colors.purple} />
            ) : following.isError ? (
              <ErrorNotice
                message={tr("Friends couldn't be loaded.")}
                onRetry={() => void following.refetch()}
              />
            ) : (
              following.data?.pages
                .flatMap((page) => page.items)
                .filter((person) =>
                  `${person.username} ${person.displayName || ''}`
                    .toLowerCase()
                    .includes(friendFilter.toLowerCase()),
                )
                .map((person) => (
                  <Pressable
                    key={person.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: recipient === person.id }}
                    accessibilityLabel={tr('Send to {name}', {
                      name: person.displayName || person.username,
                    })}
                    onPress={() => setRecipient(person.id)}
                    style={[
                      m.row,
                      {
                        padding: 10,
                        borderRadius: 15,
                        backgroundColor: recipient === person.id ? '#9450dc40' : '#ffffff06',
                      },
                    ]}
                  >
                    <Cover uri={person.avatar} size={42} rounded={21} />
                    <Text style={m.text}>{person.displayName || person.username}</Text>
                  </Pressable>
                ))
            )}
            {following.hasNextPage &&
              button(
                'Load more friends',
                () => void following.fetchNextPage(),
                following.isFetchingNextPage,
              )}
            <TextInput
              accessibilityLabel={tr('Message with music')}
              placeholder={tr('Add a message (optional)')}
              placeholderTextColor={colors.muted}
              value={message}
              onChangeText={setMessage}
              maxLength={1000}
              multiline
              style={m.input}
            />
            <Button
              title={tr('Send music')}
              disabled={!recipient || !music.isOnline}
              loading={music.busy}
              onPress={() =>
                void complete(async () => {
                  const api = getMobileApi();
                  const conversation = z
                    .object({ id: z.string() })
                    .parse(
                      (await api.post('/conversations/direct', { participantId: recipient })).data,
                    );
                  await api.post(`/conversations/${encodeURIComponent(conversation.id)}/messages`, {
                    conversationId: conversation.id,
                    text: `${message.trim() ? `${message.trim()}\n` : ''}🎵 ${title}\n${url}`,
                  });
                }, 'Music sent to chat')
              }
            />
          </>
        )}
        {mode === 'collaborators' && (
          <>
            <Text style={m.text}>{tr('Manage playlist collaborators in the web Music Hub.')}</Text>
            {button(
              'Open web collaboration',
              () =>
                void Linking.openURL(url).catch(() =>
                  setError(tr('The web Music Hub could not be opened.')),
                ),
            )}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}
