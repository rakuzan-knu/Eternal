import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, BadgeCheck, Lock, UserPlus, Users, WifiOff } from 'lucide-react-native';
import { Button } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import type { ConnectionKind, ConnectionUser } from '../api/connectionsApi';
import {
  rowFollowState,
  uniqueUsers,
  useConnections,
  useFollowRequests,
  useRemoveFollower,
  useRequestDecision,
  useToggleFollow,
} from '../model/connections';
import { tr } from '@/shared/lib/i18n';

export type ConnectionsTab = ConnectionKind | 'requests';

export function ConnectionsScreen({
  viewerId,
  userId,
  username,
  initialTab,
  isOnline,
  active,
  onBack,
  onOpenProfile,
}: {
  viewerId: string;
  userId: string;
  username: string;
  initialTab: ConnectionsTab;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenProfile: (username: string) => void;
}) {
  const own = viewerId === userId;
  const [tab, setTab] = React.useState<ConnectionsTab>(initialTab);
  const followers = useConnections(viewerId, userId, 'followers', tab === 'followers');
  const following = useConnections(viewerId, userId, 'following', tab === 'following');
  const requests = useFollowRequests(viewerId, own && tab === 'requests');
  const query = tab === 'followers' ? followers : tab === 'following' ? following : requests;
  const users = React.useMemo(() => uniqueUsers(query.data), [query.data]);
  const tabs: { id: ConnectionsTab; label: string }[] = [
    { id: 'followers', label: tr('Followers') },
    { id: 'following', label: tr('Following') },
    ...(own ? [{ id: 'requests' as const, label: tr('Requests') }] : []),
  ];

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `@${username} • Eternal`;
  }, [active, username]);

  const empty = (() => {
    if (query.isPending)
      return query.fetchStatus === 'paused' ? (
        <Placeholder
          Icon={WifiOff}
          title={tr("You're offline")}
          text={tr('Connect to the internet to load this list.')}
        />
      ) : (
        <ActivityIndicator
          color={colors.purple}
          style={s.loader}
          accessibilityLabel={tr('Loading')}
        />
      );
    if (query.isError) {
      const forbidden =
        (query.error as { response?: { status?: number } })?.response?.status === 403;
      return forbidden ? (
        <Placeholder
          Icon={Lock}
          title={tr('This list is private')}
          text={tr('Follow this account to see who they follow and who follows them.')}
        />
      ) : (
        <View style={s.padded}>
          <ErrorNotice
            message={tr("This list couldn't be loaded.")}
            onRetry={() => {
              void query.refetch();
            }}
          />
        </View>
      );
    }
    if (tab === 'requests')
      return (
        <Placeholder
          Icon={UserPlus}
          title={tr('No follow requests')}
          text={tr("When someone asks to follow your private account, you'll approve them here.")}
        />
      );
    return tab === 'followers' ? (
      <Placeholder
        Icon={Users}
        title={tr('No followers yet')}
        text={
          own
            ? tr('When people follow you, they’ll appear here.')
            : tr('Nobody follows this account yet.')
        }
      />
    ) : (
      <Placeholder
        Icon={Users}
        title={tr('Not following anyone')}
        text={
          own
            ? tr('Find people to follow from Search.')
            : tr('This account isn’t following anyone yet.')
        }
      />
    );
  })();

  return (
    <View style={s.screen} testID="mobile-connections">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.topTitle} numberOfLines={1}>
          @{username}
        </Text>
        <View style={s.spacer} />
      </View>
      <View style={s.tabs} accessibilityRole="tablist">
        {tabs.map(({ id, label }) => {
          const selected = id === tab;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              aria-selected={selected}
              onPress={() => setTab(id)}
              style={({ pressed }) => [s.tab, pressed && common.pressed]}
            >
              <Text style={[s.tabText, selected && s.tabTextActive]}>{label}</Text>
              <View style={[s.indicator, selected && s.indicatorActive]} />
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={users}
        keyExtractor={(user) => user.id}
        contentContainerStyle={s.content}
        ItemSeparatorComponent={() => <View style={s.divider} />}
        renderItem={({ item }) => (
          <ConnectionRow
            user={item}
            viewerId={viewerId}
            mode={
              tab === 'requests' ? 'request' : own && tab === 'followers' ? 'ownFollower' : 'follow'
            }
            isOnline={isOnline}
            onOpenProfile={onOpenProfile}
          />
        )}
        ListEmptyComponent={empty}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetching && !query.isError && isOnline)
            void query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.purple}
              style={s.loader}
              accessibilityLabel={tr('Loading more')}
            />
          ) : null
        }
      />
    </View>
  );
}

const ConnectionRow = React.memo(function ConnectionRow({
  user,
  viewerId,
  mode,
  isOnline,
  onOpenProfile,
}: {
  user: ConnectionUser;
  viewerId: string;
  mode: 'follow' | 'ownFollower' | 'request';
  isOnline: boolean;
  onOpenProfile: (username: string) => void;
}) {
  const toggle = useToggleFollow(viewerId);
  const decide = useRequestDecision(viewerId);
  const remove = useRemoveFollower(viewerId);
  const [confirming, setConfirming] = React.useState(false);
  const state = rowFollowState(user, viewerId);
  const name = user.displayName || user.username;
  const failed = toggle.isError || decide.isError || remove.isError;

  React.useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  let action: React.ReactNode = null;
  if (mode === 'request') {
    action = (
      <View style={s.actions}>
        <Button
          title={tr('Accept')}
          variant="purple"
          size="sm"
          fullWidth={false}
          loading={decide.isPending && decide.variables?.accept}
          disabled={!isOnline || decide.isPending}
          onPress={() => decide.mutate({ user, accept: true })}
        />
        <Button
          title={tr('Decline')}
          variant="secondary"
          size="sm"
          fullWidth={false}
          disabled={!isOnline || decide.isPending}
          onPress={() => decide.mutate({ user, accept: false })}
        />
      </View>
    );
  } else if (mode === 'ownFollower') {
    action = (
      <Button
        title={confirming ? tr('Remove?') : tr('Remove')}
        variant={confirming ? 'danger' : 'secondary'}
        size="sm"
        fullWidth={false}
        loading={remove.isPending}
        disabled={!isOnline}
        accessibilityHint={confirming ? tr('Removes this follower') : tr('Tap again to confirm')}
        onPress={() => (confirming ? remove.mutate(user) : setConfirming(true))}
      />
    );
  } else if (state !== 'self') {
    const unfollowing = state !== 'none';
    action = (
      <Button
        title={
          confirming
            ? state === 'pending'
              ? tr('Cancel request?')
              : tr('Unfollow?')
            : state === 'following'
              ? tr('Following|button')
              : state === 'pending'
                ? tr('Requested')
                : tr('Follow')
        }
        variant={confirming ? 'danger' : unfollowing ? 'secondary' : 'purple'}
        size="sm"
        fullWidth={false}
        loading={toggle.isPending}
        disabled={!isOnline}
        accessibilityHint={
          unfollowing ? (confirming ? 'Confirms' : tr('Tap again to confirm')) : undefined
        }
        onPress={() => {
          if (unfollowing && !confirming) return setConfirming(true);
          setConfirming(false);
          toggle.mutate(user);
        }}
      />
    );
  }

  return (
    <View>
      <View style={s.row}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={tr('{name}. Open profile', {
            name:
              user.followsYou && mode !== 'ownFollower'
                ? tr('{name}, follows you', { name: `${name}, @${user.username}` })
                : `${name}, @${user.username}`,
          })}
          onPress={() => onOpenProfile(user.username)}
          style={({ pressed }) => [s.identity, pressed && common.pressed]}
        >
          <Avatar name={name} uri={user.avatar} size={48} />
          <View style={common.flex}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {name}
              </Text>
              {user.isVerified && <BadgeCheck size={15} color={colors.purple} />}
            </View>
            <Text style={common.muted} numberOfLines={1}>
              @{user.username}
              {user.followsYou && mode !== 'ownFollower' ? ` · ${tr('Follows you')}` : ''}
            </Text>
          </View>
        </Pressable>
        {action}
      </View>
      {failed && (
        <View style={s.rowError}>
          <ErrorNotice message={tr("That didn't work. Check your connection and try again.")} />
        </View>
      )}
    </View>
  );
});

function Placeholder({ Icon, title, text }: { Icon: typeof Users; title: string; text: string }) {
  return (
    <View style={s.placeholder}>
      <View style={s.placeholderIcon}>
        <Icon size={24} color={colors.purple} />
      </View>
      <Text style={[common.title, s.center]}>{title}</Text>
      <Text style={s.placeholderText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  spacer: { width: 44 },
  topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  indicator: { position: 'absolute', bottom: -1, left: 16, right: 16, height: 2, borderRadius: 1 },
  indicatorActive: { backgroundColor: colors.purple },
  content: { paddingBottom: 24, flexGrow: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 68,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    borderRadius: 12,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  rowError: { paddingHorizontal: 16, paddingBottom: 8 },
  padded: { padding: 16 },
  loader: { padding: 24 },
  placeholder: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 32 },
  placeholderIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f71a',
    marginBottom: 4,
  },
  center: { textAlign: 'center' },
  placeholderText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },
});
