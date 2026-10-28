import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Platform,
  Keyboard,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import {
  Bookmark,
  CheckCircle2,
  Bell,
  Plus,
  Search,
  ShieldCheck,
  FileText,
  LockKeyhole,
  ChevronRight,
  UserRound,
  LogOut,
  UsersRound,
  Settings,
  ShoppingBag,
  Info,
  ArrowUp,
} from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { PostResponseDto } from '@social-network/shared-contracts';
import type { UserSessionProfile } from '@social-network/shared-stores';
import { Button } from '@/shared/ui';
import { haptics } from '@/shared/lib/haptics';
import { uniquePosts, type FeedMode } from '../model/feed';
import { feedKeys, useFeed } from '../model/queries';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';
import { FeedDock, openWebSection } from './FeedDock';
import { CreatePostEditor, emptyPostDraft } from './CreatePostSheet';
import { CreateMenu, type CreateType } from './CreateMenu';
import { CreateReelSheet } from './CreateReelSheet';
import { NotificationsScreen } from '../../notifications/ui/NotificationsScreen';
import { SearchScreen } from '../../search/ui/SearchScreen';
import { useUnreadNotifications } from '../../notifications/model/queries';
import { MusicProvider, useMusic } from '../../music/model/MusicProvider';
import { MusicHubScreen } from '../../music/ui/MusicHubScreen';
import { MusicPlayer } from '../../music/ui/MusicPlayer';
import { MusicModeBoundary } from '../../music/ui/MusicModeBoundary';
import { CommunitiesScreen } from '../../communities/ui/CommunitiesScreen';
import { CommunityScreen } from '../../communities/ui/CommunityScreen';
import { CommunityInviteScreen } from '../../communities/ui/CommunityInviteScreen';
import { ContentScreen } from '../../content/ui/ContentScreen';
import type { ContentPageId } from '../../content/model/content';
import { resolveContentPath, type ContentTarget } from '../../content/model/routing';
import { DocumentScreen } from '../../legal/ui/DocumentScreen';
import { HelpCenterScreen } from '../../legal/ui/HelpCenterScreen';
import type { DocumentId } from '../../legal/model/documents';
import { tr, useLanguage } from '@/shared/lib/i18n';
import {
  configurePushPresentation,
  disablePush,
  onPushOpened,
  refreshPush,
} from '@/shared/lib/push';
import { ProfileScreen } from '../../profile/ui/ProfileScreen';
import { ConnectionsScreen } from '../../profile/ui/ConnectionsScreen';
import { ShopScreen } from '../../shop/ui/ShopScreen';
import { ChatsScreen } from '../../chat/ui/ChatsScreen';
import { ChatThreadScreen } from '../../chat/ui/ChatThreadScreen';
import { GroupInfoScreen } from '../../chat/ui/GroupInfoScreen';
import { NewChatScreen } from '../../chat/ui/NewChatScreen';
import { SettingsScreen, type SettingsSection } from '../../settings/ui/SettingsScreen';
import { useChatRealtime, useUnreadChats } from '../../chat/model/queries';
import { disconnectChatSocket } from '../../chat/model/socket';
import { ReelsScreen, type ReelsSource } from '../../reels/ui/ReelsScreen';
import { PostCard } from './PostCard';
import { StoriesBar, CreateStory } from './StoriesBar';
import { SuggestedUsers } from './SuggestedUsers';

export function FeedScreen(props: FeedExperienceProps) {
  return (
    <MusicProvider key={props.user.id} userId={props.user.id} isOnline={props.isOnline}>
      <FeedExperience {...props} />
    </MusicProvider>
  );
}

type FeedPage = 'feed' | 'notifications' | 'search' | 'music';
type FeedRoute =
  | { kind: 'profile'; username: string }
  | { kind: 'reels'; source: ReelsSource }
  | { kind: 'communities' }
  | { kind: 'shop' }
  | { kind: 'chats' }
  | {
      kind: 'connections';
      userId: string;
      username: string;
      tab: 'followers' | 'following' | 'requests';
    }
  | { kind: 'chat'; id: string }
  | { kind: 'newChat' }
  | { kind: 'settings'; section: SettingsSection }
  | { kind: 'groupInfo'; id: string }
  | { kind: 'help' }
  | { kind: 'document'; id: DocumentId }
  | { kind: 'content'; id: ContentPageId }
  | { kind: 'community'; id: string }
  | { kind: 'invite'; token: string };

function routeKey(route: FeedRoute) {
  switch (route.kind) {
    case 'profile':
      return route.username;
    case 'reels':
      return route.source.kind;
    case 'community':
    case 'document':
    case 'content':
    case 'chat':
    case 'groupInfo':
      return route.id;
    case 'connections':
      return `${route.userId}:${route.tab}`;
    case 'settings':
      return route.section;
    default:
      return route.kind;
  }
}
const MAX_ROUTES = 6;
type FeedExperienceProps = {
  user: UserSessionProfile;
  isOnline: boolean;
  onSignOut: () => void;
  pendingInvite?: string | null;
  onInviteOpened?: () => void;
};
function FeedExperience(props: FeedExperienceProps) {
  // Retain navigation and the user's unsent post while Game Mode releases the UI.
  const draftState = React.useState(emptyPostDraft);
  const pageState = React.useState<FeedPage>('feed');
  const modeState = React.useState<FeedMode>('home');
  const routeState = React.useState<FeedRoute[]>([]);
  const language = useLanguage();
  return (
    <MusicModeBoundary>
      <FeedScreenContent
        key={language}
        {...props}
        draftState={draftState}
        pageState={pageState}
        modeState={modeState}
        routeState={routeState}
      />
    </MusicModeBoundary>
  );
}

function FeedScreenContent({
  user,
  isOnline,
  onSignOut,
  pendingInvite,
  onInviteOpened,
  draftState,
  pageState,
  modeState,
  routeState,
}: FeedExperienceProps & {
  draftState: [
    ReturnType<typeof emptyPostDraft>,
    React.Dispatch<React.SetStateAction<ReturnType<typeof emptyPostDraft>>>,
  ];
  pageState: [FeedPage, React.Dispatch<React.SetStateAction<FeedPage>>];
  modeState: [FeedMode, React.Dispatch<React.SetStateAction<FeedMode>>];
  routeState: [FeedRoute[], React.Dispatch<React.SetStateAction<FeedRoute[]>>];
}) {
  const music = useMusic();
  const [publishing, setPublishing] = React.useState(false);
  const [mode, setMode] = modeState;
  const [createType, setCreateType] = React.useState<CreateType | 'menu' | null>(null);
  const storyCloseRequest = React.useRef<(() => void) | null>(null);
  const registerStoryClose = React.useCallback((handler: (() => void) | null) => {
    storyCloseRequest.current = handler;
  }, []);
  const [page, setPage] = pageState;
  const [routes, setRoutes] = routeState;
  const contentLang = useLanguage();
  const signOut = React.useCallback(() => {
    disconnectChatSocket();
    void disablePush(false)
      .catch(() => {})
      .finally(onSignOut);
  }, [onSignOut]);
  useChatRealtime(user.id, isOnline);
  const unreadChats = useUnreadChats(user.id);
  const route = routes[routes.length - 1];
  const reelsTabOpen = routes.length === 1 && route?.kind === 'reels';
  const chatsTabOpen = routes.length === 1 && route?.kind === 'chats';
  const ownProfileOpen =
    routes.length === 1 && route?.kind === 'profile' && route.username === user.username;
  const [searchVisited, setSearchVisited] = React.useState(page === 'search');
  const musicOpen = page === 'music' && !route;
  const notificationsOpen = page === 'notifications';
  const searchOpen = page === 'search' && !route;
  const feedHidden = page !== 'feed' || !!route;
  const [publishedMessage, setPublishedMessage] = React.useState<string | null>(null);
  const [navigationError, setNavigationError] = React.useState(false);
  const [account, setAccount] = React.useState(false);
  const [storyOpen, setStoryOpen] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [visibleIds, setVisibleIds] = React.useState<Set<string>>(new Set());
  const query = useFeed(user.id, mode);
  const unread = useUnreadNotifications(user.id);
  const client = useQueryClient();
  const list = React.useRef<FlatList<PostResponseDto>>(null);
  const posts = React.useMemo(
    () =>
      uniquePosts(query.data).filter(
        (post) => !hidden.has(post.id) && (mode !== 'saved' || post.isSaved),
      ),
    [query.data, hidden, mode],
  );
  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken<PostResponseDto>[] }) =>
      setVisibleIds(new Set(viewableItems.map((token) => token.item.id))),
  ).current;
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 20 }).current;
  const hide = React.useCallback(
    (id: string) => setHidden((current) => new Set([...current, id])),
    [],
  );
  const canPlay = !createType && !feedHidden && !account && !storyOpen && !music.playing;
  React.useEffect(() => {
    if (createType || storyOpen || route?.kind === 'reels') music.setPlaying(false);
  }, [createType, storyOpen, route?.kind, music.setPlaying]);

  const pushRoute = React.useCallback(
    (next: FeedRoute) => {
      Keyboard.dismiss();
      setAccount(false);
      setRoutes((current) => [...current, next].slice(-MAX_ROUTES));
    },
    [setRoutes],
  );
  const openProfile = React.useCallback(
    (username: string) => pushRoute({ kind: 'profile', username }),
    [pushRoute],
  );
  const popRoute = React.useCallback(
    () => setRoutes((current) => current.slice(0, -1)),
    [setRoutes],
  );
  const replaceRoute = React.useCallback(
    (next: FeedRoute) => setRoutes((current) => [...current.slice(0, -1), next]),
    [setRoutes],
  );
  React.useEffect(() => {
    configurePushPresentation();
    void refreshPush().catch(() => {});
  }, [contentLang]);
  React.useEffect(
    () =>
      onPushOpened((data) => {
        setAccount(false);
        if (data.kind === 'message') {
          setPage('feed');
          setRoutes((current) =>
            [...current, { kind: 'chat' as const, id: data.conversationId }].slice(-MAX_ROUTES),
          );
        } else if (data.actorUsername) {
          setPage('feed');
          setRoutes((current) =>
            [...current, { kind: 'profile' as const, username: data.actorUsername ?? '' }].slice(
              -MAX_ROUTES,
            ),
          );
        } else {
          setRoutes([]);
          setPage('notifications');
        }
      }),
    [setRoutes, setPage],
  );
  React.useEffect(() => {
    if (!pendingInvite) return;
    pushRoute({ kind: 'invite', token: pendingInvite });
    onInviteOpened?.();
  }, [pendingInvite, pushRoute, onInviteOpened]);
  const navigateContent = React.useCallback(
    (target: ContentTarget) => {
      if (target.kind === 'external')
        Linking.openURL(target.url)
          .then(() => setNavigationError(false))
          .catch(() => setNavigationError(true));
      else if (target.kind === 'web') void openWebSection(target.path, setNavigationError);
      else pushRoute(target);
    },
    [pushRoute],
  );
  const openContentPath = React.useCallback(
    (path: string) => navigateContent(resolveContentPath(path)),
    [navigateContent],
  );
  function openTab(next: FeedRoute | null) {
    Keyboard.dismiss();
    setAccount(false);
    setRoutes(next ? [next] : []);
  }

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && !route) {
      document.title = `${musicOpen ? tr('Music Hub') : searchOpen ? tr('Search') : notificationsOpen ? tr('Notifications') : mode === 'saved' ? tr('Saved') : tr('Home')} • Eternal`;
    }
  }, [mode, notificationsOpen, searchOpen, musicOpen, route]);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (routes.length > 0) {
        popRoute();
        return true;
      }
      if (page !== 'feed') {
        setPage('feed');
        return true;
      }
      if (mode === 'saved' && !publishing) {
        setMode('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [page, mode, publishing, routes.length, popRoute]);

  async function refresh() {
    if (refreshing || !isOnline || query.isFetching) return;
    setRefreshing(true);
    try {
      await Promise.all([
        query.refetch(),
        client.invalidateQueries({ queryKey: feedKeys.stories(user.id) }),
        client.invalidateQueries({ queryKey: feedKeys.suggestions(user.id) }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  function changeMode(next: FeedMode) {
    if (publishing) return;
    Keyboard.dismiss();
    setPage('feed');
    setRoutes([]);
    setPublishedMessage(null);
    haptics.selection();
    if (next === mode) list.current?.scrollToOffset({ offset: 0, animated: true });
    else setMode(next);
  }

  function closeCreate() {
    setCreateType(null);
    setPublishing(false);
  }

  return (
    <View style={s.screen} testID="mobile-feed">
      <View style={[s.header, !!route && s.hidden]}>
        <View style={s.headerSide}>
          <IconButton
            label={tr('Create')}
            disabled={!isOnline || publishing}
            onPress={() => {
              Keyboard.dismiss();
              setPublishedMessage(null);
              setCreateType('menu');
            }}
          >
            <Plus size={25} color={colors.text} />
          </IconButton>
        </View>
        <Text
          style={s.brand}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.2}
        >
          Eternal
        </Text>
        <View style={s.headerSide}>
          <IconButton
            label={[
              tr('Notifications'),
              unread.data?.total ? tr('{count} unread', { count: unread.data.total }) : '',
              notificationsOpen ? tr('current page') : '',
            ]
              .filter(Boolean)
              .join(', ')}
            selected={notificationsOpen}
            disabled={publishing}
            style={notificationsOpen ? s.selectedHeaderButton : undefined}
            onPress={() => {
              Keyboard.dismiss();
              setPage((current) => (current === 'notifications' ? 'feed' : 'notifications'));
            }}
          >
            <Bell size={22} color={colors.text} />
            {!!unread.data?.total && <View style={s.notificationDot} />}
          </IconButton>
          <IconButton
            label={tr('Search')}
            selected={searchOpen}
            disabled={publishing}
            style={searchOpen ? s.selectedHeaderButton : undefined}
            onPress={() => {
              Keyboard.dismiss();
              setSearchVisited(true);
              setPage('search');
            }}
          >
            <Search size={22} color={colors.text} />
          </IconButton>
        </View>
      </View>
      {navigationError && (
        <ErrorNotice message={tr("The page couldn't be opened. Please try again.")} />
      )}
      {publishedMessage && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.publishedMessage}>
          {publishedMessage}
        </Text>
      )}
      <View
        style={[common.flex, feedHidden && s.hidden]}
        accessibilityElementsHidden={feedHidden}
        importantForAccessibility={feedHidden ? 'no-hide-descendants' : 'auto'}
        aria-hidden={feedHidden}
      >
        {mode === 'saved' && (
          <View style={s.savedHeader}>
            <Text accessibilityRole="header" style={common.title}>
              {tr('Saved')}
            </Text>
            <Text style={common.muted}>{tr('Only visible to you')}</Text>
          </View>
        )}
        <FlatList
          ref={list}
          key={mode}
          data={posts}
          keyExtractor={(post) => post.id}
          style={s.list}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews={false}
          keyboardShouldPersistTaps="handled"
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
            <View style={s.intro}>
              {mode === 'home' && (
                <>
                  <StoriesBar user={user} isOnline={isOnline} onOpenChange={setStoryOpen} />
                  <CreatePostEditor
                    user={user}
                    draftState={draftState}
                    onBusyChange={setPublishing}
                    inline
                    isOnline={isOnline}
                    onClose={() => list.current?.scrollToOffset({ offset: 0, animated: true })}
                  />
                </>
              )}
              {hidden.size > 0 && (
                <View style={s.undo}>
                  <Text style={common.muted}>{tr('Posts hidden from this feed')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHidden(new Set())}
                    style={s.undoButton}
                  >
                    <Text style={s.undoText}>{tr('Undo')}</Text>
                  </Pressable>
                </View>
              )}
              {query.isRefetchError && posts.length > 0 && (
                <ErrorNotice
                  message={tr("The feed couldn't be refreshed. Previously loaded posts are shown.")}
                  onRetry={() => {
                    void query.refetch();
                  }}
                />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              userId={user.id}
              active={canPlay && visibleIds.has(item.id)}
              onHide={hide}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetching && !query.isError && isOnline)
              void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            query.isPending ? (
              query.fetchStatus === 'paused' ? (
                <View style={[common.card, s.empty]}>
                  <Text style={common.title}>{tr("You're offline")}</Text>
                  <Text style={s.emptyText}>
                    {tr('Connect to the internet to load your feed.')}
                  </Text>
                </View>
              ) : (
                <View
                  accessibilityLabel={tr('Loading posts')}
                  accessibilityState={{ busy: true }}
                  aria-busy
                  style={s.skeletons}
                >
                  {[0, 1, 2].map((item) => (
                    <View key={item} style={[common.card, s.skeleton]}>
                      <View style={s.skeletonHeader}>
                        <View style={s.skeletonAvatar} />
                        <View style={s.skeletonName} />
                      </View>
                      <View style={s.skeletonLine} />
                      <View style={s.skeletonLineShort} />
                      <View style={s.skeletonMedia} />
                    </View>
                  ))}
                </View>
              )
            ) : query.isError ? (
              <ErrorNotice
                message={tr("Your feed couldn't be loaded.")}
                onRetry={() => {
                  void query.refetch();
                }}
              />
            ) : (
              <View style={[common.card, s.empty]}>
                <Bookmark size={26} color={colors.purple} />
                <Text style={common.title}>
                  {mode === 'saved'
                    ? tr('Keep something worth coming back to')
                    : hidden.size
                      ? tr('Your feed is hidden')
                      : tr('Your next connection starts here')}
                </Text>
                <Text style={s.emptyText}>
                  {mode === 'saved'
                    ? tr('Tap the bookmark on a post to save it here.')
                    : hidden.size
                      ? tr('Use Undo above to bring hidden posts back.')
                      : tr('Follow creators below to see their stories and posts.')}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            <View style={s.footer}>
              {query.isFetchingNextPage && (
                <ActivityIndicator
                  color={colors.purple}
                  style={s.loading}
                  accessibilityLabel={tr('Loading more posts')}
                />
              )}
              {query.isFetchNextPageError && (
                <ErrorNotice
                  message={tr("More posts couldn't be loaded.")}
                  onRetry={() => {
                    void query.fetchNextPage();
                  }}
                />
              )}
              {query.hasNextPage && !query.isFetching && !query.isError && (
                <Button
                  title={tr('Load more posts')}
                  variant="ghost"
                  disabled={!isOnline}
                  onPress={() => {
                    void query.fetchNextPage();
                  }}
                />
              )}
              {!query.isPending && !query.isError && !query.hasNextPage && posts.length > 0 && (
                <View style={[common.card, s.caughtUp]}>
                  <View style={s.check}>
                    <CheckCircle2 size={26} color={colors.green} />
                  </View>
                  <Text style={common.title}>{tr("You're all caught up")}</Text>
                  <Text style={s.emptyText}>{tr("You've seen every post in this feed.")}</Text>
                  <Button
                    title={tr('Back to top')}
                    variant="ghost"
                    leftIcon={<ArrowUp size={15} color={colors.purple} />}
                    onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })}
                  />
                </View>
              )}
              {mode === 'home' && !query.isPending && !query.isError && !query.hasNextPage && (
                <SuggestedUsers userId={user.id} />
              )}
            </View>
          }
        />
      </View>
      {notificationsOpen && (
        <View
          style={[common.flex, !!route && s.hidden]}
          accessibilityElementsHidden={!!route}
          importantForAccessibility={route ? 'no-hide-descendants' : 'auto'}
          aria-hidden={!!route}
        >
          <NotificationsScreen
            user={user}
            isOnline={isOnline}
            onBack={() => setPage('feed')}
            onOpenProfile={openProfile}
            onNavigationError={setNavigationError}
          />
        </View>
      )}
      {searchVisited && (
        <View
          style={[common.flex, !searchOpen && s.hidden]}
          accessibilityElementsHidden={!searchOpen}
          importantForAccessibility={!searchOpen ? 'no-hide-descendants' : 'auto'}
          aria-hidden={!searchOpen}
        >
          <SearchScreen
            userId={user.id}
            isOnline={isOnline}
            active={searchOpen && !createType && !account}
            onBack={() => setPage('feed')}
            onOpenProfile={openProfile}
          />
        </View>
      )}
      {music.visited && (
        <View
          style={[common.flex, !musicOpen && s.hidden]}
          accessibilityElementsHidden={!musicOpen}
          importantForAccessibility={!musicOpen ? 'no-hide-descendants' : 'auto'}
          aria-hidden={!musicOpen}
        >
          <MusicHubScreen
            active={musicOpen && !createType && !account}
            onBack={() => setPage('feed')}
          />
        </View>
      )}
      {routes.map((item, index) => {
        const top = index === routes.length - 1;
        const visible = top && !createType && !account;
        return (
          <View
            key={`${index}:${item.kind}:${routeKey(item)}`}
            style={[common.flex, !top && s.hidden]}
            accessibilityElementsHidden={!top}
            importantForAccessibility={top ? 'auto' : 'no-hide-descendants'}
            aria-hidden={!top}
          >
            {item.kind === 'connections' ? (
              <ConnectionsScreen
                viewerId={user.id}
                userId={item.userId}
                username={item.username}
                initialTab={item.tab}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onOpenProfile={openProfile}
              />
            ) : item.kind === 'chats' ? (
              <ChatsScreen
                userId={user.id}
                isOnline={isOnline}
                active={visible}
                onOpenConversation={(id) => pushRoute({ kind: 'chat', id })}
                onNewChat={() => pushRoute({ kind: 'newChat' })}
                onFindPeople={() => {
                  setRoutes([]);
                  setSearchVisited(true);
                  setPage('search');
                }}
              />
            ) : item.kind === 'chat' ? (
              <ChatThreadScreen
                userId={user.id}
                conversationId={item.id}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onOpenProfile={openProfile}
                onOpenGroupInfo={(id) => pushRoute({ kind: 'groupInfo', id })}
              />
            ) : item.kind === 'settings' ? (
              <SettingsScreen
                user={user}
                section={item.section}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onOpenSection={(section) => pushRoute({ kind: 'settings', section })}
                onOpenRequests={() =>
                  pushRoute({
                    kind: 'connections',
                    userId: user.id,
                    username: user.username,
                    tab: 'requests',
                  })
                }
                onOpenWeb={() =>
                  void openWebSection(
                    `/profile/${encodeURIComponent(user.username)}`,
                    setNavigationError,
                  )
                }
                onSignOut={signOut}
              />
            ) : item.kind === 'newChat' ? (
              <NewChatScreen
                userId={user.id}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onOpenConversation={(id) => replaceRoute({ kind: 'chat', id })}
              />
            ) : item.kind === 'groupInfo' ? (
              <GroupInfoScreen
                userId={user.id}
                conversationId={item.id}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onLeft={() =>
                  setRoutes((current) =>
                    current.filter(
                      (route) =>
                        !(
                          (route.kind === 'chat' || route.kind === 'groupInfo') &&
                          route.id === item.id
                        ),
                    ),
                  )
                }
                onOpenProfile={openProfile}
              />
            ) : item.kind === 'profile' ? (
              <ProfileScreen
                userId={user.id}
                viewerUsername={user.username}
                username={item.username}
                isOnline={isOnline}
                active={visible}
                onBack={index === 0 && ownProfileOpen ? undefined : popRoute}
                onOpenMenu={() => setAccount(true)}
                onOpenReel={(authorId, startIndex) =>
                  pushRoute({ kind: 'reels', source: { kind: 'user', authorId, startIndex } })
                }
                onOpenChat={(id) => pushRoute({ kind: 'chat', id })}
                onOpenConnections={(userId, username, tab) =>
                  pushRoute({ kind: 'connections', userId, username, tab })
                }
                onEditProfile={() => pushRoute({ kind: 'settings', section: 'account' })}
                onNavigationError={setNavigationError}
              />
            ) : item.kind === 'help' ? (
              <HelpCenterScreen
                lang={contentLang}
                active={visible}
                onBack={popRoute}
                onOpenDocument={(id) => pushRoute({ kind: 'document', id })}
                onOpenPath={openContentPath}
              />
            ) : item.kind === 'document' ? (
              <DocumentScreen
                documentId={item.id}
                lang={contentLang}
                active={visible}
                onBack={popRoute}
                onNavigationError={setNavigationError}
              />
            ) : item.kind === 'content' ? (
              <ContentScreen
                pageId={item.id}
                lang={contentLang}
                active={visible}
                onBack={popRoute}
                onNavigate={navigateContent}
              />
            ) : item.kind === 'shop' ? (
              <ShopScreen
                userId={user.id}
                userName={user.displayName || user.username}
                avatarUri={user.avatarUrl}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
              />
            ) : item.kind === 'communities' ? (
              <CommunitiesScreen
                userId={user.id}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onOpenCommunity={(id) => pushRoute({ kind: 'community', id })}
                onOpenInvite={(token) => pushRoute({ kind: 'invite', token })}
              />
            ) : item.kind === 'community' ? (
              <CommunityScreen
                userId={user.id}
                communityId={item.id}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onLeft={popRoute}
                onOpenProfile={openProfile}
                onOpenChannel={(id) => pushRoute({ kind: 'chat', id })}
              />
            ) : item.kind === 'invite' ? (
              <CommunityInviteScreen
                userId={user.id}
                token={item.token}
                isOnline={isOnline}
                active={visible}
                onBack={popRoute}
                onJoined={(id) => replaceRoute({ kind: 'community', id })}
              />
            ) : (
              <ReelsScreen
                userId={user.id}
                isOnline={isOnline}
                active={visible}
                source={item.source}
                onBack={index === 0 && reelsTabOpen ? undefined : popRoute}
                onOpenProfile={openProfile}
                onCreate={() => setCreateType('reel')}
              />
            )}
          </View>
        );
      })}
      <MusicPlayer />
      <FeedDock
        music={musicOpen}
        onMusic={() => {
          Keyboard.dismiss();
          music.setVisited(true);
          setRoutes([]);
          setPage('music');
        }}
        home={mode === 'home' && !feedHidden}
        saved={mode === 'saved' && !feedHidden}
        reels={reelsTabOpen}
        profile={ownProfileOpen}
        busy={publishing}
        onHome={() => changeMode('home')}
        onReels={() => openTab({ kind: 'reels', source: { kind: 'feed' } })}
        chats={chatsTabOpen}
        unreadChats={unreadChats}
        onChats={() => openTab({ kind: 'chats' })}
        onProfile={() => openTab({ kind: 'profile', username: user.username })}
      />
      {createType && (
        <Sheet
          title={
            createType === 'menu'
              ? tr('Create')
              : createType === 'post'
                ? tr('Create a post')
                : createType === 'story'
                  ? tr('Create a story')
                  : tr('Create New Reel')
          }
          closeDisabled={publishing}
          hideHeader={createType === 'story'}
          onClose={() =>
            createType === 'story' && storyCloseRequest.current
              ? storyCloseRequest.current()
              : closeCreate()
          }
        >
          {createType === 'menu' && <CreateMenu onSelect={setCreateType} />}
          {createType === 'post' && (
            <ScrollView keyboardShouldPersistTaps="handled">
              <CreatePostEditor
                user={user}
                isOnline={isOnline}
                draftState={draftState}
                onBusyChange={setPublishing}
                onClose={closeCreate}
              />
            </ScrollView>
          )}
          {createType === 'story' && (
            <CreateStory
              userId={user.id}
              isOnline={isOnline}
              embedded
              onBusyChange={setPublishing}
              onCloseRequestChange={registerStoryClose}
              onClose={closeCreate}
            />
          )}
          {createType === 'reel' && (
            <CreateReelSheet
              userId={user.id}
              isOnline={isOnline}
              embedded
              onBusyChange={setPublishing}
              onClose={closeCreate}
              onPublished={() => {
                closeCreate();
                setPublishedMessage('Your reel has been published.');
              }}
            />
          )}
        </Sheet>
      )}
      {account && (
        <Sheet title={tr('Profile')} onClose={() => setAccount(false)}>
          <ScrollView contentContainerStyle={s.account}>
            <Avatar name={user.displayName || user.username} uri={user.avatarUrl} size={76} />
            <Text style={s.title}>{user.displayName || user.username}</Text>
            <Text style={common.muted}>@{user.username}</Text>
            <View style={s.menuItems}>
              <Pressable
                accessibilityRole="button"
                style={s.menuItem}
                onPress={() => openTab({ kind: 'communities' })}
              >
                <UsersRound size={22} color={colors.muted} />
                <Text style={[common.text, common.flex]}>{tr('Communities')}</Text>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={s.menuItem}
                onPress={() => openTab({ kind: 'shop' })}
              >
                <ShoppingBag size={22} color={colors.muted} />
                <Text style={[common.text, common.flex]}>{tr('Shop')}</Text>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
              {!ownProfileOpen && (
                <Pressable
                  accessibilityRole="button"
                  style={s.menuItem}
                  onPress={() => openTab({ kind: 'profile', username: user.username })}
                >
                  <UserRound size={22} color={colors.muted} />
                  <Text style={[common.text, common.flex]}>{tr('View profile')}</Text>
                  <ChevronRight size={18} color={colors.muted} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: publishing }}
                aria-disabled={publishing}
                disabled={publishing}
                style={s.menuItem}
                onPress={() => {
                  setAccount(false);
                  changeMode('saved');
                }}
              >
                <Bookmark size={22} color={colors.muted} />
                <Text style={[common.text, common.flex]}>{tr('Saved')}</Text>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={s.menuItem}
                onPress={() => openTab({ kind: 'settings', section: 'home' })}
              >
                <Settings size={22} color={colors.muted} />
                <Text style={[common.text, common.flex]}>{tr('Settings')}</Text>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
            </View>
            <View style={s.menuItems}>
              {(
                [
                  { title: tr('Help & Safety'), Icon: ShieldCheck, route: { kind: 'help' } },
                  {
                    title: tr('About Eternal'),
                    Icon: Info,
                    route: { kind: 'content', id: 'company' },
                  },
                  {
                    title: tr('Privacy Policy'),
                    Icon: LockKeyhole,
                    route: { kind: 'document', id: 'privacy' },
                  },
                  {
                    title: tr('Terms of Service'),
                    Icon: FileText,
                    route: { kind: 'document', id: 'terms' },
                  },
                ] satisfies { title: string; Icon: typeof FileText; route: FeedRoute }[]
              ).map(({ title, Icon, route: next }) => (
                <Pressable
                  key={title}
                  accessibilityRole="button"
                  style={s.menuItem}
                  onPress={() => openTab(next)}
                >
                  <Icon size={22} color={colors.muted} />
                  <Text style={[common.text, common.flex]}>{title}</Text>
                  <ChevronRight size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
            <Button
              title={tr('Sign out')}
              variant="secondary"
              leftIcon={<LogOut size={18} color={colors.muted} />}
              disabled={publishing}
              onPress={signOut}
            />
          </ScrollView>
        </Sheet>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff0d',
  },
  brand: {
    flex: 1,
    textAlign: 'center',
    color: 'white',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 1.2,
  },
  headerSide: { width: 88, flexDirection: 'row', alignItems: 'center' },
  selectedHeaderButton: { backgroundColor: '#a855f71a' },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.purple,
    borderWidth: 1,
    borderColor: colors.background,
  },
  hidden: { display: 'none' },
  publishedMessage: { color: '#d8b4fe', padding: 16, fontSize: 14 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  savedHeader: { padding: 16, gap: 4 },
  menuItems: { alignSelf: 'stretch', gap: 8 },
  menuItem: {
    minHeight: 56,
    paddingHorizontal: 16,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff05',
  },
  list: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  intro: { gap: 24, paddingTop: 16, paddingBottom: 24 },
  separator: { height: 24 },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#21152e',
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  undoButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  undoText: { color: '#c084fc', fontWeight: '700', fontSize: 13 },
  footer: { gap: 16, paddingTop: 16 },
  loading: { padding: 16 },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
  caughtUp: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  check: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b98118',
    borderWidth: 1,
    borderColor: '#10b98144',
    marginBottom: 4,
  },
  account: { padding: 28, alignItems: 'center', gap: 18 },
  skeletons: { gap: 14 },
  skeleton: { gap: 12 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#26262c' },
  skeletonName: { width: '40%', height: 12, borderRadius: 6, backgroundColor: '#26262c' },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: '#26262c' },
  skeletonLineShort: { width: '65%', height: 10, borderRadius: 5, backgroundColor: '#26262c' },
  skeletonMedia: { height: 150, borderRadius: 16, backgroundColor: '#1c1c21' },
});
