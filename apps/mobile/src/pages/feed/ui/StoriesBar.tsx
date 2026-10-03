import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, type UserSessionProfile } from '@social-network/shared-stores';
import type { StoryViewResponse, UserStoriesGroup } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { assertSession, getMobileApi } from '@/shared/api/client';
import { feedApi } from '../api/feedApi';
import { storyForm } from '../api/postForm';
import { feedKeys } from '../model/queries';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';
import { Video } from './MediaGallery';

function StoryViewer({
  group,
  userId,
  onClose,
}: {
  group: UserStoriesGroup;
  userId: string;
  onClose: () => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [imageFailed, setImageFailed] = React.useState(false);
  const client = useQueryClient();
  const story = group.stories[index];
  React.useEffect(() => {
    setImageFailed(false);
    if (!story) return;
    void feedApi
      .viewStory(story.id)
      .then(() => client.invalidateQueries({ queryKey: feedKeys.stories(userId) }))
      .catch(() => {});
  }, [story?.id, userId, client]);
  return (
    <Sheet title={group.user.displayName || group.user.username} onClose={onClose}>
      <View style={s.viewer}>
        <View style={s.progress}>
          {group.stories.map((item, i) => (
            <View key={item.id} style={[s.progressSegment, i <= index && s.progressSelected]} />
          ))}
        </View>
        {story && (
          <View style={s.storyMedia}>
            {story.mediaType === 'IMAGE' ? (
              imageFailed ? (
                <ErrorNotice message="This story image couldn't be loaded." />
              ) : (
                <Image
                  source={{ uri: story.mediaUrl }}
                  resizeMode="contain"
                  style={s.full}
                  onError={() => setImageFailed(true)}
                  accessibilityLabel={story.caption || 'Story image'}
                />
              )
            ) : (
              <Video key={story.id} uri={story.mediaUrl} active autoPlay />
            )}
            {story.overlays?.map((overlay) =>
              overlay.type === 'text' ? (
                <View
                  key={overlay.id}
                  pointerEvents="none"
                  style={[
                    s.overlay,
                    {
                      left: `${overlay.xPercent}%`,
                      top: `${overlay.yPercent}%`,
                      transform: [{ translateX: -70 }, { rotate: `${overlay.rotation}deg` }],
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: overlay.color,
                      fontSize: Math.min(40, overlay.fontSize),
                      textAlign: overlay.textAlign,
                    }}
                  >
                    {overlay.text}
                  </Text>
                </View>
              ) : null,
            )}
          </View>
        )}
        {!!story?.caption && <Text style={s.caption}>{story.caption}</Text>}
        <View style={s.controls}>
          <IconButton
            label="Previous story"
            disabled={index === 0}
            onPress={() => setIndex((i) => i - 1)}
          >
            <ChevronLeft color={colors.text} />
          </IconButton>
          <Text style={common.muted}>
            {index + 1} / {group.stories.length}
          </Text>
          <IconButton
            label="Next story"
            onPress={() => (index < group.stories.length - 1 ? setIndex((i) => i + 1) : onClose())}
          >
            <ChevronRight color={colors.text} />
          </IconButton>
        </View>
      </View>
    </Sheet>
  );
}

export function CreateStory({
  userId,
  isOnline = true,
  embedded = false,
  onBusyChange,
  onClose,
}: {
  userId: string;
  isOnline?: boolean;
  embedded?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onClose: () => void;
}) {
  const [asset, setAsset] = React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [caption, setCaption] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const client = useQueryClient();
  const create = useMutation({
    mutationFn: async () => {
      if (!asset) throw new Error('Select a photo or video');
      const refreshToken = useAuthStore.getState().refreshToken;
      const body = await storyForm(asset, caption);
      assertSession(userId, refreshToken);
      return (await getMobileApi().post<StoryViewResponse>('/stories', body)).data;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: feedKeys.stories(userId) });
      onClose();
    },
    onError: () => setError('Your story was not published. Please try again.'),
  });
  React.useEffect(() => {
    onBusyChange?.(create.isPending);
  }, [create.isPending, onBusyChange]);
  async function pick() {
    if (!isOnline || picking || create.isPending) return;
    setPicking(true);
    setError(null);
    try {
      if (
        Platform.OS !== 'web' &&
        !(await ImagePicker.requestMediaLibraryPermissionsAsync()).granted
      ) {
        setError('Allow photo library access in Settings to create a story.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        if ((result.assets[0].fileSize ?? result.assets[0].file?.size ?? 0) > 20 * 1024 * 1024) {
          setError('Choose media smaller than 20 MB.');
          return;
        }
        setAsset(result.assets[0]);
      }
    } catch {
      setError('The photo library could not be opened.');
    } finally {
      setPicking(false);
    }
  }
  const content = (
    <ScrollView contentContainerStyle={s.create} keyboardShouldPersistTaps="handled">
      <Text style={common.muted}>
        Share a moment with your followers. Stories disappear after 24 hours.
      </Text>
      {error && <ErrorNotice message={error} />}
      {asset && (
        <View style={s.storyPreview}>
          {asset.type === 'video' ? (
            <Video uri={asset.uri} active />
          ) : (
            <Image source={{ uri: asset.uri }} style={s.full} resizeMode="contain" />
          )}
        </View>
      )}
      <Button
        title={asset ? 'Change photo or video' : 'Choose photo or video'}
        variant="secondary"
        disabled={!isOnline || picking || create.isPending}
        onPress={() => {
          void pick();
        }}
      />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={1000}
        editable={isOnline && !create.isPending}
        placeholder="Add a caption…"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Story caption"
        style={s.captionInput}
      />
      <Button
        title="Share story"
        disabled={!isOnline || !asset || picking}
        loading={create.isPending}
        onPress={() => create.mutate()}
      />
    </ScrollView>
  );
  return embedded ? (
    content
  ) : (
    <Sheet title="Create a story" closeDisabled={create.isPending} onClose={onClose}>
      {content}
    </Sheet>
  );
}

export function StoriesBar({
  user,
  isOnline,
  onOpenChange,
}: {
  user: UserSessionProfile;
  isOnline: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const query = useQuery({
    queryKey: feedKeys.stories(user.id),
    queryFn: ({ signal }) => feedApi.stories(signal),
    staleTime: 60_000,
  });
  const [selected, setSelected] = React.useState<UserStoriesGroup | null>(null);
  const [creating, setCreating] = React.useState(false);
  const own = query.data?.find((group) => group.user.id === user.id);
  const others =
    query.data?.filter((group) => group.user.id !== user.id && group.stories.length > 0) ?? [];
  function close() {
    setSelected(null);
    setCreating(false);
    onOpenChange(false);
  }
  function open(group: UserStoriesGroup) {
    setSelected(group);
    onOpenChange(true);
  }
  return (
    <View style={[common.card, s.card]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.items}>
        <View style={s.item}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={own?.stories.length ? 'View your stories' : 'Create your story'}
            disabled={!own?.stories.length && !isOnline}
            onPress={() => {
              if (own?.stories.length) open(own);
              else {
                setCreating(true);
                onOpenChange(true);
              }
            }}
          >
            <LinearGradient
              colors={
                own?.stories.length
                  ? own.hasCloseFriendsStory
                    ? ['#10b981', '#22c55e', '#14b8a6']
                    : ['#8b5cf6', '#d946ef', '#6366f1']
                  : ['transparent', 'transparent']
              }
              style={s.ring}
            >
              <View style={s.ringInner}>
                <Avatar size={56} name={user.displayName || user.username} uri={user.avatarUrl} />
              </View>
            </LinearGradient>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a story"
            disabled={!isOnline}
            style={s.plus}
            onPress={() => {
              setCreating(true);
              onOpenChange(true);
            }}
          >
            <View style={s.plusBadge}>
              <Plus size={14} color="white" />
            </View>
          </Pressable>
          <Text style={s.storyName}>{own?.stories.length ? 'Your story' : 'Add'}</Text>
        </View>
        {others.map((group) => (
          <Pressable
            key={group.user.id}
            accessibilityRole="button"
            accessibilityLabel={`${group.user.displayName || group.user.username}'s stories${group.hasUnviewed ? ', unseen' : ''}`}
            onPress={() => open(group)}
            style={s.item}
          >
            <LinearGradient
              colors={
                group.hasUnviewed && group.hasCloseFriendsStory
                  ? ['#10b981', '#22c55e', '#14b8a6']
                  : group.hasUnviewed
                    ? ['#8b5cf6', '#d946ef', '#6366f1']
                    : ['#ffffff26', '#ffffff26']
              }
              style={[s.ring, !group.hasUnviewed && s.viewed]}
            >
              <View style={s.ringInner}>
                <Avatar
                  size={56}
                  name={group.user.displayName || group.user.username}
                  uri={group.user.avatar}
                />
              </View>
            </LinearGradient>
            <Text style={s.storyName} numberOfLines={1}>
              {group.user.displayName || group.user.username}
            </Text>
          </Pressable>
        ))}
        {query.isPending && query.fetchStatus !== 'paused' && (
          <ActivityIndicator color={colors.purple} style={s.loading} />
        )}
      </ScrollView>
      {query.isError && (
        <ErrorNotice
          message="Stories couldn't be loaded."
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
      {selected && <StoryViewer group={selected} userId={user.id} onClose={close} />}
      {creating && <CreateStory userId={user.id} isOnline={isOnline} onClose={close} />}
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 14, gap: 10, backgroundColor: '#12121699' },
  items: { gap: 16, paddingVertical: 2 },
  item: { width: 68, alignItems: 'center', gap: 7 },
  ownRing: { padding: 5, borderWidth: 1, borderColor: '#3f3f46', borderRadius: 35 },
  viewed: { opacity: 0.7 },
  ring: { padding: 2.5, borderRadius: 35 },
  ringInner: { padding: 2, borderRadius: 35, backgroundColor: '#09090b' },
  plus: {
    position: 'absolute',
    right: -4,
    top: 30,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#9333ea',
    borderWidth: 3,
    borderColor: colors.card,
  },
  storyName: { fontSize: 11, fontWeight: '500', color: '#d4d4d8', maxWidth: 68 },
  storyHint: { color: '#71717a', alignSelf: 'center', lineHeight: 21, fontSize: 12, marginLeft: 8 },
  loading: { paddingHorizontal: 20 },
  viewer: { flex: 1, padding: 16, gap: 12 },
  progress: { flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#3f3f46' },
  progressSelected: { backgroundColor: colors.purple },
  storyMedia: { flex: 1, position: 'relative' },
  full: { width: '100%', height: '100%' },
  caption: { color: colors.text, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overlay: { position: 'absolute', width: 140 },
  create: { padding: 20, gap: 20 },
  storyPreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 420,
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
  },
  captionInput: {
    minHeight: 80,
    color: colors.text,
    fontSize: 16,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 16,
  },
});
