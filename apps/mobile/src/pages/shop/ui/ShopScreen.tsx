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
  useWindowDimensions,
} from 'react-native';
import { ArrowLeft, Check, PackageOpen, Search, SearchX, WifiOff } from 'lucide-react-native';
import { Button, Input } from '@/shared/ui';
import { useDebounce } from '@/shared/lib/useDebounce';
import { colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import {
  SHOP_KINDS,
  filterItems,
  formatPrice,
  kindLabel,
  kindPlural,
  rarityLabel,
  rarityColor,
  type OwnershipFilter,
  type ShopItem,
  type ShopKind,
} from '../model/shop';
import { useShop } from '../model/queries';
import { ShopItemSheet } from './ShopItemSheet';
import { ShopPreview } from './ShopPreview';
import { msg, tr } from '@/shared/lib/i18n';

const GAP = 12;
const PADDING = 16;
const MAX_WIDTH = 620;

export function ShopScreen({
  userId,
  userName,
  avatarUri,
  isOnline,
  active,
  onBack,
}: {
  userId: string;
  userName: string;
  avatarUri?: string | null;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
}) {
  const shop = useShop(userId);
  const [kind, setKind] = React.useState<ShopKind | 'all'>('all');
  const [ownership, setOwnership] = React.useState<OwnershipFilter>('all');
  const [search, setSearch] = React.useState('');
  const query = useDebounce(search, 250);
  const [selected, setSelected] = React.useState<ShopItem | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const { width } = useWindowDimensions();
  const cardWidth = (Math.min(width, MAX_WIDTH) - PADDING * 2 - GAP) / 2;

  const items = React.useMemo(
    () => filterItems(shop.items, { kind, ownership, query, owned: shop.owned }),
    [shop.items, kind, ownership, query, shop.owned],
  );
  const filtered = kind !== 'all' || ownership !== 'all' || !!query.trim();

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${tr('Shop')} • Eternal`;
  }, [active]);

  async function refresh() {
    if (refreshing || !isOnline) return;
    setRefreshing(true);
    try {
      await shop.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const reset = () => {
    setKind('all');
    setOwnership('all');
    setSearch('');
  };

  const empty = (() => {
    if (shop.isPending)
      return shop.isPaused ? (
        <Placeholder
          Icon={WifiOff}
          title={tr("You're offline")}
          text={tr('Connect to the internet to browse the shop.')}
        />
      ) : (
        <ActivityIndicator
          color={colors.purple}
          style={s.loader}
          accessibilityLabel={tr('Loading the shop')}
        />
      );
    if (shop.failedKinds.length === SHOP_KINDS.length)
      return (
        <ErrorNotice
          message={tr("The shop couldn't be loaded.")}
          onRetry={() => {
            void shop.refetch();
          }}
        />
      );
    if (filtered)
      return (
        <Placeholder
          Icon={SearchX}
          title={
            ownership === 'owned'
              ? tr("You don't own items like this yet")
              : tr('Nothing matches these filters')
          }
          text={tr('Try another category or clear the filters.')}
          action={
            <Button title={tr('Clear filters')} variant="ghost" fullWidth={false} onPress={reset} />
          }
        />
      );
    return (
      <Placeholder
        Icon={PackageOpen}
        title={tr('The shop is empty right now')}
        text={tr("New items will appear here when they're released.")}
      />
    );
  })();

  return (
    <View style={s.screen} testID="mobile-shop">
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.topTitle}>
          {tr('Shop')}
        </Text>
        <View style={s.topSpacer} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        numColumns={2}
        columnWrapperStyle={s.columns}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        windowSize={5}
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
              <Text style={s.title}>{tr('Make your profile yours')}</Text>
              <Text style={common.muted}>
                {tr(
                  'Decorations, frames, nameplates and effects show on your profile and next to your name.',
                )}
              </Text>
            </View>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder={tr('Search items')}
              maxLength={80}
              autoCorrect={false}
              returnKeyType="search"
              showClearButton
              onClear={() => setSearch('')}
              leftElement={<Search size={18} color={colors.muted} />}
              accessibilityLabel={tr('Search items')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chips}
              accessibilityRole="tablist"
            >
              {[{ id: 'all' as const, plural: msg('All') }, ...SHOP_KINDS].map((option) => (
                <Chip
                  key={option.id}
                  label={tr(option.plural)}
                  selected={kind === option.id}
                  onPress={() => setKind(option.id)}
                />
              ))}
            </ScrollView>
            <View style={s.segment} accessibilityRole="radiogroup">
              {(['all', 'owned'] as const).map((value) => {
                const selected = ownership === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    onPress={() => setOwnership(value)}
                    style={[s.segmentItem, selected && s.segmentActive]}
                  >
                    <Text style={[s.segmentText, selected && s.segmentTextActive]}>
                      {value === 'all' ? tr('All items') : tr('Owned')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {shop.failedKinds.length > 0 && shop.failedKinds.length < SHOP_KINDS.length && (
              <ErrorNotice
                message={tr("Some items couldn't be loaded: {kinds}.", {
                  kinds: shop.failedKinds.map(kindPlural).join(', '),
                })}
                onRetry={() => {
                  void shop.refetch();
                }}
              />
            )}
            {shop.inventoryFailed && (
              <ErrorNotice
                message={tr(
                  "Your owned items couldn't be checked, so some items may show as not owned.",
                )}
                onRetry={() => {
                  void shop.refetch();
                }}
              />
            )}
            {!shop.isPending && items.length > 0 && (
              <Text style={common.muted} accessibilityLiveRegion="polite">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ShopCard
            item={item}
            width={cardWidth}
            owned={shop.owned(item)}
            equipped={shop.equipped(item)}
            userName={userName}
            avatarUri={avatarUri}
            onSelect={setSelected}
          />
        )}
        ListEmptyComponent={<View style={s.emptyFrame}>{empty}</View>}
      />
      {selected && (
        <ShopItemSheet
          userId={userId}
          item={selected}
          owned={shop.owned(selected)}
          equipped={shop.equipped(selected)}
          isOnline={isOnline}
          userName={userName}
          avatarUri={avatarUri}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  );
}

const ShopCard = React.memo(function ShopCard({
  item,
  width,
  owned,
  equipped,
  userName,
  avatarUri,
  onSelect,
}: {
  item: ShopItem;
  width: number;
  owned: boolean;
  equipped: boolean;
  userName: string;
  avatarUri?: string | null;
  onSelect: (item: ShopItem) => void;
}) {
  const status = equipped ? 'Equipped' : owned ? tr('Owned') : formatPrice(item.priceCents);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${kindLabel(item.kind)}, ${rarityLabel(item.rarity)}, ${status}`}
      onPress={() => onSelect(item)}
      style={({ pressed }) => [s.card, { width }, pressed && s.pressed]}
    >
      <ShopPreview item={item} size={width * 0.8} userName={userName} avatarUri={avatarUri} />
      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={s.cardMeta}>
          <View style={[s.dot, { backgroundColor: rarityColor[item.rarity] }]} />
          <Text style={common.muted} numberOfLines={1}>
            {kindLabel(item.kind)}
          </Text>
        </View>
        <View style={s.cardStatus}>
          {equipped && <Check size={14} color={colors.green} />}
          <Text style={[s.statusText, equipped && s.equipped, owned && !equipped && s.owned]}>
            {status}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      aria-selected={selected}
      onPress={onPress}
      style={({ pressed }) => [s.chip, selected && s.chipActive, pressed && common.pressed]}
    >
      <Text style={[s.chipText, selected && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Placeholder({
  Icon,
  title,
  text,
  action,
}: {
  Icon: typeof Search;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={s.placeholder}>
      <View style={s.placeholderIcon}>
        <Icon size={24} color={colors.purple} />
      </View>
      <Text style={[common.title, s.center]}>{title}</Text>
      <Text style={s.placeholderText}>{text}</Text>
      {action}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WIDTH,
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
  content: { padding: PADDING, paddingBottom: 32, gap: GAP },
  columns: { gap: GAP },
  header: { gap: 16, paddingBottom: 4 },
  intro: { gap: 6 },
  title: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  chips: { gap: 8, paddingRight: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: '#f3f4f6', borderColor: '#f3f4f6' },
  chipText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#09090b' },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: { backgroundColor: '#ffffff14' },
  segmentText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.75 },
  cardBody: { padding: 12, gap: 4 },
  cardName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  statusText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  owned: { color: '#d8b4fe' },
  equipped: { color: colors.green },
  emptyFrame: {
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
  },
  loader: { padding: 40 },
  placeholder: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
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
