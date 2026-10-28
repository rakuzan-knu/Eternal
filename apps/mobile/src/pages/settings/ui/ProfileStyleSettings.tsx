import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Award, Check } from 'lucide-react-native';
import { colors, common, ErrorNotice } from '../../feed/ui/primitives';
import { ownedBadges } from '../model/badges';
import { useMe, useSetPrimaryBadge, useUpdateProfileStyle } from '../model/settings';
import { QueryState, SettingsGroup, SettingsPage, SettingsRow } from './SettingsKit';
import { msg, tr } from '@/shared/lib/i18n';

const THEMES = [
  { id: 'default', name: msg('Eternal'), primary: '#1e1f22', accent: '#111214' },
  { id: 'twilight', name: msg('Royal twilight'), primary: '#3c2378', accent: '#eae5d8' },
  { id: 'blurple', name: msg('Midnight blurple'), primary: '#5865F2', accent: '#1e1f22' },
  { id: 'neon', name: msg('Dark neon'), primary: '#7928CA', accent: '#FF0080' },
  { id: 'emerald', name: msg('Emerald dusk'), primary: '#064e3b', accent: '#34d399' },
  { id: 'coral', name: msg('Sunset coral'), primary: '#881337', accent: '#fbbf24' },
  { id: 'ice', name: msg('Cyber ice'), primary: '#0c4a6e', accent: '#38bdf8' },
  { id: 'sakura', name: msg('Sakura dream'), primary: '#831843', accent: '#fbcfe8' },
  { id: 'noir', name: msg('Obsidian noir'), primary: '#18181b', accent: '#09090b' },
] as const;

const same = (a?: string | null, b?: string | null) =>
  (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

export function ProfileStyleSettings({
  userId,
  isOnline,
  active,
  onBack,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
}) {
  const me = useMe(userId);
  const badge = useSetPrimaryBadge(userId);
  const style = useUpdateProfileStyle(userId);
  const profile = me.data;
  const badges = React.useMemo(() => ownedBadges(profile?.badges ?? []), [profile?.badges]);
  const selectedBadge = badge.isPending ? badge.variables : (profile?.primaryBadge ?? null);
  const theme = style.isPending ? style.variables.profileTheme : profile?.profileTheme;

  return (
    <SettingsPage
      title={tr('Badges & colors')}
      active={active}
      onBack={onBack}
      testID="mobile-settings-style"
    >
      {!profile ? (
        <QueryState query={me} />
      ) : (
        <>
          <SettingsGroup
            title={tr('Badge next to your name')}
            footer={
              badges.length
                ? tr('Your badge shows next to your name on posts, comments and chats.')
                : tr('Badges are earned through Premium, contributions and community roles.')
            }
          >
            {badges.length === 0 ? (
              <SettingsRow Icon={Award} label={tr("You don't have badges yet")} />
            ) : (
              [
                { id: null, name: tr('No badge'), description: tr('Show only your name') },
                ...badges,
              ].map((item) => {
                const selected = same(item.id, selectedBadge);
                return (
                  <Pressable
                    key={item.id ?? 'none'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: !isOnline }}
                    aria-checked={selected}
                    disabled={!isOnline || badge.isPending}
                    onPress={() => !selected && badge.mutate(item.id)}
                    style={({ pressed }) => [s.option, pressed && s.pressed]}
                  >
                    <View style={[s.badgeIcon, !item.id && s.badgeNone]}>
                      <Award size={18} color={item.id ? '#fde68a' : colors.muted} />
                    </View>
                    <View style={common.flex}>
                      <Text style={s.label}>{item.name}</Text>
                      <Text style={common.muted}>{item.description}</Text>
                    </View>
                    {selected && <Check size={20} color={colors.purple} />}
                  </Pressable>
                );
              })
            )}
          </SettingsGroup>
          {badge.isError && <ErrorNotice message={tr("Your badge wasn't changed. Try again.")} />}

          <View style={s.block}>
            <Text accessibilityRole="header" style={s.title}>
              {tr('Profile colors')}
            </Text>
            <Text style={common.muted}>
              {tr('Colors your profile header for everyone who visits.')}
            </Text>
            <View style={s.grid} accessibilityRole="radiogroup">
              {THEMES.map((item) => {
                const selected =
                  item.id === 'default'
                    ? !theme ||
                      (same(theme.primary, item.primary) && same(theme.accent, item.accent))
                    : !!theme &&
                      same(theme.primary, item.primary) &&
                      same(theme.accent, item.accent);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityLabel={tr(item.name)}
                    accessibilityState={{ checked: selected, disabled: !isOnline }}
                    aria-checked={selected}
                    disabled={!isOnline || style.isPending}
                    onPress={() =>
                      !selected &&
                      style.mutate({
                        profileTheme:
                          item.id === 'default'
                            ? null
                            : { primary: item.primary, accent: item.accent },
                      })
                    }
                    style={({ pressed }) => [
                      s.swatch,
                      selected && s.swatchOn,
                      pressed && s.pressed,
                    ]}
                  >
                    <View style={[s.preview, { backgroundColor: item.primary }]}>
                      <View style={[s.previewAccent, { backgroundColor: item.accent }]} />
                      {selected && (
                        <View style={s.tick}>
                          <Check size={14} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={s.swatchName} numberOfLines={1}>
                      {tr(item.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {style.isError && <ErrorNotice message={tr("Your colors weren't saved. Try again.")} />}
            <Text style={common.muted}>
              {tr('Name fonts, effects, frames and nameplates are edited on the web.')}
            </Text>
          </View>
        </>
      )}
    </SettingsPage>
  );
}

const s = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.7 },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fbbf241a',
  },
  badgeNone: { backgroundColor: '#ffffff0d' },
  label: { color: colors.text, fontSize: 15, fontWeight: '500' },
  block: { gap: 8 },
  title: { color: colors.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  swatch: {
    width: '31%',
    flexGrow: 1,
    gap: 6,
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  swatchOn: { borderColor: colors.purple },
  preview: { height: 52, borderRadius: 11, overflow: 'hidden', justifyContent: 'flex-end' },
  previewAccent: { height: 14 },
  tick: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  swatchName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
});
