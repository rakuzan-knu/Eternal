import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Compass,
  Link2,
  Plus,
  Search,
  SearchX,
  Users,
  WifiOff,
} from 'lucide-react-native';
import type { CommunitySummary } from '@social-network/shared-contracts';
import { Button, Input } from '@/shared/ui';
import { useDebounce } from '@/shared/lib/useDebounce';
import { colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { useCommunityDirectory, useMyCommunities } from '../model/queries';
import { CreateCommunitySheet, JoinWithLinkSheet } from './CommunitySheets';
import { CommunityRow, communityStyles, Placeholder, SectionHeader } from './parts';
import { tr } from '@/shared/lib/i18n';

export function CommunitiesScreen({
  userId,
  isOnline,
  active,
  onBack,
  onOpenCommunity,
  onOpenInvite,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenCommunity: (id: string) => void;
  onOpenInvite: (token: string) => void;
}) {
  const [search, setSearch] = React.useState('');
  const query = useDebounce(search.trim(), 300);
  const [sheet, setSheet] = React.useState<'create' | 'join' | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const mine = useMyCommunities(userId);
  const directory = useCommunityDirectory(userId, query);
  const results = React.useMemo(() => {
    const seen = new Set<string>();
    return (directory.data?.pages.flatMap((page) => page.data) ?? []).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [directory.data]);
  const joined = mine.data?.data ?? [];

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${tr('Communities')} • Eternal`;
  }, [active]);

  async function refresh() {
    if (refreshing || !isOnline) return;
    setRefreshing(true);
    try {
      await Promise.all([mine.refetch(), directory.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const renderList = (items: CommunitySummary[]) => (
    <View style={communityStyles.surface}>
      {items.map((community, index) => (
        <React.Fragment key={community.id}>
          {index > 0 && <View style={communityStyles.divider} />}
          <CommunityRow community={community} onPress={() => onOpenCommunity(community.id)} />
        </React.Fragment>
      ))}
    </View>
  );

  const mineSection = (() => {
    if (mine.isPending)
      return mine.fetchStatus === 'paused' ? null : (
        <View style={[communityStyles.surface, s.loadingSurface]}>
          <ActivityIndicator
            color={colors.purple}
            accessibilityLabel={tr('Loading your communities')}
          />
        </View>
      );
    if (mine.isError)
      return (
        <ErrorNotice
          message={tr("Your communities couldn't be loaded.")}
          onRetry={() => {
            void mine.refetch();
          }}
        />
      );
    if (!joined.length)
      return (
        <View style={communityStyles.surface}>
          <Placeholder
            Icon={Users}
            title={tr("You haven't joined a community yet")}
            text={tr('Open an invitation link someone shared with you, or start your own.')}
          />
        </View>
      );
    return renderList(joined);
  })();

  const discoverEmpty = (() => {
    if (directory.isPending)
      return directory.fetchStatus === 'paused' ? (
        <Placeholder
          Icon={WifiOff}
          title={tr("You're offline")}
          text={tr('Connect to the internet to browse communities.')}
        />
      ) : (
        <ActivityIndicator
          color={colors.purple}
          style={s.loader}
          accessibilityLabel={tr('Loading communities')}
        />
      );
    if (directory.isError)
      return (
        <View style={s.padded}>
          <ErrorNotice
            message={tr("Communities couldn't be loaded.")}
            onRetry={() => {
              void directory.refetch();
            }}
          />
        </View>
      );
    return query ? (
      <Placeholder
        Icon={SearchX}
        title={tr('No communities match “{term}”', { term: query })}
        text={tr('Try a shorter name or a broader topic.')}
        action={
          <Button
            title={tr('Clear search')}
            variant="ghost"
            fullWidth={false}
            onPress={() => setSearch('')}
          />
        }
      />
    ) : (
      <Placeholder
        Icon={Compass}
        title={tr('No public communities yet')}
        text={tr('Create the first one and invite your people.')}
      />
    );
  })();

  return (
    <View style={s.screen} testID="mobile-communities">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.topTitle}>
          {tr('Communities')}
        </Text>
        <View style={s.topSpacer} />
      </View>
      <FlatList
        data={results.length ? [results] : []}
        keyExtractor={() => 'results'}
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
        ListHeaderComponent={
          <View style={s.header}>
            <View style={s.intro}>
              <Text style={s.title}>{tr('Find your people')}</Text>
              <Text style={common.muted}>
                {tr('Communities bring channels and members together. You join by invitation.')}
              </Text>
            </View>
            <View style={s.actions}>
              <Button
                title={tr('Join with a link')}
                variant="secondary"
                size="sm"
                fullWidth={false}
                style={s.action}
                leftIcon={<Link2 size={16} color={colors.text} />}
                onPress={() => setSheet('join')}
              />
              <Button
                title={tr('Create')}
                variant="purple"
                size="sm"
                fullWidth={false}
                style={s.action}
                disabled={!isOnline}
                leftIcon={<Plus size={16} color="#fff" />}
                accessibilityLabel={tr('Create community')}
                onPress={() => setSheet('create')}
              />
            </View>
            <View style={s.block}>
              <SectionHeader title={tr('Your communities')} />
              {mineSection}
            </View>
            <View style={s.block}>
              <SectionHeader title={tr('Discover')} />
              <Input
                value={search}
                onChangeText={setSearch}
                placeholder={tr('Search by name or topic')}
                maxLength={100}
                autoCorrect={false}
                returnKeyType="search"
                showClearButton
                onClear={() => setSearch('')}
                leftElement={<Search size={18} color={colors.muted} />}
                accessibilityLabel={tr('Search communities')}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => renderList(item)}
        ListEmptyComponent={<View style={communityStyles.surface}>{discoverEmpty}</View>}
        ListFooterComponent={
          <View style={s.footer}>
            {directory.isFetchNextPageError && (
              <ErrorNotice
                message={tr("More communities couldn't be loaded.")}
                onRetry={() => {
                  void directory.fetchNextPage();
                }}
              />
            )}
            {directory.hasNextPage && (
              <Button
                title={tr('Show more communities')}
                variant="ghost"
                loading={directory.isFetchingNextPage}
                disabled={!isOnline}
                onPress={() => {
                  void directory.fetchNextPage();
                }}
              />
            )}
          </View>
        }
      />
      {sheet === 'create' && (
        <CreateCommunitySheet
          userId={userId}
          isOnline={isOnline}
          onClose={() => setSheet(null)}
          onCreated={(community) => {
            setSheet(null);
            onOpenCommunity(community.id);
          }}
        />
      )}
      {sheet === 'join' && (
        <JoinWithLinkSheet
          onClose={() => setSheet(null)}
          onOpenInvite={(token) => {
            setSheet(null);
            onOpenInvite(token);
          }}
        />
      )}
    </View>
  );
}

export const screenStyles = StyleSheet.create({
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
});

const s = StyleSheet.create({
  ...screenStyles,
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  header: { gap: 24, paddingBottom: 12 },
  intro: { gap: 6 },
  title: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  block: { gap: 12 },
  loadingSurface: { padding: 24 },
  loader: { padding: 32 },
  padded: { padding: 16 },
  footer: { gap: 12, paddingTop: 12 },
});
