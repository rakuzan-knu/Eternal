import * as React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Eye, Send, Trash2 } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  StoryOverlay,
  StoryPollResult,
  StoryViewersListResponse,
  StoryViewResponse,
  UserStoriesGroup,
} from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { getMobileApi } from '@/shared/api/client';
import { feedKeys } from '../model/queries';
import { removeStory, updateStory } from '../model/story';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';
import { StoryVideo } from './StoryVideo';
import { StoryAudio } from './StoryAudio';
import { StoryBackground, StoryImage, StoryLayer, StoryText, MusicSticker } from './StoryCanvas';
import { StoryMusicPlayer } from './StoryMusicEditor';
import { useStoryFonts } from './StoryFonts';
import { openWebSection } from './FeedDock';
import { StoryDrawing } from './StoryDrawing';
import { tr } from '@/shared/lib/i18n';

function StoryContent({
  story,
  userId,
  isOnline,
}: {
  story: StoryViewResponse;
  userId: string;
  isOnline: boolean;
}) {
  useStoryFonts();
  const client = useQueryClient();
  const key = feedKeys.stories(userId);
  const path = `/stories/${encodeURIComponent(story.id)}`;
  const own = story.authorId === userId;
  const viewport = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frameWidth = Math.min(
    viewport.width - 32,
    Math.max(180, ((viewport.height - insets.top - insets.bottom - (own ? 290 : 340)) * 9) / 16),
  );
  const audio = story.overlays?.find((layer) => layer.type === 'audio');
  const mainPhotoOverlay = story.overlays?.some(
    (overlay) => overlay.type === 'image' && overlay.isMainMedia,
  );
  const [reply, setReply] = React.useState('');
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [showViewers, setShowViewers] = React.useState(false);
  const [width, setWidth] = React.useState(300);
  const view = useMutation({
    onMutate: () => client.cancelQueries({ queryKey: key, exact: true }),
    mutationFn: () => getMobileApi().post(`${path}/view`),
    onSuccess: () =>
      client.setQueryData<UserStoriesGroup[]>(key, (groups) =>
        updateStory(groups, story.id, (value) => ({ ...value, hasViewed: true })),
      ),
  });
  const viewRef = React.useRef(view.mutate);
  React.useEffect(() => {
    if (isOnline && !own && !story.hasViewed) viewRef.current();
  }, [story.id, isOnline, own]);
  const react = useMutation({
    onMutate: () => client.cancelQueries({ queryKey: key, exact: true }),
    mutationFn: (emoji: string) =>
      getMobileApi().post<{ storyId: string; emoji: string; createdAt: string }>(`${path}/react`, {
        emoji,
      }),
    onSuccess: ({ data }) => {
      client.setQueryData<UserStoriesGroup[]>(key, (groups) =>
        updateStory(groups, data.storyId, (value) => {
          const counts = { ...value.reactionsCount };
          if (value.userReaction)
            counts[value.userReaction] = Math.max(0, (counts[value.userReaction] || 0) - 1);
          counts[data.emoji] = (counts[data.emoji] || 0) + 1;
          return { ...value, userReaction: data.emoji, reactionsCount: counts };
        }),
      );
      setMessage(tr('Reaction sent'));
    },
  });
  const send = useMutation({
    mutationFn: () => getMobileApi().post(`${path}/reply`, { text: reply.trim() }),
    onSuccess: () => {
      setReply('');
      setMessage(tr('Reply sent to chat'));
    },
  });
  const vote = useMutation({
    onMutate: () => client.cancelQueries({ queryKey: key, exact: true }),
    mutationFn: (optionIndex: number) =>
      getMobileApi().post<StoryPollResult>(`${path}/poll-vote`, { optionIndex }),
    onSuccess: ({ data }) =>
      client.setQueryData<UserStoriesGroup[]>(key, (groups) =>
        updateStory(groups, story.id, (value) => ({ ...value, pollResult: data })),
      ),
  });
  const remove = useMutation({
    onMutate: () => client.cancelQueries({ queryKey: key, exact: true }),
    mutationFn: () => getMobileApi().delete(path),
    onSuccess: () => {
      client.setQueryData<UserStoriesGroup[]>(key, (groups) => removeStory(groups, story.id));
      void client.invalidateQueries({ queryKey: key });
    },
  });
  const viewers = useQuery({
    queryKey: [...key, story.id, 'viewers'],
    queryFn: async ({ signal }) =>
      (await getMobileApi().get<StoryViewersListResponse>(`${path}/viewers`, { signal })).data,
    enabled: own && showViewers,
  });
  async function openLink(url: string) {
    if (!/^https?:\/\//i.test(url)) {
      setError(tr('This link cannot be opened.'));
      return;
    }
    try {
      await Linking.openURL(url);
      setError(null);
    } catch {
      setError(tr('This link could not be opened.'));
    }
  }
  function overlayContent(overlay: StoryOverlay) {
    switch (overlay.type) {
      case 'text':
        return <StoryText overlay={overlay} width={width} />;
      case 'caption':
        return <Text style={s.overlayText}>{overlay.text}</Text>;
      case 'image':
        return (
          <View style={{ borderRadius: overlay.borderRadius || 0, overflow: 'hidden' }}>
            <StoryImage
              uri={
                overlay.isMainMedia || !overlay.url || overlay.url.startsWith('blob:')
                  ? story.mediaUrl
                  : overlay.url
              }
              width={width * 0.75}
              height={Math.min(
                ((width * 16) / 9) * 0.8,
                (width * 0.75) / (overlay.aspectRatio || 1),
              )}
              filter={story.filter}
              label={tr('Story sticker')}
              onError={() => setError(tr('A story image could not be loaded.'))}
            />
          </View>
        );
      case 'poll':
        return (
          <View style={s.poll}>
            <Text style={s.pollQuestion}>{overlay.question}</Text>
            {overlay.options.map((option, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${option.text}${story.pollResult ? `, ${story.pollResult.options[i]?.percentage || 0}%` : ''}`}
                accessibilityState={{
                  selected: story.pollResult?.userVotedIndex === i,
                  disabled: !isOnline || vote.isPending || story.pollResult?.userVotedIndex === i,
                }}
                disabled={!isOnline || vote.isPending || story.pollResult?.userVotedIndex === i}
                onPress={() => vote.mutate(i)}
                style={[s.pollOption, story.pollResult?.userVotedIndex === i && s.voted]}
              >
                <Text style={s.pollOptionText}>{option.text}</Text>
                {story.pollResult && (
                  <Text style={s.pollOptionText}>
                    {Math.round(story.pollResult.options[i]?.percentage || 0)}%
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        );
      case 'link':
        return (
          <Button
            title={overlay.title}
            variant="secondary"
            onPress={() => {
              void openLink(overlay.url);
            }}
          />
        );
      case 'mention':
        return (
          <Button
            title={`@${overlay.username}`}
            variant="secondary"
            onPress={() => {
              void openWebSection(`/profile/${encodeURIComponent(overlay.username)}`, (failed) =>
                setError(failed ? tr('This profile could not be opened.') : null),
              );
            }}
          />
        );
      case 'audio':
        return <MusicSticker overlay={overlay} />;
      case 'drawing':
        return null;
    }
  }
  return (
    <>
      <View
        style={[s.media, { width: frameWidth, alignSelf: 'center' }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      >
        <StoryBackground
          value={
            story.backgroundColor ||
            (story.mediaUrl.startsWith('color:') ? story.mediaUrl.slice(6) : '#09090b')
          }
        />
        {!story.mediaUrl.startsWith('color:') &&
          (story.mediaType === 'IMAGE' ? (
            mainPhotoOverlay ? null : failed ? (
              <ErrorNotice message={tr("This story image couldn't be loaded.")} />
            ) : (
              <StoryImage
                uri={story.mediaUrl}
                width={width}
                height={(width * 16) / 9}
                filter={story.filter}
                label={story.caption || tr('Story photo')}
                onError={() => setFailed(true)}
              />
            )
          ) : story.mediaType === 'VOICE' ? (
            <StoryAudio
              uri={story.mediaUrl}
              active
              volume={audio?.type === 'audio' ? audio.videoVolume : 1}
              clipDurationSeconds={60}
              label={tr('Voice story')}
            />
          ) : (
            <StoryVideo
              uri={story.mediaUrl}
              active
              filter={story.filter}
              volume={audio?.type === 'audio' ? audio.videoVolume : 1}
              label={tr('Story video')}
            />
          ))}

        {story.overlays
          ?.filter((overlay) => overlay.type !== 'drawing' && overlay.type !== 'caption')
          .map((overlay) => (
            <StoryLayer key={overlay.id} overlay={overlay} width={width} height={(width * 16) / 9}>
              {overlayContent(overlay)}
            </StoryLayer>
          ))}
        {story.overlays?.map((overlay) =>
          overlay.type === 'drawing' ? (
            <View
              key={overlay.id}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { zIndex: overlay.zIndex }]}
            >
              <StoryDrawing overlay={overlay} width={width} />
            </View>
          ) : null,
        )}
      </View>
      {!!story.caption && <Text style={s.caption}>{story.caption}</Text>}
      {audio?.type === 'audio' && <StoryMusicPlayer overlay={audio} userId={userId} active />}
      {story.privacy === 'CLOSE_FRIENDS' && (
        <Text style={s.closeFriends}>{tr('Close friends')}</Text>
      )}
      {!isOnline && (
        <Text style={common.muted}>{tr("You're offline. Connect to react or reply.")}</Text>
      )}
      {view.isError && (
        <ErrorNotice
          message={tr("Your view couldn't be recorded.")}
          onRetry={() => view.mutate()}
        />
      )}
      {(react.isError || send.isError || vote.isError || remove.isError) && (
        <ErrorNotice message={tr('That action failed. Please try again.')} />
      )}
      {error && <ErrorNotice message={error} />}
      {message && (
        <Text accessibilityLiveRegion="polite" style={s.success}>
          {message}
        </Text>
      )}
      {own ? (
        <>
          <View style={s.ownerActions}>
            <Button
              fullWidth={false}
              title={`${story.viewsCount} views`}
              variant="ghost"
              leftIcon={<Eye color={colors.muted} size={18} />}
              onPress={() => setShowViewers((show) => !show)}
            />
            <IconButton
              label={tr('Delete story')}
              disabled={!isOnline || remove.isPending}
              onPress={() => setConfirmDelete(true)}
            >
              <Trash2 color={colors.danger} size={20} />
            </IconButton>
          </View>
          {confirmDelete && (
            <View style={s.poll}>
              <Text style={common.text}>{tr('Delete this story? This cannot be undone.')}</Text>
              <Button
                title={tr('Delete story permanently')}
                variant="danger"
                disabled={!isOnline}
                loading={remove.isPending}
                onPress={() => remove.mutate()}
              />
              <Button
                title={tr('Keep story')}
                variant="secondary"
                disabled={remove.isPending}
                onPress={() => setConfirmDelete(false)}
              />
            </View>
          )}
          {showViewers && (
            <View style={s.poll}>
              {viewers.isPending ? (
                <Text style={common.muted}>{tr('Loading viewers…')}</Text>
              ) : viewers.isError ? (
                <ErrorNotice
                  message={tr("Viewers couldn't be loaded.")}
                  onRetry={() => {
                    void viewers.refetch();
                  }}
                />
              ) : viewers.data?.viewers.length ? (
                viewers.data.viewers.map((item) => (
                  <View key={item.user.id} style={common.row}>
                    <Avatar
                      name={item.user.displayName || item.user.username}
                      uri={item.user.avatar}
                      size={32}
                    />
                    <Text style={common.text}>
                      {item.user.displayName || item.user.username} {item.reaction}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={common.muted}>{tr('No views yet.')}</Text>
              )}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={s.reactions}>
            {['❤️', '🔥', '😂', '👏', '😍'].map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={tr('React {emoji}', { emoji })}
                aria-pressed={story.userReaction === emoji}
                accessibilityState={{
                  selected: story.userReaction === emoji,
                  disabled: !isOnline || react.isPending,
                }}
                disabled={!isOnline || react.isPending}
                onPress={() => {
                  setMessage(null);
                  react.mutate(emoji);
                }}
                style={[s.reaction, story.userReaction === emoji && s.reactionSelected]}
              >
                <Text style={s.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.replyRow}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              maxLength={2000}
              editable={isOnline && !send.isPending}
              accessibilityLabel={tr('Reply to story')}
              placeholder={tr('Send a message…')}
              placeholderTextColor={colors.muted}
              style={s.reply}
            />
            <IconButton
              label={tr('Send story reply')}
              disabled={!isOnline || !reply.trim() || send.isPending}
              onPress={() => {
                setMessage(null);
                send.mutate();
              }}
            >
              <Send size={21} color={colors.purple} />
            </IconButton>
          </View>
        </>
      )}
    </>
  );
}

export function StoryViewer({
  group,
  userId,
  isOnline,
  onClose,
}: {
  group: UserStoriesGroup;
  userId: string;
  isOnline: boolean;
  onClose: () => void;
}) {
  const [id, setId] = React.useState(group.stories[0]?.id);
  const index = Math.max(
    0,
    group.stories.findIndex((item) => item.id === id),
  );
  const story = group.stories[index];
  React.useEffect(() => {
    if (!group.stories.length) onClose();
  }, [group.stories.length, onClose]);
  return (
    <Sheet title={group.user.displayName || group.user.username} onClose={onClose}>
      <ScrollView
        contentContainerStyle={s.viewer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={s.controls}>
          <IconButton
            label={tr('Previous story')}
            disabled={index === 0}
            onPress={() => setId(group.stories[index - 1].id)}
          >
            <ChevronLeft color={colors.text} />
          </IconButton>
          <View style={s.progressCenter}>
            <View style={s.progress}>
              {group.stories.map((item, i) => (
                <View key={item.id} style={[s.progressSegment, i <= index && s.progressSelected]} />
              ))}
            </View>
            <Text style={common.muted}>
              {index + 1} / {group.stories.length}
            </Text>
          </View>
          <IconButton
            label={tr('Next story')}
            onPress={() =>
              index < group.stories.length - 1 ? setId(group.stories[index + 1].id) : onClose()
            }
          >
            <ChevronRight color={colors.text} />
          </IconButton>
        </View>
        {story && <StoryContent key={story.id} story={story} userId={userId} isOnline={isOnline} />}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  viewer: { padding: 16, gap: 12 },
  progressCenter: { flex: 1, gap: 8, alignItems: 'center' },
  progress: { flexDirection: 'row', gap: 4, width: '100%' },
  progressTouch: { flex: 1, minHeight: 44, justifyContent: 'center' },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#3f3f46' },
  progressSelected: { backgroundColor: colors.purple },
  media: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
  },
  overlay: { position: 'absolute' },
  overlayText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#0009',
    padding: 8,
    borderRadius: 8,
  },
  poll: { padding: 12, borderRadius: 16, backgroundColor: '#202025', gap: 8 },
  pollQuestion: { color: 'white', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  pollOption: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff14',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  voted: { backgroundColor: '#9333ea55' },
  pollOptionText: { color: 'white', fontSize: 13, flexShrink: 1 },
  caption: { color: colors.text, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  closeFriends: { color: colors.green, fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ownerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reactions: { flexDirection: 'row', justifyContent: 'space-evenly', gap: 4 },
  reaction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  reactionSelected: { borderColor: colors.purple, backgroundColor: '#9333ea26' },
  emoji: { fontSize: 25 },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reply: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#ffffff1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
  },
  success: { color: colors.green, fontSize: 13 },
  audio: { height: 80 },
});
