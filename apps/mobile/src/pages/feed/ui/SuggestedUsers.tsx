import * as React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck, Sparkles } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserProfileDto } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { feedApi } from '../api/feedApi';
import { feedKeys } from '../model/queries';
import { Avatar, colors, common, ErrorNotice } from './primitives';

function Creator({ user, viewerId }: { user: UserProfileDto; viewerId: string }) {
  const client = useQueryClient();
  const follow = useMutation({
    mutationFn: () => feedApi.follow(user.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: feedKeys.posts(viewerId) });
    },
  });
  const following = user.isFollowing || follow.data?.status === 'ACCEPTED';
  const requested = follow.data?.status === 'PENDING';
  return (
    <View style={[common.card, s.creator]}>
      <Avatar name={user.displayName || user.username} uri={user.avatar} size={54} />
      <View style={s.name}>
        <Text style={s.nameText} numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        {user.isVerified && <BadgeCheck size={14} color={colors.purple} />}
      </View>
      <Text style={common.muted} numberOfLines={1}>
        @{user.username}
      </Text>
      <Button
        title={following ? 'Following' : requested ? 'Requested' : 'Follow'}
        variant={following || requested ? 'secondary' : 'purple'}
        size="sm"
        disabled={following || requested}
        loading={follow.isPending}
        onPress={() => follow.mutate()}
      />
      {follow.isError && <ErrorNotice message="Follow failed. Try again." />}
    </View>
  );
}

export function SuggestedUsers({ userId }: { userId: string }) {
  const query = useQuery({
    queryKey: feedKeys.suggestions(userId),
    queryFn: ({ signal }) => feedApi.suggestions(signal),
  });
  if (query.isPending) return <ActivityIndicator color={colors.purple} style={s.loader} />;
  if (query.isError)
    return (
      <ErrorNotice
        message="Creator suggestions couldn't be loaded."
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  const users = query.data.filter((user) => user.id !== userId);
  if (!users.length) return null;
  return (
    <View style={s.section}>
      <View style={common.row}>
        <Sparkles size={16} color={colors.purple} />
        <Text style={common.title}>Discover creators</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.creators}
      >
        {users.map((user) => (
          <Creator key={user.id} user={user} viewerId={userId} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  section: { gap: 14, paddingTop: 8 },
  creators: { gap: 12 },
  creator: { width: 160, alignItems: 'center', gap: 10, paddingVertical: 20 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nameText: { color: colors.text, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  loader: { padding: 24 },
});
