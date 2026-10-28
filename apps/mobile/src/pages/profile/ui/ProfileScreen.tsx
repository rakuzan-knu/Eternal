import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import {
  ArrowLeft,
  Clapperboard,
  Lock,
  Menu,
  Repeat2,
  SquarePen,
  Bookmark,
  UserX,
} from 'lucide-react-native';
import type { PostResponseDto } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { webOrigin } from '@/shared/api/client';
import { uniquePosts } from '../../feed/model/feed';
import { useFeed } from '../../feed/model/queries';
import { colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { PostCard } from '../../feed/ui/PostCard';
import { openWebSection } from '../../feed/ui/FeedDock';
import { shareLink } from '../../feed/ui/shareLink';
import { ReelGrid } from '../../reels/ui/ReelGrid';
import { useUserReels } from '../../reels/model/queries';
import { uniqueReels } from '../../reels/model/reels';
import { isContentLocked, isNotFound, profileTabs, type ProfileTab } from '../model/profile';
import { useFollowProfile, useProfile, useProfilePosts } from '../model/queries';
import { ProfileHero } from './ProfileHero';
import { useOpenDirect } from '../../chat/model/queries';
import { useFollowRequestCount } from '../model/connections';
import { tr } from '@/shared/lib/i18n';

export function ProfileScreen({
  userId,
  viewerUsername,
  username,
  isOnline,
  active,
  onBack,
  onOpenMenu,
  onOpenReel,
  onOpenChat,
  onOpenConnections,
  onEditProfile,
  onNavigationError,
}: {
  userId: string;
  viewerUsername: string;
  username: string;
  isOnline: boolean;
  active: boolean;
  onBack?: () => void;
  onOpenMenu?: () => void;
  onOpenReel: (authorId: string, index: number) => void;
  onOpenChat?: (conversationId: string) => void;
  onOpenConnections?: (
    userId: string,
    username: string,
    tab: 'followers' | 'following' | 'requests',
  ) => void;
  onEditProfile?: () => void;
  onNavigationError: (failed: boolean) => void;
}) {
  const profileQuery = useProfile(userId, username);
  const openDirect = useOpenDirect();
  const ownCandidate = username === viewerUsername;
  const requestCount = useFollowRequestCount(userId, ownCandidate && active);
  const profile = profileQuery.data;
  const isOwn = !!profile && (profile.id === userId || profile.username === viewerUsername);
  const locked = !!profile && isContentLocked(profile, isOwn);
  const [tab, setTab] = React.useState<ProfileTab>('posts');
  const [refreshing, setRefreshing] = React.useState(false);
  const [shareMessage, setShareMessage] = React.useState<string | null>(null);
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(new Set());
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const follow = useFollowProfile(userId, username);
  const profileId = profile?.id ?? '';
  const enabled = !!profile && !locked;
  const postsQuery = useProfilePosts(userId, profileId, 'posts', enabled && tab === 'posts');
  const repostsQuery = useProfilePosts(userId, profileId, 'reposts', enabled && tab === 'reposts');
  const savedQuery = useFeed(userId, 'saved', isOwn && tab === 'saved');
  const reelsQuery = useUserReels(userId, profileId, enabled && tab === 'reels');
  const postList =
    tab === 'posts'
      ? postsQuery
      : tab === 'reposts'
        ? repostsQuery
        : tab === 'saved'
          ? savedQuery
          : null;
  const posts = React.useMemo(() => {
    if (!postList || locked) return [];
    const items = uniquePosts(postList.data).filter((post) => !hidden.has(post.id));
    if (tab === 'saved') return items.filter((post) => post.isSaved);
    if (tab === 'posts')
      return [...items.filter((p) => p.isPinned), ...items.filter((p) => !p.isPinned)];
    return items;
  }, [postList, locked, hidden, tab]);
  const reels = React.useMemo(() => uniqueReels(reelsQuery.data), [reelsQuery.data]);
  const tabs = profileTabs(isOwn);

  React.useEffect(() => {
    if (!isOwn && tab === 'saved') setTab('posts');
  }, [isOwn, tab]);

  React.useEffect(() => {
    if (!active || Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.title = profile
      ? `${profile.displayName || profile.username} (@${profile.username}) • Eternal`
      : `${tr('Profile')} • Eternal`;
  }, [active, profile]);

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken<PostResponseDto>[] }) =>
      setVisibleIds(new Set(viewableItems.map((token) => token.item.id))),
  ).current;
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 20 }).current;
  const hide = React.useCallback(
    (id: string) => setHidden((current) => new Set([...current, id])),
    [],
  );

  async function refresh() {
    if (refreshing || !isOnline) return;
    setRefreshing(true);
    try {
      await Promise.all([
        profileQuery.refetch(),
        tab === 'reels' ? reelsQuery.refetch() : postList?.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  async function share() {
    if (!profile) return;
    setShareMessage(null);
    try {
      const result = await shareLink(
        tr('{name} on Eternal', { name: profile.displayName || profile.username }),
        `${webOrigin}/profile/${encodeURIComponent(profile.username)}`,
      );
      if (result === 'copied') setShareMessage('Profile link copied');
    } catch {
      setShareMessage("The profile couldn't be shared. Try again.");
    }
  }

  const topBar = (
    <View style={s.topBar}>
      {onBack ? (
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
      ) : (
        <View style={s.topSpacer} />
      )}
      <Text style={s.topTitle} numberOfLines={1} accessibilityRole="header">
        {profile ? `@${profile.username}` : `@${username}`}
      </Text>
      {(isOwn || username === viewerUsername) && onOpenMenu ? (
        <IconButton label={tr('Account menu')} onPress={onOpenMenu}>
          <Menu size={22} color={colors.text} />
        </IconButton>
      ) : (
        <View style={s.topSpacer} />
      )}
    </View>
  );

  if (profileQuery.isPending)
    return (
      <View style={s.screen} testID="mobile-profile">
        {topBar}
        {profileQuery.fetchStatus === 'paused' ? (
          <Placeholder
            Icon={Lock}
            title={tr("You're offline")}
            text={tr('Connect to the internet to load this profile.')}
          />
        ) : (
          <ProfileSkeleton />
        )}
      </View>
    );

  if (profileQuery.isError || !profile)
    return (
      <View style={s.screen} testID="mobile-profile">
        {topBar}
        {isNotFound(profileQuery.error) ? (
          <Placeholder
            Icon={UserX}
            title={tr("This account doesn't exist")}
            text={tr('The link may be broken, or the account may have been removed.')}
            action={
              onBack ? (
                <Button
                  title={tr('Go back')}
                  variant="secondary"
                  fullWidth={false}
                  onPress={onBack}
                />
              ) : undefined
            }
          />
        ) : (
          <View style={s.padded}>
            <ErrorNotice
              message={tr("This profile couldn't be loaded.")}
              onRetry={() => {
                void profileQuery.refetch();
              }}
            />
          </View>
        )}
      </View>
    );

  const tabQuery = tab === 'reels' ? reelsQuery : postList;
  const empty = (() => {
    if (locked)
      return (
        <Placeholder
          Icon={Lock}
          title={tr('This account is private')}
          text={tr('Follow this account to see their posts and reels.')}
        />
      );
    if (!tabQuery || tabQuery.isPending)
      return tabQuery?.fetchStatus === 'paused' ? (
        <Placeholder
          Icon={Lock}
          title={tr("You're offline")}
          text={tr('Connect to the internet to load this tab.')}
        />
      ) : (
        <ActivityIndicator
          color={colors.purple}
          style={s.loader}
          accessibilityLabel={tr('Loading')}
        />
      );
    if (tabQuery.isError)
      return (
        <View style={s.padded}>
          <ErrorNotice
            message={tr("This tab couldn't be loaded.")}
            onRetry={() => {
              void tabQuery.refetch();
            }}
          />
        </View>
      );
    if (tab === 'reels' && reels.length > 0)
      return <ReelGrid reels={reels} onOpen={(index) => onOpenReel(profile.id, index)} />;
    const copy: Record<ProfileTab, [typeof Lock, string, string]> = {
      posts: [
        SquarePen,
        isOwn ? tr('Share your first post') : tr('No posts yet'),
        isOwn
          ? tr('Posts you publish will appear here.')
          : tr('When this account posts, you’ll see it here.'),
      ],
      reposts: [Repeat2, 'No reposts yet', 'Reposted posts will appear here.'],
      reels: [
        Clapperboard,
        'No reels yet',
        isOwn
          ? tr('Reels you publish will appear here.')
          : tr('This account hasn’t posted any reels.'),
      ],
      saved: [
        Bookmark,
        'Nothing saved yet',
        'Tap the bookmark on a post to save it here. Only you can see this tab.',
      ],
    };
    const [Icon, title, text] = copy[tab];
    return <Placeholder Icon={Icon} title={title} text={text} />;
  })();

  return (
    <View style={s.screen} testID="mobile-profile">
      {topBar}
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        windowSize={7}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
        ListHeaderComponent={
          <View style={s.header}>
            <ProfileHero
              profile={profile}
              isOwn={isOwn}
              isOnline={isOnline}
              following={follow.isPending}
              followError={follow.isError}
              shareMessage={shareMessage}
              onFollow={() => follow.mutate(profile)}
              followRequests={isOwn ? (requestCount.data ?? 0) : 0}
              {...(onOpenConnections && !locked
                ? {
                    onOpenConnections: (tab: 'followers' | 'following' | 'requests') =>
                      onOpenConnections(profile.id, profile.username, tab),
                  }
                : {})}
              {...(onOpenChat
                ? {
                    onMessage: () =>
                      openDirect.mutate(profile.id, {
                        onSuccess: (conversation) => onOpenChat(conversation.id),
                      }),
                    messaging: openDirect.isPending,
                    messageError: openDirect.isError,
                  }
                : {})}
              onShare={() => {
                void share();
              }}
              onEdit={() => {
                if (onEditProfile) return onEditProfile();
                void openWebSection(
                  `/profile/${encodeURIComponent(profile.username)}`,
                  onNavigationError,
                );
              }}
            />
            {!locked && (
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
                      <View style={[s.tabIndicator, selected && s.tabIndicatorActive]} />
                    </Pressable>
                  );
                })}
              </View>
            )}
            {postList?.isRefetchError && posts.length > 0 && (
              <View style={s.padded}>
                <ErrorNotice
                  message={tr("This tab couldn't be refreshed. Earlier posts are shown.")}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.post}>
            <PostCard
              post={item}
              userId={userId}
              active={active && visibleIds.has(item.id)}
              onHide={hide}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListEmptyComponent={empty}
        onEndReached={() => {
          const next = tab === 'reels' ? reelsQuery : postList;
          if (next?.hasNextPage && !next.isFetching && !next.isError && isOnline)
            void next.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          <View style={s.footer}>
            {tabQuery?.isFetchingNextPage && (
              <ActivityIndicator color={colors.purple} accessibilityLabel={tr('Loading more')} />
            )}
            {tabQuery?.isFetchNextPageError && (
              <ErrorNotice
                message={tr("More items couldn't be loaded.")}
                onRetry={() => {
                  void tabQuery.fetchNextPage();
                }}
              />
            )}
          </View>
        }
      />
    </View>
  );
}

function Placeholder({
  Icon,
  title,
  text,
  action,
}: {
  Icon: typeof Lock;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.placeholder}>
      <View style={s.placeholderIcon}>
        <Icon size={24} color={colors.purple} />
      </View>
      <Text style={common.title}>{title}</Text>
      <Text style={s.placeholderText}>{text}</Text>
      {action}
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View accessibilityLabel={tr('Loading profile')} aria-busy accessibilityState={{ busy: true }}>
      <View style={s.skBanner} />
      <View style={s.skBody}>
        <View style={s.skAvatar} />
        <View style={s.skLine} />
        <View style={[s.skLine, s.skShort]} />
        <View style={[s.skLine, s.skWide]} />
        <View style={s.skStats} />
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topSpacer: { width: 44 },
  topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { paddingBottom: 24, flexGrow: 1 },
  header: { gap: 16, paddingBottom: 16 },
  padded: { paddingHorizontal: 16 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  tabIndicatorActive: { backgroundColor: colors.purple },
  post: { paddingHorizontal: 16 },
  separator: { height: 20 },
  loader: { padding: 40 },
  footer: { padding: 16, gap: 12 },
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
  placeholderText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },
  skBanner: { height: 128, backgroundColor: '#16161a' },
  skBody: { paddingHorizontal: 16, gap: 12 },
  skAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginTop: -48,
    backgroundColor: '#26262c',
    borderWidth: 4,
    borderColor: colors.background,
  },
  skLine: { height: 14, width: '45%', borderRadius: 7, backgroundColor: '#26262c' },
  skShort: { width: '30%' },
  skWide: { width: '85%' },
  skStats: { height: 56, borderRadius: 12, backgroundColor: '#16161a', marginTop: 4 },
});
