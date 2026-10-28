import * as React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { CommunitySummary } from '@social-network/shared-contracts';
import { colors, common } from '../../feed/ui/primitives';
import { initials, memberCountLabel } from '../model/communities';

export function CommunityAvatar({
  name,
  uri,
  size = 48,
}: {
  name: string;
  uri: string | null;
  size?: number;
}) {
  const [failed, setFailed] = React.useState(false);
  return (
    <View
      style={[s.avatar, { width: size, height: size, borderRadius: size * 0.3 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {uri && !failed ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
      ) : (
        <Text style={[s.initials, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

export function CommunityRow({
  community,
  onPress,
}: {
  community: CommunitySummary;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${community.name}, ${memberCountLabel(community.memberCount)}`}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <CommunityAvatar name={community.name} uri={community.avatar} />
      <View style={common.flex}>
        <Text style={common.title} numberOfLines={1}>
          {community.name}
        </Text>
        {!!community.description && (
          <Text style={s.description} numberOfLines={2}>
            {community.description}
          </Text>
        )}
        <Text style={common.muted}>{memberCountLabel(community.memberCount)}</Text>
      </View>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

export function Placeholder({
  Icon,
  title,
  text,
  action,
}: {
  Icon: LucideIcon;
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

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.sectionTitle}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export const communityStyles = StyleSheet.create({
  surface: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 76 },
});

const s = StyleSheet.create({
  avatar: {
    backgroundColor: '#2e1065',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: { color: '#e9d5ff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
  },
  pressed: { backgroundColor: '#ffffff08' },
  description: { color: colors.text, opacity: 0.8, fontSize: 13, lineHeight: 19 },
  placeholder: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 28 },
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
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
