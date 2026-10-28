import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import {
  ArrowLeft,
  ChevronRight,
  Hash,
  LockKeyhole,
  LogOut,
  MessagesSquare,
  Search,
  SearchX,
  ShieldX,
  UserPlus,
  Users,
} from 'lucide-react-native';
import type { CommunityChannelDto, CommunityMemberDto } from '@social-network/shared-contracts';
import { Button, Input } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import {
  canInvite,
  filterChannels,
  groupChannels,
  memberCountLabel,
  roleLabel,
} from '../model/communities';
import {
  useCommunity,
  useCommunityChannels,
  useCommunityMembers,
  useLeaveCommunity,
} from '../model/queries';
import { CommunityInviteSheet } from './CommunityInviteSheet';
import { CommunityAvatar, communityStyles, Placeholder, SectionHeader } from './parts';
import { screenStyles } from './CommunitiesScreen';
import { tr } from '@/shared/lib/i18n';

const CHANNEL_SEARCH_THRESHOLD = 8;

export function CommunityScreen({
  userId,
  communityId,
  isOnline,
  active,
  onBack,
  onLeft,
  onOpenProfile,
  onOpenChannel,
}: {
  userId: string;
  communityId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onLeft: () => void;
  onOpenProfile: (username: string) => void;
  onOpenChannel: (conversationId: string) => void;
}) {
  const community = useCommunity(userId, communityId);
  const channels = useCommunityChannels(userId, communityId);
  const leave = useLeaveCommunity(userId, communityId);
  const [filter, setFilter] = React.useState('');
  const [sheet, setSheet] = React.useState<'invite' | 'members' | null>(null);
  const [confirmLeave, setConfirmLeave] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const role = channels.data?.role;
  const isMember = !!channels.data;
  const denied =
    channels.isError &&
    axios.isAxiosError(channels.error) &&
    [403, 404].includes(channels.error.response?.status ?? 0);
  const allChannels = channels.data?.data ?? [];
  const groups = React.useMemo(
    () =>
      filterChannels(groupChannels(channels.data?.data ?? [], channels.data?.categories), filter),
    [channels.data, filter],
  );
  const name = community.data?.name ?? 'Community';

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${name} • Eternal`;
  }, [active, name]);

  async function refresh() {
    if (refreshing || !isOnline) return;
    setRefreshing(true);
    try {
      await Promise.all([community.refetch(), channels.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const openChannel = (channel: CommunityChannelDto) => onOpenChannel(channel.conversationId);

  const wasActive = React.useRef(active);
  React.useEffect(() => {
    if (active && !wasActive.current) void channels.refetch();
    wasActive.current = active;
  }, [active, channels]);

  const topBar = (
    <View style={screenStyles.topBar}>
      <IconButton label={tr('Back')} onPress={onBack}>
        <ArrowLeft size={22} color={colors.text} />
      </IconButton>
      <Text accessibilityRole="header" style={screenStyles.topTitle} numberOfLines={1}>
        {name}
      </Text>
      <View style={screenStyles.topSpacer} />
    </View>
  );

  if (community.isPending)
    return (
      <View style={screenStyles.screen} testID="mobile-community">
        {topBar}
        <ActivityIndicator
          color={colors.purple}
          style={s.loader}
          accessibilityLabel={tr('Loading community')}
        />
      </View>
    );

  if (community.isError || !community.data)
    return (
      <View style={screenStyles.screen} testID="mobile-community">
        {topBar}
        {axios.isAxiosError(community.error) && community.error.response?.status === 404 ? (
          <Placeholder
            Icon={ShieldX}
            title={tr("This community isn't available")}
            text={tr('It may have been deleted, or the link may be wrong.')}
            action={
              <Button
                title={tr('Back to communities')}
                variant="secondary"
                fullWidth={false}
                onPress={onBack}
              />
            }
          />
        ) : (
          <View style={s.padded}>
            <ErrorNotice
              message={tr("This community couldn't be loaded.")}
              onRetry={() => {
                void community.refetch();
              }}
            />
          </View>
        )}
      </View>
    );

  const info = community.data;

  const channelSection = (() => {
    if (channels.isPending)
      return (
        <View style={[communityStyles.surface, s.loadingSurface]}>
          <ActivityIndicator color={colors.purple} accessibilityLabel={tr('Loading channels')} />
        </View>
      );
    if (denied)
      return (
        <View style={communityStyles.surface}>
          <Placeholder
            Icon={LockKeyhole}
            title={tr('Join with an invitation')}
            text={tr(
              'Channels and members are visible to members only. Ask someone in this community for an invitation link.',
            )}
          />
        </View>
      );
    if (channels.isError)
      return (
        <ErrorNotice
          message={tr("Channels couldn't be loaded.")}
          onRetry={() => {
            void channels.refetch();
          }}
        />
      );
    if (!groups.length)
      return (
        <View style={communityStyles.surface}>
          {filter ? (
            <Placeholder
              Icon={SearchX}
              title={tr('No channels match “{term}”', { term: filter.trim() })}
              text={tr('Check the spelling or clear the filter.')}
              action={
                <Button
                  title={tr('Clear filter')}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => setFilter('')}
                />
              }
            />
          ) : (
            <Placeholder
              Icon={MessagesSquare}
              title={tr('No channels yet')}
              text={
                canInvite(role)
                  ? tr('Create channels from the web app.')
                  : tr('Channels will appear here once an admin creates them.')
              }
            />
          )}
        </View>
      );
    return groups.map((group) => (
      <View key={group.id} style={s.group}>
        {group.name && (
          <Text style={s.groupTitle} accessibilityRole="header">
            {group.name}
          </Text>
        )}
        <View style={communityStyles.surface}>
          {group.channels.map((channel, index) => (
            <React.Fragment key={channel.id}>
              {index > 0 && <View style={s.channelDivider} />}
              <ChannelRow channel={channel} onPress={() => openChannel(channel)} />
            </React.Fragment>
          ))}
        </View>
      </View>
    ));
  })();

  return (
    <View style={screenStyles.screen} testID="mobile-community">
      {topBar}
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            enabled={isOnline}
            tintColor={colors.purple}
            colors={[colors.purple]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        <View style={s.hero}>
          <CommunityAvatar name={info.name} uri={info.avatar} size={64} />
          <View style={common.flex}>
            <Text style={s.title} numberOfLines={2}>
              {info.name}
            </Text>
            <Text style={common.muted}>
              {memberCountLabel(info.memberCount)}
              {role
                ? ` · ${role === 'MEMBER' ? tr("You're a member") : tr("You're the {role}", { role: roleLabel(role).toLowerCase() })}`
                : ''}
            </Text>
          </View>
        </View>
        {!!info.description && <Text style={s.description}>{info.description}</Text>}
        {isMember && (
          <View style={s.actions}>
            {canInvite(role) && (
              <Button
                title={tr('Invite people')}
                variant="purple"
                size="sm"
                fullWidth={false}
                style={s.action}
                disabled={!isOnline}
                leftIcon={<UserPlus size={16} color="#fff" />}
                onPress={() => setSheet('invite')}
              />
            )}
            <Button
              title={tr('Members')}
              variant="secondary"
              size="sm"
              fullWidth={false}
              style={s.action}
              leftIcon={<Users size={16} color={colors.text} />}
              onPress={() => setSheet('members')}
            />
          </View>
        )}
        <View style={s.block}>
          <SectionHeader title={tr('Channels')} />
          {isMember && allChannels.length > CHANNEL_SEARCH_THRESHOLD && (
            <Input
              value={filter}
              onChangeText={setFilter}
              placeholder={tr('Filter channels')}
              showClearButton
              onClear={() => setFilter('')}
              leftElement={<Search size={18} color={colors.muted} />}
              accessibilityLabel={tr('Filter channels')}
            />
          )}
          {channelSection}
        </View>
        {isMember && role !== 'OWNER' && (
          <View style={s.block}>
            {confirmLeave ? (
              <View style={s.confirm} accessibilityRole="alert">
                <Text style={common.text}>Leave {info.name}?</Text>
                <Text style={common.muted}>
                  {tr(
                    "You'll lose access to its channels. You'll need a new invitation to come back.",
                  )}
                </Text>
                {leave.isError && (
                  <ErrorNotice message={tr("You couldn't leave this community. Try again.")} />
                )}
                <View style={s.actions}>
                  <Button
                    title={tr('Leave community')}
                    variant="danger"
                    size="sm"
                    fullWidth={false}
                    style={s.action}
                    loading={leave.isPending}
                    disabled={!isOnline}
                    onPress={() => leave.mutate(undefined, { onSuccess: onLeft })}
                  />
                  <Button
                    title={tr('Stay')}
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    style={s.action}
                    disabled={leave.isPending}
                    onPress={() => setConfirmLeave(false)}
                  />
                </View>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityHint={tr('Asks you to confirm')}
                onPress={() => setConfirmLeave(true)}
                style={({ pressed }) => [s.leave, pressed && common.pressed]}
              >
                <LogOut size={20} color={colors.danger} />
                <Text style={s.leaveText}>{tr('Leave community')}</Text>
              </Pressable>
            )}
          </View>
        )}
        {role === 'OWNER' && (
          <Text style={s.hint}>
            {tr(
              'You own this community. Transfer ownership from the web app before you can leave.',
            )}
          </Text>
        )}
      </ScrollView>
      {sheet === 'invite' && (
        <CommunityInviteSheet
          communityId={communityId}
          communityName={info.name}
          isOnline={isOnline}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'members' && (
        <MembersSheet
          userId={userId}
          communityId={communityId}
          onClose={() => setSheet(null)}
          onOpenProfile={(username) => {
            setSheet(null);
            onOpenProfile(username);
          }}
        />
      )}
    </View>
  );
}

function ChannelRow({ channel, onPress }: { channel: CommunityChannelDto; onPress: () => void }) {
  const unread = channel.unreadCount ?? 0;
  const Icon = channel.isPrivate ? LockKeyhole : Hash;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${channel.isPrivate ? tr('Private channel') : 'Channel'} ${channel.name}${unread ? `, ${unread} unread` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [s.channel, pressed && s.pressed]}
    >
      <Icon size={18} color={unread ? colors.text : colors.muted} />
      <View style={common.flex}>
        <Text style={[s.channelName, unread > 0 && s.unreadName]} numberOfLines={1}>
          {channel.name}
        </Text>
        {!!channel.description && (
          <Text style={common.muted} numberOfLines={1}>
            {channel.description}
          </Text>
        )}
      </View>
      {unread > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
      <ChevronRight size={16} color={colors.muted} />
    </Pressable>
  );
}

function MembersSheet({
  userId,
  communityId,
  onClose,
  onOpenProfile,
}: {
  userId: string;
  communityId: string;
  onClose: () => void;
  onOpenProfile: (username: string) => void;
}) {
  const members = useCommunityMembers(userId, communityId, true);
  const items = members.data?.pages.flatMap((page) => page.data) ?? [];
  return (
    <Sheet title={tr('Members')} onClose={onClose}>
      <FlatList
        data={items}
        keyExtractor={(member) => member.userId}
        contentContainerStyle={s.memberList}
        renderItem={({ item }) => (
          <MemberRow member={item} onPress={() => onOpenProfile(item.username)} />
        )}
        ItemSeparatorComponent={() => <View style={s.memberDivider} />}
        ListEmptyComponent={
          members.isPending ? (
            <ActivityIndicator
              color={colors.purple}
              style={s.loader}
              accessibilityLabel={tr('Loading members')}
            />
          ) : members.isError ? (
            <ErrorNotice
              message={tr("Members couldn't be loaded.")}
              onRetry={() => {
                void members.refetch();
              }}
            />
          ) : (
            <Placeholder
              Icon={Users}
              title={tr('No members to show')}
              text={tr('Members will appear here as they join.')}
            />
          )
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (members.hasNextPage && !members.isFetching && !members.isError)
            void members.fetchNextPage();
        }}
        ListFooterComponent={
          members.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.purple}
              accessibilityLabel={tr('Loading more members')}
            />
          ) : members.isFetchNextPageError ? (
            <ErrorNotice
              message={tr("More members couldn't be loaded.")}
              onRetry={() => {
                void members.fetchNextPage();
              }}
            />
          ) : null
        }
      />
    </Sheet>
  );
}

function MemberRow({ member, onPress }: { member: CommunityMemberDto; onPress: () => void }) {
  const display = member.displayName || member.username;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${display}, ${roleLabel(member.role)}`}
      accessibilityHint={tr('Opens their profile')}
      onPress={onPress}
      style={({ pressed }) => [s.member, pressed && s.pressed]}
    >
      <Avatar name={display} uri={member.avatar} size={40} />
      <View style={common.flex}>
        <Text style={common.title} numberOfLines={1}>
          {display}
        </Text>
        <Text style={common.muted} numberOfLines={1}>
          @{member.username}
        </Text>
      </View>
      {member.role !== 'MEMBER' && (
        <View style={s.roleChip}>
          <Text style={s.roleText}>{roleLabel(member.role)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 20 },
  padded: { padding: 16 },
  loader: { padding: 40 },
  loadingSurface: { padding: 24 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  description: { color: colors.text, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  block: { gap: 12 },
  group: { gap: 8 },
  groupTitle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginLeft: 4 },
  channel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 56,
    paddingVertical: 8,
  },
  channelDivider: { height: 1, backgroundColor: colors.border, marginLeft: 44 },
  channelName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  unreadName: { fontWeight: '700' },
  pressed: { backgroundColor: '#ffffff08' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  leave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff05',
  },
  leaveText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  confirm: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  memberList: { padding: 16, flexGrow: 1 },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 8,
  },
  memberDivider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#a855f71a',
  },
  roleText: { color: '#d8b4fe', fontSize: 12, fontWeight: '600' },
});
