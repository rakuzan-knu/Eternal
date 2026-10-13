import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Film, ImagePlus, SquarePen } from 'lucide-react-native';
import { colors, common } from './primitives';

export type CreateType = 'post' | 'story' | 'reel';

export function CreateMenu({ onSelect }: { onSelect: (type: CreateType) => void }) {
  return (
    <View style={s.content}>
      <Text style={common.muted}>What would you like to share?</Text>
      {[
        {
          type: 'post' as const,
          title: 'Post',
          description: 'Share an update, photos or a poll',
          Icon: SquarePen,
        },
        {
          type: 'story' as const,
          title: 'Story',
          description: 'Share a moment for 24 hours',
          Icon: ImagePlus,
        },
        {
          type: 'reel' as const,
          title: 'Reel',
          description: 'Share a short vertical video',
          Icon: Film,
        },
      ].map(({ type, title, description, Icon }) => (
        <Pressable
          key={type}
          accessibilityRole="button"
          accessibilityLabel={`Create ${title.toLowerCase()}`}
          accessibilityHint={description}
          onPress={() => onSelect(type)}
          style={({ pressed }) => [s.option, pressed && common.pressed]}
        >
          <View style={s.icon}>
            <Icon size={24} color="#c084fc" />
          </View>
          <View style={common.flex}>
            <Text style={common.title}>{title}</Text>
            <Text style={common.muted}>{description}</Text>
          </View>
          <ChevronRight size={20} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 88,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#ffffff05',
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f71a',
  },
});
