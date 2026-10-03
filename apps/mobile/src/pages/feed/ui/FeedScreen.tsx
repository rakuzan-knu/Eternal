import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Platform,
  Keyboard,
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
import { useUnreadNotifications } from '../../notifications/model/queries';
import { PostCard } from './PostCard';
import { StoriesBar, CreateStory } from './StoriesBar';
import { SuggestedUsers } from './SuggestedUsers';

export function FeedScreen({
  user,
  isOnline,
  onSignOut,
}: {
  user: UserSessionProfile;
  isOnline: boolean;
  onSignOut: () => void;
}) {
  const draftState = React.useState(emptyPostDraft);
  const [publishing, setPublishing] = React.useState(false);
  const [mode, setMode] = React.useState<FeedMode>('home');
  const [createType, setCreateType] = React.useState<CreateType | 'menu' | null>(null);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
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
  const canPlay = !createType && !notificationsOpen && !account && !storyOpen;

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = `${notificationsOpen ? 'Notifications' : mode === 'saved' ? 'Saved' : 'Home'} • Eternal`;
    }
  }, [mode, notificationsOpen]);

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notificationsOpen) {
        setNotificationsOpen(false);
        return true;
      }
      if (mode === 'saved' && !publishing) {
        setMode('home');
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [notificationsOpen, mode, publishing]);

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
    setNotificationsOpen(false);
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
      <View style={s.header}>
        <View style={s.headerSide}>
          <IconButton
            label="Create"
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
            label={`Notifications${unread.data?.total ? `, ${unread.data.total} unread` : ''}${notificationsOpen ? ', current page' : ''}`}
            selected={notificationsOpen}
            disabled={publishing}
            style={notificationsOpen ? s.selectedHeaderButton : undefined}
            onPress={() => {
              Keyboard.dismiss();
              setNotificationsOpen((open) => !open);
            }}
          >
            <Bell size={22} color={colors.text} />
            {!!unread.data?.total && <View style={s.notificationDot} />}
          </IconButton>
          <IconButton
            label="Search"
            onPress={() => {
              Keyboard.dismiss();
              void openWebSection('/search', setNavigationError);
            }}
          >
            <Search size={22} color={colors.text} />
          </IconButton>
        </View>
      </View>
      {navigationError && <ErrorNotice message="The page couldn't be opened. Please try again." />}
      {publishedMessage && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.publishedMessage}>
          {publishedMessage}
        </Text>
      )}
      <View
        style={[common.flex, notificationsOpen && s.hidden]}
        accessibilityElementsHidden={notificationsOpen}
        importantForAccessibility={notificationsOpen ? 'no-hide-descendants' : 'auto'}
        aria-hidden={notificationsOpen}
      >
        {mode === 'saved' && (
          <View style={s.savedHeader}>
            <Text accessibilityRole="header" style={common.title}>
              Saved
            </Text>
            <Text style={common.muted}>Only visible to you</Text>
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
                  <Text style={common.muted}>Posts hidden from this feed</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setHidden(new Set())}
                    style={s.undoButton}
                  >
                    <Text style={s.undoText}>Undo</Text>
                  </Pressable>
                </View>
              )}
              {query.isRefetchError && posts.length > 0 && (
                <ErrorNotice
                  message="The feed couldn't be refreshed. Previously loaded posts are shown."
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
                  <Text style={common.title}>You're offline</Text>
                  <Text style={s.emptyText}>Connect to the internet to load your feed.</Text>
                </View>
              ) : (
                <View
                  accessibilityLabel="Loading posts"
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
                message="Your feed couldn't be loaded."
                onRetry={() => {
                  void query.refetch();
                }}
              />
            ) : (
              <View style={[common.card, s.empty]}>
                <Bookmark size={26} color={colors.purple} />
                <Text style={common.title}>
                  {mode === 'saved'
                    ? 'Keep something worth coming back to'
                    : hidden.size
                      ? 'Your feed is hidden'
                      : 'Your next connection starts here'}
                </Text>
                <Text style={s.emptyText}>
                  {mode === 'saved'
                    ? 'Tap the bookmark on a post to save it here.'
                    : hidden.size
                      ? 'Use Undo above to bring hidden posts back.'
                      : 'Follow creators below to see their stories and posts.'}
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
                  accessibilityLabel="Loading more posts"
                />
              )}
              {query.isFetchNextPageError && (
                <ErrorNotice
                  message="More posts couldn't be loaded."
                  onRetry={() => {
                    void query.fetchNextPage();
                  }}
                />
              )}
              {query.hasNextPage && !query.isFetching && !query.isError && (
                <Button
                  title="Load more posts"
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
                  <Text style={common.title}>You're all caught up</Text>
                  <Text style={s.emptyText}>You've seen every post in this feed.</Text>
                  <Button
                    title="Back to top"
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
        <NotificationsScreen
          user={user}
          isOnline={isOnline}
          onBack={() => setNotificationsOpen(false)}
          onNavigationError={setNavigationError}
        />
      )}
      <FeedDock
        home={mode === 'home' && !notificationsOpen}
        saved={mode === 'saved' && !notificationsOpen}
        busy={publishing}
        profileOpen={account}
        onHome={() => changeMode('home')}
        onProfile={() => setAccount(true)}
        onError={setNavigationError}
      />
      {createType && (
        <Sheet
          title={
            createType === 'menu'
              ? 'Create'
              : createType === 'post'
                ? 'Create a post'
                : createType === 'story'
                  ? 'Create a story'
                  : 'Create New Reel'
          }
          closeDisabled={publishing}
          onClose={closeCreate}
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
        <Sheet title="Profile" onClose={() => setAccount(false)}>
          <ScrollView contentContainerStyle={s.account}>
            <Avatar name={user.displayName || user.username} uri={user.avatarUrl} size={76} />
            <Text style={s.title}>{user.displayName || user.username}</Text>
            <Text style={common.muted}>@{user.username}</Text>
            <View style={s.menuItems}>
              {[
                {
                  title: 'View profile',
                  Icon: UserRound,
                  path: `/${encodeURIComponent(user.username)}`,
                },
              ].map(({ title, Icon, path }) => (
                <Pressable
                  key={title}
                  accessibilityRole="link"
                  accessibilityLabel={title}
                  accessibilityHint="Opens in the web app"
                  style={s.menuItem}
                  onPress={() => {
                    setAccount(false);
                    void openWebSection(path, setNavigationError);
                  }}
                >
                  <Icon size={22} color={colors.muted} />
                  <Text style={[common.text, common.flex]}>{title}</Text>
                  <ChevronRight size={18} color={colors.muted} />
                </Pressable>
              ))}
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
                <Text style={[common.text, common.flex]}>Saved</Text>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
            </View>
            <View style={s.menuItems}>
              {[
                { title: 'Help & Safety', Icon: ShieldCheck, path: '/safety' },
                { title: 'Privacy Policy', Icon: LockKeyhole, path: '/privacy' },
                { title: 'Terms of Service', Icon: FileText, path: '/terms' },
              ].map(({ title, Icon, path }) => (
                <Pressable
                  key={title}
                  accessibilityRole="link"
                  accessibilityLabel={title}
                  accessibilityHint="Opens in the web app"
                  style={s.menuItem}
                  onPress={() => {
                    setAccount(false);
                    void openWebSection(path, setNavigationError);
                  }}
                >
                  <Icon size={22} color={colors.muted} />
                  <Text style={[common.text, common.flex]}>{title}</Text>
                  <ChevronRight size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
            <Button
              title="Sign out"
              variant="secondary"
              leftIcon={<LogOut size={18} color={colors.muted} />}
              disabled={publishing}
              onPress={onSignOut}
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
