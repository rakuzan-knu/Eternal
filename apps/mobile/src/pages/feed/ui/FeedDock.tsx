import * as React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Film, Home, MessageSquare, Music2, UserRound } from 'lucide-react-native';
import { webOrigin } from '@/shared/api/client';
import { colors } from './primitives';

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
  busy,
  profileOpen,
  onHome,
  onProfile,
  onError,
}: {
  home: boolean;
  saved?: boolean;
  busy: boolean;
  profileOpen: boolean;
  onHome: () => void;
  onProfile: () => void;
  onError: (failed: boolean) => void;
}) {
  const items = [
    { label: 'Home', Icon: Home, action: onHome, active: home, disabled: busy },
    { label: 'Reels', Icon: Film, path: '/reels' },
    { label: 'Chats', accessibleLabel: 'Messages', Icon: MessageSquare, path: '/messages' },
    { label: 'Music', accessibleLabel: 'Music Hub', Icon: Music2, path: '/music' },
    {
      label: 'Profile',
      accessibleLabel: saved ? 'Profile, Saved posts' : 'Profile',
      Icon: UserRound,
      action: onProfile,
      expanded: profileOpen,
      active: saved,
    },
  ];
  return (
    <View style={s.dock} accessibilityLabel="Main navigation">
      {items.map(({ label, accessibleLabel, Icon, action, path, active, disabled, expanded }) => (
        <Pressable
          key={label}
          accessibilityRole={path ? 'link' : 'button'}
          accessibilityLabel={
            active && label === 'Home' ? 'Home, current page' : (accessibleLabel ?? label)
          }
          accessibilityHint={
            path
              ? 'Opens in the web app'
              : label === 'Profile'
                ? 'Opens your profile menu'
                : undefined
          }
          accessibilityState={{ selected: !!active, disabled: !!disabled, expanded }}
          aria-expanded={expanded}
          disabled={disabled}
          onPress={
            action ??
            (() => {
              if (path) void openWebSection(path, onError);
            })
          }
          style={({ pressed }) => [
            s.item,
            active && s.active,
            pressed && s.pressed,
            disabled && s.disabled,
          ]}
        >
          <Icon size={22} color={active ? colors.text : colors.muted} />
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
});
