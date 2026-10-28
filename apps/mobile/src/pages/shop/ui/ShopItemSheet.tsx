import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Button } from '@/shared/ui';
import { haptics } from '@/shared/lib/haptics';
import { colors, common, ErrorNotice, Sheet } from '../../feed/ui/primitives';
import { formatPrice, kindLabel, rarityColor, rarityLabel, type ShopItem } from '../model/shop';
import { useEquip } from '../model/queries';
import { ShopPreview } from './ShopPreview';
import { tr } from '@/shared/lib/i18n';

export function ShopItemSheet({
  userId,
  item,
  owned,
  equipped,
  isOnline,
  userName,
  avatarUri,
  onClose,
}: {
  userId: string;
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  isOnline: boolean;
  userName: string;
  avatarUri?: string | null;
  onClose: () => void;
}) {
  const equip = useEquip(userId);
  const [message, setMessage] = React.useState<string | null>(null);
  const kind = kindLabel(item.kind).toLowerCase();

  const toggle = () => {
    setMessage(null);
    equip.mutate(
      { item, equip: !equipped },
      {
        onSuccess: () => {
          haptics.success();
          setMessage(
            equipped
              ? `${item.name} removed from your profile`
              : `${item.name} is now on your profile`,
          );
        },
      },
    );
  };

  return (
    <Sheet title={item.name} onClose={onClose} closeDisabled={equip.isPending}>
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.stage}>
          <ShopPreview item={item} size={260} userName={userName} avatarUri={avatarUri} animated />
        </View>
        <View style={s.meta}>
          <View style={s.tags}>
            <Text style={common.muted}>{kindLabel(item.kind)}</Text>
            <View style={[s.dot, { backgroundColor: rarityColor[item.rarity] }]} />
            <Text style={[s.rarity, { color: rarityColor[item.rarity] }]}>
              {rarityLabel(item.rarity)}
            </Text>
          </View>
          <Text style={s.title} accessibilityRole="header">
            {item.name}
          </Text>
          {!!item.description && <Text style={s.description}>{item.description}</Text>}
        </View>
        {owned ? (
          <View style={s.actions}>
            {equipped && (
              <View style={s.status}>
                <Check size={16} color={colors.green} />
                <Text style={s.statusText}>{tr('On your profile')}</Text>
              </View>
            )}
            <Button
              title={equipped ? tr('Remove {kind}', { kind }) : tr('Use this {kind}', { kind })}
              variant={equipped ? 'secondary' : 'purple'}
              loading={equip.isPending}
              disabled={!isOnline}
              onPress={toggle}
            />
          </View>
        ) : (
          <View style={s.actions}>
            <View style={s.priceRow}>
              <Text style={common.muted}>{tr('Price')}</Text>
              <Text style={s.price}>{formatPrice(item.priceCents)}</Text>
            </View>
            <View style={s.notice}>
              <Text style={common.text}>{tr("Purchases aren't available yet.")}</Text>
              <Text style={common.muted}>
                {tr(
                  'Items you already own can be used right away. New items will be buyable here once checkout opens.',
                )}
              </Text>
            </View>
          </View>
        )}
        {equip.isError && (
          <ErrorNotice
            message={tr("Your profile wasn't updated. Check your connection and try again.")}
          />
        )}
        {message && (
          <Text style={s.message} accessibilityLiveRegion="polite" aria-live="polite">
            {message}
          </Text>
        )}
        {!isOnline && owned && (
          <Text style={s.offline}>{tr('Connect to the internet to change your profile.')}</Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { padding: 20, gap: 20 },
  stage: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  meta: { gap: 8 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  rarity: { fontSize: 12, fontWeight: '700' },
  title: { color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  description: { color: colors.text, fontSize: 15, lineHeight: 22, opacity: 0.85 },
  actions: { gap: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: colors.green, fontSize: 14, fontWeight: '600' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  price: { color: colors.text, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  notice: {
    gap: 6,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  message: { color: '#d8b4fe', fontSize: 14 },
  offline: { color: colors.muted, fontSize: 13, textAlign: 'center' },
});
