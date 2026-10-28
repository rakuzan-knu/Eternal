import * as React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Film, Home, MessageSquare, Music2, UserRound } from 'lucide-react-native';
import { webOrigin } from '@/shared/api/client';
import { colors } from './primitives';
import { tr } from '@/shared/lib/i18n';

export async function openWebSection(path: string, onError: (failed: boolean) => void) {
  onError(false);
  try {
    await Linking.openURL(`${webOrigin}${path}`);
  } catch {
    onError(true);
  }
}

export function FeedDock({
  home,
  saved = false,
  music = false,
  reels = false,
  profile = false,
  chats = false,
  unreadChats = 0,
  onMusic,
  busy,
  onHome,
  onReels,
  onChats,
  onProfile,
}: {
  home: boolean;
  saved?: boolean;
  music?: boolean;
  reels?: boolean;
  profile?: boolean;
  chats?: boolean;
  unreadChats?: number;
  onMusic: () => void;
  busy: boolean;
  onHome: () => void;
  onReels: () => void;
  onChats: () => void;
  onProfile: () => void;
}) {
  const items: {
    label: string;
    accessibleLabel?: string;
    Icon: typeof Home;
    action: () => void;
    active?: boolean;
    disabled?: boolean;
    badge?: number;
  }[] = [
    { label: tr('Home'), Icon: Home, action: onHome, active: home, disabled: busy },
    { label: tr('Reels'), Icon: Film, action: onReels, active: reels },
    {
      label: tr('Chats'),
      accessibleLabel: unreadChats
        ? tr('Messages, {count} unread', { count: unreadChats })
        : tr('Messages'),
      Icon: MessageSquare,
      action: onChats,
      active: chats,
      badge: unreadChats,
    },
    {
      label: tr('Music'),
      accessibleLabel: tr('Music Hub'),
      Icon: Music2,
      action: onMusic,
      active: music,
      disabled: busy,
    },
    {
      label: tr('Profile'),
      accessibleLabel: saved ? tr('Profile, Saved posts') : tr('Profile'),
      Icon: UserRound,
      action: onProfile,
      active: profile || saved,
    },
  ];
  return (
    <View style={s.dock} accessibilityLabel={tr('Main navigation')}>
      {items.map(({ label, accessibleLabel, Icon, action, active, disabled, badge }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityLabel={
            active && label === tr('Home') ? tr('Home, current page') : (accessibleLabel ?? label)
          }
          accessibilityState={{ selected: !!active, disabled: !!disabled }}
          aria-current={active ? 'page' : undefined}
          disabled={disabled}
          onPress={action}
          style={({ pressed }) => [
            s.item,
            active && s.active,
            pressed && s.pressed,
            disabled && s.disabled,
          ]}
        >
          <View>
            <Icon size={22} color={active ? colors.text : colors.muted} />
            {!!badge && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            )}
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            style={[s.label, active && s.activeLabel]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  dock: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#ffffff14',
    backgroundColor: '#16161a',
  },
  item: {
    flex: 1,
    minWidth: 44,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
  },
  active: { backgroundColor: '#ffffff1a' },
  label: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  activeLabel: { color: colors.text },
  pressed: { backgroundColor: '#ffffff0d' },
  disabled: { opacity: 0.4 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
    borderWidth: 2,
    borderColor: '#16161a',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
