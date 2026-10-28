import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { ArrowLeft, Clapperboard, Volume2, VolumeX, WifiOff } from 'lucide-react-native';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import { Button } from '@/shared/ui';
import { webOrigin } from '@/shared/api/client';
import { colors, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { shareLink } from '../../feed/ui/shareLink';
import { uniqueReels } from '../model/reels';
import { useReelActions, useReelsFeed, useUserReels } from '../model/queries';
import { ReelSlide } from './ReelSlide';
import { ReelCommentsSheet } from './ReelCommentsSheet';
import { tr } from '@/shared/lib/i18n';

export type ReelsSource = { kind: 'feed' } | { kind: 'user'; authorId: string; startIndex: number };

export function ReelsScreen({
  userId,
  isOnline,
  active,
  source,
  onBack,
  onOpenProfile,
  onCreate,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  source: ReelsSource;
  onBack?: () => void;
  onOpenProfile: (username: string) => void;
  onCreate?: () => void;
}) {
  const feed = useReelsFeed(userId, source.kind === 'feed');
  const byUser = useUserReels(
    userId,
    source.kind === 'user' ? source.authorId : '',
    source.kind === 'user',
  );
  const query = source.kind === 'feed' ? feed : byUser;
  const reels = React.useMemo(() => uniqueReels(query.data), [query.data]);
  const actions = useReelActions(userId);
  const startIndex = source.kind === 'user' ? source.startIndex : 0;
  const [height, setHeight] = React.useState(0);
  const [current, setCurrent] = React.useState(startIndex);
  const [muted, setMuted] = React.useState(Platform.OS === 'web');
  const [commentsFor, setCommentsFor] = React.useState<ReelResponseDto | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const viewed = React.useRef(new Set<string>());

  const onViewableItemsChanged = React.useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ReelResponseDto>[] }) => {
      const first = viewableItems.find((token) => token.isViewable);
      if (first?.index != null) setCurrent(first.index);
    },
  ).current;
  const viewabilityConfig = React.useRef({ itemVisiblePercentThreshold: 70 }).current;

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${tr('Reels')} • Eternal`;
  }, [active]);

  const currentReel = reels[current];
  React.useEffect(() => {
    if (!active || !currentReel || !isOnline || viewed.current.has(currentReel.id)) return;
    const timer = setTimeout(() => {
      viewed.current.add(currentReel.id);
      actions.view.mutate(currentReel.id);
    }, 2000);
    return () => clearTimeout(timer);
  }, [active, currentReel, isOnline, actions.view]);

  const like = React.useCallback(
    (reel: ReelResponseDto) => actions.like.mutate(reel.id),
    [actions.like],
  );
  const save = React.useCallback(
    (reel: ReelResponseDto) => actions.save.mutate({ reelId: reel.id, saved: !reel.isSaved }),
    [actions.save],
  );
  const share = React.useCallback(
    async (reel: ReelResponseDto) => {
      setNotice(null);
      try {
        const result = await shareLink(
          `${reel.author.displayName || reel.author.username} on Eternal`,
          `${webOrigin}/reels?id=${encodeURIComponent(reel.id)}`,
        );
        if (result === 'dismissed') return;
        if (result === 'copied') setNotice(tr('Link copied'));
        if (isOnline) actions.share.mutate(reel.id);
      } catch {
        setNotice(tr("The reel couldn't be shared. Try again."));
      }
    },
    [actions.share, isOnline],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next > 0 && next !== height) setHeight(next);
  };

  let body: React.ReactNode;
  if (query.isPending) {
    body =
      query.fetchStatus === 'paused' ? (
        <State
          Icon={WifiOff}
          title={tr("You're offline")}
          text={tr('Connect to the internet to watch reels.')}
        />
      ) : (
        <View style={s.state} accessibilityLabel={tr('Loading reels')} aria-busy>
          <ActivityIndicator color={colors.purple} size="large" />
        </View>
      );
  } else if (query.isError && reels.length === 0) {
    body = (
      <View style={s.state}>
        <ErrorNotice
          message={tr("Reels couldn't be loaded.")}
          onRetry={() => {
            void query.refetch();
          }}
        />
      </View>
    );
  } else if (reels.length === 0) {
    body = (
      <State
        Icon={Clapperboard}
        title={tr('No reels yet')}
        text={
          source.kind === 'feed'
            ? tr('Short videos from people you follow will appear here.')
            : tr('This account hasn’t posted any reels.')
        }
        action={
          onCreate && source.kind === 'feed' ? (
            <Button
              title={tr('Create a reel')}
              variant="purple"
              fullWidth={false}
              disabled={!isOnline}
              onPress={onCreate}
            />
          ) : undefined
        }
      />
    );
  } else if (height > 0) {
    body = (
      <FlatList
        data={reels}
        keyExtractor={(reel) => reel.id}
        renderItem={({ item, index }) => (
          <ReelSlide
            reel={item}
            height={height}
            active={active && index === current && !commentsFor}
            mounted={Math.abs(index - current) <= 1}
            muted={muted}
            isOnline={isOnline}
            onLike={like}
            onSave={save}
            onComments={setCommentsFor}
            onShare={(reel) => void share(reel)}
            onOpenAuthor={onOpenProfile}
          />
        )}
        extraData={`${current}:${muted}:${active}:${!!commentsFor}:${isOnline}`}
        pagingEnabled
        snapToInterval={height}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        initialScrollIndex={Math.min(startIndex, reels.length - 1)}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReachedThreshold={2}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetching && !query.isError && isOnline)
            void query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchNextPageError ? (
            <View style={[s.footer, { height }]}>
              <ErrorNotice
                message={tr("More reels couldn't be loaded.")}
                onRetry={() => {
                  void query.fetchNextPage();
                }}
              />
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <View style={s.screen} onLayout={onLayout} testID="mobile-reels">
      {body}
      <View style={s.topBar} pointerEvents="box-none">
        {onBack ? (
          <IconButton label={tr('Back')} onPress={onBack} style={s.topButton}>
            <ArrowLeft size={22} color="#fff" />
          </IconButton>
        ) : (
          <View style={s.topSpacer} />
        )}
        <Text accessibilityRole="header" style={s.title}>
          {tr('Reels')}
        </Text>
        <IconButton
          label={muted ? tr('Turn sound on') : 'Mute'}
          selected={!muted}
          onPress={() => setMuted((value) => !value)}
          style={s.topButton}
        >
          {muted ? <VolumeX size={22} color="#fff" /> : <Volume2 size={22} color="#fff" />}
        </IconButton>
      </View>
      {notice && (
        <View style={s.notice} accessibilityLiveRegion="polite" aria-live="polite">
          <Text style={s.noticeText}>{notice}</Text>
        </View>
      )}
      {commentsFor && (
        <ReelCommentsSheet
          userId={userId}
          reel={reels.find((reel) => reel.id === commentsFor.id) ?? commentsFor}
          isOnline={isOnline}
          onClose={() => setCommentsFor(null)}
        />
      )}
    </View>
  );
}

function State({
  Icon,
  title,
  text,
  action,
}: {
  Icon: typeof WifiOff;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.state}>
      <View style={s.stateIcon}>
        <Icon size={26} color={colors.purple} />
      </View>
      <Text style={s.stateTitle}>{title}</Text>
      <Text style={s.stateText}>{text}</Text>
      {action}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  topButton: { backgroundColor: '#00000040', borderRadius: 22 },
  topSpacer: { width: 44 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f71a',
  },
  stateTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 280,
  },
  footer: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  notice: {
    position: 'absolute',
    top: 64,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#18181bee',
  },
  noticeText: { color: colors.text, fontSize: 13, fontWeight: '600' },
});
