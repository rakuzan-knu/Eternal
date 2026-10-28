import * as React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';
import { colors, IconButton } from '../../feed/ui/primitives';
import { m } from './primitives';
import { tr } from '@/shared/lib/i18n';

export interface MusicMenuItem {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export function MusicMenu({
  title,
  items,
  onClose,
}: {
  title: string;
  items: MusicMenuItem[];
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onClose}
      accessibilityLabel={title}
    >
      <View style={s.backdrop}>
        <Pressable accessible={false} onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={s.sheet} accessibilityViewIsModal>
          <View style={[m.row, s.header]}>
            <Text accessibilityRole="header" style={[m.heading, m.flex]}>
              {title}
            </Text>
            <IconButton label={tr('Close {name}', { name: title })} onPress={onClose}>
              <X size={22} color={colors.text} />
            </IconButton>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.options}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: item.selected, disabled: item.disabled }}
                aria-pressed={item.selected}
                disabled={item.disabled}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
                style={({ pressed }) => [
                  s.item,
                  pressed && s.pressed,
                  item.selected && s.selected,
                  item.disabled && { opacity: 0.4 },
                ]}
              >
                {item.icon}
                <View style={m.flex}>
                  <Text style={s.label}>{item.label}</Text>
                  {!!item.description && <Text style={m.muted}>{item.description}</Text>}
                </View>
                {item.selected && <Check size={20} color={colors.purple} />}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0009' },
  sheet: {
    backgroundColor: '#17151c',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ffffff12',
  },
  header: { paddingLeft: 24, paddingRight: 12, paddingTop: 12, paddingBottom: 4 },
  options: { paddingHorizontal: 12, paddingBottom: 16 },
  item: {
    minHeight: 56,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  label: { color: colors.text, fontSize: 16, fontWeight: '500', lineHeight: 24 },
  selected: { backgroundColor: '#a56bff18' },
  pressed: { backgroundColor: '#ffffff0d' },
});
