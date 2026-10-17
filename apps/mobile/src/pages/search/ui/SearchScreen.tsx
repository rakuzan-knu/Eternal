import * as React from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Hash,
  Play,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PostResponseDto, UserProfileDto } from '@social-network/shared-contracts';
import { AlgoliaLogo, Button } from '@/shared/ui';
import { feedApi } from '../../feed/api/feedApi';
import { feedKeys } from '../../feed/model/queries';
import { nextCursor, uniquePosts } from '../../feed/model/feed';
import { Avatar, colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { openWebSection } from '../../feed/ui/FeedDock';
import { PostCard } from '../../feed/ui/PostCard';
import {
  addRecentSearch,
  parseRecentSearches,
  searchApi,
  searchKeys,
  searchTabs,
  type SearchTab,
} from '../model/search';

function Person({
  user,
  viewerId,
  isOnline,
  onOpen,
}: {
  user: UserProfileDto;
  viewerId: string;
  isOnline: boolean;
  onOpen: () => void;
}) {
  const client = useQueryClient();
  const authorKey = ['mobile', viewerId, 'author-follow', user.id];
  const requestedState = useQuery({
    queryKey: authorKey,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });
  const follow = useMutation({
    mutationKey: authorKey,
    mutationFn: () => feedApi.follow(user.id),
    onSuccess: async (result) => {
      client.setQueryData(authorKey, result.status === 'PENDING');
      void client.invalidateQueries({ queryKey: feedKeys.posts(viewerId) });
      void client.invalidateQueries({ queryKey: feedKeys.suggestions(viewerId) });
      void client.invalidateQueries({ queryKey: feedKeys.stories(viewerId) });
      await client.invalidateQueries({ queryKey: searchKeys.all(viewerId) });
    },
  });
  const following = user.isFollowing || user.followStatus === 'following';
  const requested = !following && (requestedState.data || user.followStatus === 'pending');
  return (
    <View style={s.personWrap}>
      <View style={s.person}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${user.displayName || user.username}'s profile`}
          onPress={onOpen}
          style={s.personLink}
        >
          <Avatar name={user.displayName || user.username} uri={user.avatar} size={46} />
          <View style={common.flex}>
            <View style={common.row}>
              <Text style={s.personName} numberOfLines={1}>
                {user.displayName || user.username}
              </Text>
              {user.isVerified && <BadgeCheck size={15} color={colors.purple} />}
            </View>
            <Text style={common.muted} numberOfLines={1}>
              @{user.username}
            </Text>
            {!!user.bio && (
              <Text style={s.bio} numberOfLines={1}>
                {user.bio}
              </Text>
            )}
          </View>
        </Pressable>
        {user.id !== viewerId && (
          <Button
            fullWidth={false}
            title={following ? 'Following' : requested ? 'Requested' : 'Follow'}
            variant={following || requested ? 'secondary' : 'purple'}
            size="sm"
            disabled={!isOnline || following || requested}
            loading={follow.isPending}
            onPress={() => follow.mutate()}
          />
        )}
      </View>
      {follow.isError && <ErrorNotice message="Follow failed. Please try again." />}
    </View>
  );
}

function MediaTile({ post, onOpen }: { post: PostResponseDto; onOpen: () => void }) {
  const [failed, setFailed] = React.useState(false);
  const media = post.media[0];
  const video = media?.type === 'VIDEO';
  const uri = video ? media.poster : media?.url;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${video ? 'video' : 'post'} by ${post.author}: ${post.text || 'Community post'}`}
      onPress={onOpen}
      style={s.tile}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={s.tileText}>
          <Text style={common.muted} numberOfLines={1}>
            @{post.handle}
          </Text>
          <Text style={s.tileCaption} numberOfLines={4}>
            {post.text || (video ? 'Play video' : 'Community post')}
          </Text>
        </View>
      )}
      {video && (
        <View style={s.play}>
          <Play size={15} color="white" fill="white" />
        </View>
      )}
    </Pressable>
  );
}

export function SearchScreen({
  userId,
  isOnline,
  active,
  onBack,
  onNavigationError,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onNavigationError: (failed: boolean) => void;
}) {
  const [term, setTerm] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [debounced, setDebounced] = React.useState('');
  const [tab, setTab] = React.useState<SearchTab>('All');
  const [selected, setSelected] = React.useState<string | null>(null);
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [recent, setRecent] = React.useState<string[]>([]);
  const input = React.useRef<TextInput>(null);
  const storageKey = `mobile:search:${userId}`;
  React.useEffect(() => {
    let current = true;
    void AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (current) setRecent(parseRecentSearches(value));
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [storageKey]);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);
  React.useEffect(() => {
    if (!active || !selected) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => subscription.remove();
  }, [active, selected]);
  function remember(value: string) {
    const updated = addRecentSearch(recent, value);
    setRecent(updated);
    void AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch(() => {});
  }
  function choose(value: string) {
    Keyboard.dismiss();
    setFocused(false);
    setTerm(value);
    setDebounced(value.trim());
    remember(value);
  }
  const searching = !!debounced;
  const settled = term.trim() === debounced;
  const showPeople = tab === 'All' || tab === 'People';
  const showPosts = searching && (tab === 'All' || tab === 'Posts');
  const showTags = tab === 'All' || tab === 'Hashtags';
  const showMedia = searching ? tab === 'All' || tab === 'Media' : !focused;
  const enabled = active && settled;
  const people = useQuery({
    queryKey: searchKeys.people(userId, debounced),
    queryFn: ({ signal }) => searchApi.people(debounced, signal),
    enabled: enabled && searching && showPeople && !debounced.startsWith('#'),
  });
  const tags = useQuery({
    queryKey: searchKeys.tags(userId, debounced),
    queryFn: ({ signal }) => searchApi.tags(debounced, signal),
    enabled: enabled && searching && showTags,
  });
  const suggested = useQuery({
    queryKey: [...searchKeys.all(userId), 'suggested'],
    queryFn: ({ signal }) => feedApi.suggestions(signal),
    enabled: active && !searching && focused,
  });
  const top = useQuery({
    queryKey: [...searchKeys.all(userId), 'top'],
    queryFn: ({ signal }) => searchApi.top(signal),
    enabled: active && !searching && !focused,
  });
  const trending = useQuery({
    queryKey: [...searchKeys.all(userId), 'trending'],
    queryFn: ({ signal }) => searchApi.trending(signal),
    enabled: active && !searching && focused,
  });
  const postsQuery = useInfiniteQuery({
    queryKey: searchKeys.posts(userId, debounced, false),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => searchApi.posts(debounced, false, pageParam, signal),
    getNextPageParam: nextCursor,
    enabled: enabled && showPosts,
  });
  const mediaQuery = useInfiniteQuery({
    queryKey: searchKeys.posts(userId, debounced, true),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => searchApi.posts(debounced, true, pageParam, signal),
    getNextPageParam: nextCursor,
    enabled: enabled && showMedia,
  });
  const detail = useQuery({
    queryKey: feedKeys.detail(userId, selected || ''),
    queryFn: ({ signal }) => feedApi.post(selected || '', signal),
    enabled: active && !!selected,
  });
  const posts = uniquePosts(postsQuery.data).filter((p) => !hidden.has(p.id));
  const media = uniquePosts(mediaQuery.data).filter((p) => !hidden.has(p.id));
  const hide = React.useCallback((id: string) => setHidden((value) => new Set([...value, id])), []);
  const person = (user: UserProfileDto) => (
    <Person
      key={user.id}
      user={user}
      viewerId={userId}
      isOnline={isOnline}
      onOpen={() => {
        remember(user.username);
        void openWebSection(`/profile/${encodeURIComponent(user.username)}`, onNavigationError);
      }}
    />
  );
  const requestState = (
    query: { isPending: boolean; isError: boolean; fetchStatus: string; refetch: () => unknown },
    label: string,
  ) =>
    query.isError ? (
      <ErrorNotice
        message={`${label} couldn't be loaded.`}
        onRetry={() => {
          void query.refetch();
        }}
      />
    ) : query.isPending && query.fetchStatus === 'fetching' ? (
      <ActivityIndicator
        color={colors.purple}
        accessibilityLabel={`Loading ${label.toLowerCase()}`}
        style={s.loading}
      />
    ) : null;
  const mediaGrid = (
    <View style={s.grid}>
      {media.map((post) => (
        <MediaTile
          key={post.id}
          post={post}
          onOpen={() => {
            remember(term);
            Keyboard.dismiss();
            setSelected(post.id);
          }}
        />
      ))}
    </View>
  );
  const footer = (query: typeof postsQuery) => (
    <View style={s.footer}>
      {query.isFetchNextPageError && (
        <ErrorNotice
          message="More results couldn't be loaded."
          onRetry={() => {
            void query.fetchNextPage();
          }}
        />
      )}
      {query.hasNextPage && (
        <Button
          title="Load more"
          variant="ghost"
          disabled={!isOnline}
          loading={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        />
      )}
    </View>
  );
  if (selected)
    return (
      <View style={s.screen}>
        <View style={s.titleRow}>
          <IconButton label="Back to search results" onPress={() => setSelected(null)}>
            <ArrowLeft color={colors.text} size={22} />
          </IconButton>
          <Text accessibilityRole="header" style={s.title}>
            Post
          </Text>
        </View>
        <ScrollView contentContainerStyle={s.details}>
          {detail.isPending && detail.fetchStatus === 'paused' && (
            <Text style={common.text}>Connect to the internet to open this post.</Text>
          )}
          {requestState(detail, 'Post')}
          {detail.data && (
            <PostCard
              post={detail.data}
              userId={userId}
              active={active}
              onHide={(id) => {
                hide(id);
                setSelected(null);
              }}
            />
          )}
        </ScrollView>
      </View>
    );
  const header = (
    <View style={s.sections}>
      {!isOnline && (
        <Text style={common.muted} accessibilityLiveRegion="polite">
          You're offline. Connect to search or follow creators.
        </Text>
      )}
      {!settled ? (
        <ActivityIndicator
          color={colors.purple}
          accessibilityLabel="Updating search results"
          style={s.loading}
        />
      ) : (
        <>
          {!searching && focused && (
            <>
              {!!recent.length && (
                <View style={s.section}>
                  <View style={s.sectionHeading}>
                    <Clock size={17} color={colors.muted} />
                    <Text style={common.title}>Recent searches</Text>
                    <Button
                      fullWidth={false}
                      title="Clear"
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setRecent([]);
                        void AsyncStorage.removeItem(storageKey).catch(() => {});
                      }}
                    />
                  </View>
                  <View style={s.chips}>
                    {recent.map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        onPress={() => choose(value)}
                        style={s.chip}
                      >
                        <Text style={s.chipText}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              <View style={s.section}>
                <View style={common.row}>
                  <TrendingUp size={18} color={colors.purple} />
                  <Text style={common.title}>Trending hashtags</Text>
                </View>
                {requestState(trending, 'Trending hashtags')}
                <View style={s.chips}>
                  {trending.data?.map((tag) => (
                    <Pressable
                      key={tag.tag}
                      accessibilityRole="button"
                      accessibilityLabel={`Search hashtag ${tag.tag}, ${tag.count} posts`}
                      onPress={() => choose(`#${tag.tag}`)}
                      style={s.chip}
                    >
                      <Hash size={14} color={colors.purple} />
                      <Text style={s.chipText}>{tag.tag}</Text>
                      <Text style={common.muted}>{tag.count}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={[common.card, s.section]}>
                <View style={common.row}>
                  <Sparkles size={18} color={colors.purple} />
                  <Text style={common.title}>Who to follow</Text>
                </View>
                {requestState(suggested, 'Suggestions')}
                {suggested.data?.map(person)}
              </View>
            </>
          )}
          {!searching && !focused && (
            <View style={[common.card, s.section]}>
              <View style={common.row}>
                <Sparkles color={colors.purple} size={17} />
                <Text style={common.title}>Top by followers</Text>
              </View>
              {requestState(top, 'Creators')}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.topCreators}
              >
                {top.data?.map((user) => (
                  <Pressable
                    key={user.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${user.displayName || user.username}'s profile`}
                    onPress={() => {
                      remember(user.username);
                      void openWebSection(
                        `/profile/${encodeURIComponent(user.username)}`,
                        onNavigationError,
                      );
                    }}
                    style={s.topCreator}
                  >
                    <Avatar name={user.displayName || user.username} uri={user.avatar} size={54} />
                    <View style={common.row}>
                      <Text style={s.topName} numberOfLines={1}>
                        {user.displayName || user.username}
                      </Text>
                      {user.isVerified && <BadgeCheck size={13} color={colors.purple} />}
                    </View>
                    <Text style={common.muted} numberOfLines={1}>
                      @{user.username}
                    </Text>
                    <Text style={s.tabTextSelected}>{user.followersCount || 0}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          {searching && showPeople && (
            <View style={[common.card, s.section]}>
              <Text style={common.title}>People</Text>
              {!debounced.startsWith('#') && requestState(people, 'People')}
              {!debounced.startsWith('#') && people.data?.map(person)}
              {(debounced.startsWith('#') ||
                (!people.isPending && !people.isError && !people.data?.length)) && (
                <Text style={common.muted}>No people found. Try a name or username.</Text>
              )}
            </View>
          )}
          {searching && showTags && (
            <View style={[common.card, s.section]}>
              <Text style={common.title}>Hashtags</Text>
              {requestState(tags, 'Hashtags')}
              {tags.data?.map((tag) => (
                <Pressable
                  key={tag.tag}
                  accessibilityRole="button"
                  onPress={() => choose(`#${tag.tag}`)}
                  style={s.tagRow}
                >
                  <View style={s.hash}>
                    <Hash color={colors.purple} size={20} />
                  </View>
                  <View>
                    <Text style={common.title}>#{tag.tag}</Text>
                    <Text style={common.muted}>{tag.count} posts</Text>
                  </View>
                </Pressable>
              ))}
              {!tags.isPending && !tags.isError && !tags.data?.length && (
                <Text style={common.muted}>No hashtags found.</Text>
              )}
            </View>
          )}
          {showMedia && (
            <View style={s.section}>
              <Text accessibilityRole="header" style={common.title}>
                {searching ? 'Media' : 'Explore Media'}
              </Text>
              {requestState(mediaQuery, 'Media')}
              {mediaGrid}
              {!mediaQuery.isPending && !mediaQuery.isError && !media.length && (
                <Text style={common.muted}>No media found. Try another search.</Text>
              )}
              {footer(mediaQuery)}
            </View>
          )}
          {showPosts && (
            <View style={s.section}>
              <Text accessibilityRole="header" style={common.title}>
                Posts
              </Text>
              {requestState(postsQuery, 'Posts')}
              {!postsQuery.isPending && !postsQuery.isError && !posts.length && (
                <Text style={common.muted}>No posts found. Try another search.</Text>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
  return (
    <View style={s.screen} testID="mobile-search">
      <View style={s.titleRow}>
        <IconButton label="Back to Feed" onPress={onBack}>
          <ArrowLeft color={colors.text} size={22} />
        </IconButton>
        <Text accessibilityRole="header" style={s.title}>
          Search
        </Text>
      </View>
      <View style={s.inputWrap}>
        <Search size={19} color={colors.muted} />
        <TextInput
          ref={input}
          value={term}
          onChangeText={setTerm}
          onFocus={() => setFocused(true)}
          onSubmitEditing={() => choose(term)}
          returnKeyType="search"
          maxLength={100}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search people, hashtags and posts"
          placeholder="Search users, #hashtags, posts…"
          placeholderTextColor="#71717a"
          style={s.input}
        />
        {!!term && (
          <IconButton
            label="Clear search"
            onPress={() => {
              setTerm('');
              setDebounced('');
              input.current?.focus();
            }}
          >
            <X size={18} color={colors.muted} />
          </IconButton>
        )}
      </View>
      <View
        accessible
        accessibilityLabel="People search powered by Algolia"
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: colors.muted, fontSize: 12 }}>People search by</Text>
        <AlgoliaLogo />
      </View>
      {!!term.trim() && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabs}
          contentContainerStyle={s.tabItems}
        >
          {searchTabs.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: item === tab }}
              aria-selected={item === tab}
              onPress={() => {
                Keyboard.dismiss();
                setTab(item);
              }}
              style={[s.tab, tab === item && s.tabSelected]}
            >
              <Text style={[s.tabText, tab === item && s.tabTextSelected]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <FlatList
        data={settled && showPosts ? posts : []}
        keyExtractor={(post) => post.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.content}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <PostCard post={item} userId={userId} active={false} onHide={hide} />
        )}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListFooterComponent={settled && showPosts ? footer(postsQuery) : null}
        initialNumToRender={4}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, minHeight: 0 },
  topCreators: { gap: 10 },
  topCreator: {
    width: 128,
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff05',
  },
  topName: { color: colors.text, fontWeight: '600', fontSize: 12, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 4 },
  title: { color: colors.text, fontSize: 21, fontWeight: '700' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 50,
    borderRadius: 28,
    backgroundColor: '#111115',
    borderWidth: 1,
    borderColor: '#ffffff14',
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 8,
  },
  tabs: { flexGrow: 0, flexShrink: 0, marginBottom: 10 },
  tabItems: { paddingHorizontal: 16, gap: 6 },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabSelected: { backgroundColor: '#9333ea26', borderColor: '#a855f74d' },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  tabTextSelected: { color: '#c084fc' },
  content: { padding: 16, paddingTop: 8, paddingBottom: 24, gap: 16 },
  sections: { gap: 22 },
  section: { gap: 14 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  personWrap: { gap: 8 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personLink: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
  },
  personName: { color: colors.text, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  bio: { color: '#b4b4be', fontSize: 11, marginTop: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ffffff14',
    backgroundColor: '#141418',
    borderRadius: 22,
  },
  chipText: { color: '#d4d4d8', fontSize: 13, flexShrink: 1 },
  tagRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hash: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333ea1a',
    borderRadius: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: {
    width: '32%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#17131f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileText: { flex: 1, padding: 10, justifyContent: 'space-between', gap: 4 },
  tileCaption: { fontSize: 11, color: colors.text, lineHeight: 16 },
  play: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    borderRadius: 5,
    backgroundColor: '#0009',
  },
  loading: { padding: 16 },
  footer: { paddingVertical: 8, gap: 8 },
  details: { padding: 16 },
  separator: { height: 16 },
});
