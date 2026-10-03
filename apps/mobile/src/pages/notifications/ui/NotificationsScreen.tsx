import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AtSign,
  ArrowLeft,
  Bell,
  CheckCheck,
  CheckCircle2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Repeat2,
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  NotificationFilterType,
  NotificationResponseDto,
  NotificationType,
} from '@social-network/shared-contracts';
import type { UserSessionProfile } from '@social-network/shared-stores';
import { Button } from '@/shared/ui';
import { feedApi } from '../../feed/api/feedApi';
import { relativeTime } from '../../feed/model/feed';
import { feedKeys } from '../../feed/model/queries';
import { PostCard } from '../../feed/ui/PostCard';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import { openWebSection } from '../../feed/ui/FeedDock';
import {
  notificationFilters,
  notificationTarget,
  uniqueNotifications,
} from '../model/notifications';
import {
  notificationsKeys,
  useNotificationActions,
  useNotifications,
  useUnreadNotifications,
} from '../model/queries';

function notificationBadge(type: NotificationType) {
  switch (type) {
    case 'LIKE_POST':
    case 'LIKE_COMMENT':
      return { Icon: Heart, color: '#f43f5e' };
    case 'COMMENT':
      return { Icon: MessageCircle, color: '#3b82f6' };
    case 'FOLLOW':
      return { Icon: UserPlus, color: '#a855f7' };
    case 'REPOST':
      return { Icon: Repeat2, color: '#10b981' };
    case 'MENTION':
      return { Icon: AtSign, color: '#f59e0b' };
    case 'SYSTEM_VERIFIED':
      return { Icon: CheckCircle2, color: '#06b6d4' };
    default:
      return { Icon: Sparkles, color: '#8b5cf6' };
  }
}

function PostDetails({
  target,
  userId,
  onClose,
}: {
  target: Extract<ReturnType<typeof notificationTarget>, { kind: 'post' }>;
  userId: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: feedKeys.detail(userId, target.id),
    queryFn: ({ signal }) => feedApi.post(target.id, signal),
  });
  return (
    <View style={s.screen}>
      <View style={s.titleRow}>
        <IconButton label="Back to notifications" onPress={onClose}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.title}>
          Post
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.details}>
        {query.isPending ? (
          query.fetchStatus === 'paused' ? (
            <Text style={common.text}>Connect to the internet to open this post.</Text>
          ) : (
            <ActivityIndicator accessibilityLabel="Loading post" color={colors.purple} />
          )
        ) : query.isError ? (
          <ErrorNotice
            message="This post couldn't be opened. It may have been removed or made private."
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <PostCard
            post={query.data}
            userId={userId}
            active
            initialCommentsOpen={!!target.commentId}
            onHide={onClose}
          />
        )}
      </ScrollView>
    </View>
  );
}

export function NotificationsScreen({
  user,
  isOnline,
  onBack,
  onNavigationError,
}: {
  user: UserSessionProfile;
  isOnline: boolean;
  onBack: () => void;
  onNavigationError: (failed: boolean) => void;
}) {
  const [filter, setFilter] = React.useState<NotificationFilterType>('all');
  const [selected, setSelected] = React.useState<Extract<
    ReturnType<typeof notificationTarget>,
    { kind: 'post' }
  > | null>(null);
  const [menu, setMenu] = React.useState<NotificationResponseDto | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    if (!selected) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => subscription.remove();
  }, [selected]);
  const query = useNotifications(user.id, filter);
  const unread = useUnreadNotifications(user.id);
  const actions = useNotificationActions(user.id);
  const busy = useIsMutating({ mutationKey: notificationsKeys.root(user.id) }) > 0;
  const client = useQueryClient();
  const items = uniqueNotifications(query.data);
  const counts = unread.data ?? query.data?.pages.at(-1)?.unreadCounts;
  const currentFilter = notificationFilters.find((item) => item.type === filter);
  const filterUnread = currentFilter && counts ? counts[currentFilter.count] : 0;

  async function refresh() {
    if (!isOnline || refreshing || query.isFetching || busy) return;
    setRefreshing(true);
    try {
      await Promise.all([
        query.refetch(),
        client.invalidateQueries({ queryKey: notificationsKeys.unread(user.id) }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }
  function open(item: NotificationResponseDto) {
    if (!item.isRead && isOnline) actions.mutate({ kind: 'read', id: item.id });
    const target = notificationTarget(item, user.username);
    if (target.kind === 'post') setSelected(target);
    else if (target.kind === 'web') void openWebSection(target.path, onNavigationError);
  }

  if (selected)
    return (
      <PostDetails
        key={`${selected.id}:${selected.commentId || ''}`}
        target={selected}
        userId={user.id}
        onClose={() => setSelected(null)}
      />
    );

  return (
    <View style={s.screen} testID="mobile-notifications">
      <View style={s.pageHeader}>
        <View style={s.titleRow}>
          <IconButton label="Back to feed" onPress={onBack}>
            <ArrowLeft size={22} color={colors.text} />
          </IconButton>
          <Text accessibilityRole="header" style={s.title}>
            Notifications
          </Text>
          {!!counts?.total && (
            <View style={s.newBadge}>
              <Text style={s.badgeText}>{counts.total > 99 ? '99+' : counts.total} new</Text>
            </View>
          )}
        </View>
        {filterUnread > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              filter === 'all'
                ? 'Mark all notifications as read'
                : `Mark all ${currentFilter?.label.toLowerCase()} as read`
            }
            disabled={!isOnline || busy}
            onPress={() => actions.mutate({ kind: 'readAll', filter })}
            style={[s.markAll, (!isOnline || busy) && s.disabled]}
          >
            <CheckCheck size={17} color="#c084fc" />
            <Text style={s.markText}>
              {actions.isPending && actions.variables?.kind === 'readAll'
                ? 'Marking read…'
                : 'Mark all read'}
            </Text>
          </Pressable>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filters}
        contentContainerStyle={s.filterContent}
        accessibilityLabel="Notification filters"
      >
        {notificationFilters.map((item) => {
          const active = item.type === filter;
          const count = counts?.[item.count] ?? 0;
          return (
            <Pressable
              key={item.type}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}${active ? ', selected' : ''}${count ? `, ${count} unread` : ''}`}
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item.type)}
              style={[s.filter, active && s.activeFilter]}
            >
              <Text style={[s.filterText, active && s.activeFilterText]}>{item.label}</Text>
              {count > 0 && (
                <View style={s.filterCount}>
                  <Text style={s.filterCountText}>{count > 99 ? '99+' : count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      {actions.isError && (
        <View style={s.error}>
          <ErrorNotice
            message="The notification couldn't be updated. Please try again."
            onRetry={() => {
              if (actions.variables) actions.mutate(actions.variables);
            }}
          />
        </View>
      )}
      <FlatList
        key={filter}
        data={items}
        keyExtractor={(item) => item.id}
        style={common.flex}
        contentContainerStyle={s.list}
        initialNumToRender={12}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            enabled={isOnline && !busy}
            tintColor={colors.purple}
            colors={[colors.purple]}
          />
        }
        ListHeaderComponent={
          <View style={s.recent}>
            <Text style={s.recentLabel}>RECENT</Text>
            {items.length > 0 && <Text style={common.muted}>{items.length} loaded</Text>}
          </View>
        }
        renderItem={({ item, index }) => {
          const { Icon, color } = notificationBadge(item.type);
          const name = item.actor?.displayName || item.actor?.username || 'Eternal';
          const text = item.actionText || 'You have a new notification';
          const preview = item.story || item.post;
          const mediaUrl = preview?.mediaUrl;
          return (
            <View
              style={[s.row, !item.isRead && s.unreadRow, index === items.length - 1 && s.lastRow]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${text}. ${item.isRead ? '' : 'Unread. '}${relativeTime(item.createdAt)} ago`}
                accessibilityHint="Opens the related content when available"
                onPress={() => open(item)}
                style={s.rowContent}
              >
                <View style={s.avatar}>
                  <Avatar name={name} uri={item.actor?.avatar} size={44} />
                  <View style={[s.typeBadge, { backgroundColor: color }]}>
                    <Icon size={11} color="white" />
                  </View>
                </View>
                <View style={common.flex}>
                  <Text style={s.actionText}>
                    {text.startsWith(name) ? (
                      <>
                        <Text style={s.actorName}>{name}</Text>
                        {text.slice(name.length)}
                      </>
                    ) : (
                      text
                    )}
                  </Text>
                  <View style={s.timeRow}>
                    {!item.isRead && <View style={s.unreadDot} />}
                    <Text style={common.muted}>{relativeTime(item.createdAt)}</Text>
                  </View>
                </View>
                {!!mediaUrl && preview?.mediaType !== 'VIDEO' && !mediaUrl.startsWith('color:') && (
                  <Image
                    source={{ uri: mediaUrl }}
                    style={s.thumbnail}
                    accessibilityLabel={item.story ? 'Story preview' : 'Post preview'}
                  />
                )}
              </Pressable>
              <IconButton
                label={`Notification options: ${text}`}
                onPress={() => {
                  setConfirmDelete(false);
                  setMenu(item);
                }}
              >
                <MoreHorizontal size={19} color={colors.muted} />
              </IconButton>
            </View>
          );
        }}
        ListEmptyComponent={
          query.isPending ? (
            query.fetchStatus === 'paused' ? (
              <View style={s.empty}>
                <Bell size={28} color={colors.purple} />
                <Text style={common.title}>You're offline</Text>
                <Text style={s.emptyText}>Connect to load your notifications.</Text>
              </View>
            ) : (
              <View
                accessibilityLabel="Loading notifications"
                accessibilityState={{ busy: true }}
                aria-busy
                style={s.empty}
              >
                <ActivityIndicator color={colors.purple} />
                <Text style={common.muted}>Loading notifications…</Text>
              </View>
            )
          ) : query.isError ? (
            <View style={s.error}>
              <ErrorNotice
                message="Notifications couldn't be loaded."
                onRetry={() => {
                  void query.refetch();
                }}
              />
            </View>
          ) : (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Bell size={24} color="#c084fc" />
              </View>
              <Text style={common.title}>
                {filter === 'all'
                  ? 'No notifications yet'
                  : `No ${currentFilter?.label.toLowerCase()} yet`}
              </Text>
              <Text style={s.emptyText}>
                When someone likes, comments, mentions you, or follows your profile, you'll see it
                here.
              </Text>
            </View>
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (isOnline && query.hasNextPage && !query.isFetching && !query.isError && !busy)
            void query.fetchNextPage();
        }}
        ListFooterComponent={
          <View style={s.footer}>
            {query.isRefetchError && items.length > 0 && (
              <ErrorNotice
                message="Notifications couldn't be refreshed. Previously loaded activity is shown."
                onRetry={() => {
                  void query.refetch();
                }}
              />
            )}
            {query.isFetchingNextPage && (
              <ActivityIndicator
                accessibilityLabel="Loading more notifications"
                color={colors.purple}
              />
            )}
            {query.isFetchNextPageError && (
              <ErrorNotice
                message="More notifications couldn't be loaded."
                onRetry={() => {
                  void query.fetchNextPage();
                }}
              />
            )}
            {query.hasNextPage && !query.isFetching && !query.isError && (
              <Button
                title="Load more notifications"
                variant="ghost"
                disabled={!isOnline || busy}
                onPress={() => {
                  void query.fetchNextPage();
                }}
              />
            )}
          </View>
        }
      />
      {menu && (
        <Sheet
          title={confirmDelete ? 'Delete notification?' : 'Notification options'}
          closeDisabled={busy}
          onClose={() => setMenu(null)}
        >
          <View style={s.details}>
            <Text style={common.text}>{menu.actionText}</Text>
            {actions.isError && (
              <ErrorNotice message="The notification couldn't be updated. Please try again." />
            )}
            {confirmDelete ? (
              <>
                <Text style={common.muted}>This notification will be permanently removed.</Text>
                <Button
                  title="Delete notification"
                  variant="danger"
                  loading={busy}
                  disabled={!isOnline}
                  leftIcon={<Trash2 size={18} color="white" />}
                  onPress={() =>
                    actions.mutate(
                      { kind: 'delete', id: menu.id },
                      { onSuccess: () => setMenu(null) },
                    )
                  }
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => setConfirmDelete(false)}
                />
              </>
            ) : (
              <>
                {!menu.isRead && (
                  <Button
                    title="Mark as read"
                    variant="secondary"
                    disabled={!isOnline || busy}
                    onPress={() =>
                      actions.mutate(
                        { kind: 'read', id: menu.id },
                        { onSuccess: () => setMenu(null) },
                      )
                    }
                  />
                )}
                <Button
                  title="Delete notification"
                  variant="secondary"
                  disabled={!isOnline || busy}
                  leftIcon={<Trash2 size={18} color={colors.danger} />}
                  onPress={() => setConfirmDelete(true)}
                />
              </>
            )}
          </View>
        </Sheet>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  pageHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', flexShrink: 1 },
  newBadge: {
    marginLeft: 4,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#a855f74d',
    backgroundColor: '#a855f726',
  },
  badgeText: { color: '#d8b4fe', fontSize: 11, fontWeight: '600' },
  markAll: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff08',
    borderWidth: 1,
    borderColor: colors.border,
  },
  markText: { color: '#d1d5db', fontSize: 12, fontWeight: '500' },
  filters: { flexGrow: 0, marginBottom: 16 },
  filterContent: { gap: 8, paddingHorizontal: 16 },
  filter: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#121216',
  },
  activeFilter: { backgroundColor: '#9333ea4d', borderColor: '#a855f780' },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  activeFilterText: { color: '#e9d5ff', fontWeight: '600' },
  filterCount: {
    backgroundColor: '#a855f733',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  filterCountText: { color: '#e9d5ff', fontSize: 10, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  recent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#17171c',
    borderWidth: 1,
    borderColor: '#ffffff14',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  recentLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#ffffff0d',
    backgroundColor: '#121216',
  },
  unreadRow: { backgroundColor: '#171020' },
  lastRow: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  rowContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  avatar: { width: 44, height: 44 },
  typeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#121216',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: '#d1d5db', fontSize: 13, lineHeight: 20 },
  actorName: { color: colors.text, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  unreadDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.purple },
  thumbnail: { width: 36, height: 44, borderRadius: 8, backgroundColor: '#26262c' },
  empty: {
    alignItems: 'center',
    padding: 28,
    gap: 12,
    backgroundColor: '#121216',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a855f733',
    backgroundColor: '#a855f71a',
  },
  emptyText: { color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center' },
  error: { padding: 16 },
  footer: { gap: 12, paddingTop: 12 },
  details: { padding: 20, gap: 16 },
  disabled: { opacity: 0.4 },
});
