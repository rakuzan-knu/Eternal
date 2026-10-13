import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import type { UserSessionProfile } from '@social-network/shared-stores';
import type { UserStoriesGroup } from '@social-network/shared-contracts';
import { feedApi } from '../api/feedApi';
import { feedKeys } from '../model/queries';
import { Avatar, colors, common, ErrorNotice } from './primitives';
import { StoryViewer } from './StoryViewer';
import { CreateStory } from './CreateStory';
export { CreateStory } from './CreateStory';

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
      {selected && (
        <StoryViewer
          group={
            query.data?.find((group) => group.user.id === selected.user.id) || {
              ...selected,
              stories: [],
            }
          }
          userId={user.id}
          isOnline={isOnline}
          onClose={close}
        />
      )}
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
    right: 0,
    top: 38,
    width: 44,
    height: 44,
    alignItems: 'flex-end',
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
});
