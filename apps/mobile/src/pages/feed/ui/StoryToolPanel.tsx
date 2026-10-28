import * as React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { Check, X } from 'lucide-react-native';
import { colors, common, IconButton } from './primitives';
import { tr } from '@/shared/lib/i18n';

export function StoryToolPanel({
  title,
  onClose,
  onSave,
  saveDisabled,
  children,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={s.panel} accessibilityViewIsModal testID="story-tool-panel">
      <View style={s.header}>
        <IconButton label={tr('Cancel {name}', { name: title })} onPress={onClose}>
          <X size={21} color="white" />
        </IconButton>
        <Text accessibilityRole="header" style={common.title}>
          {title}
        </Text>
        {onSave ? (
          <IconButton
            label={tr('Save {name}', { name: title })}
            disabled={saveDisabled}
            onPress={onSave}
          >
            <Check size={22} color={colors.green} />
          </IconButton>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}
export function StoryField({
  label,
  value,
  onChange,
  maxLength = 128,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  maxLength?: number;
  multiline?: boolean;
  keyboardType?: 'default' | 'url' | 'numeric';
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={common.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        maxLength={maxLength}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'url' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'url'}
        placeholder={label}
        placeholderTextColor={colors.muted}
        style={[s.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}
export function StoryChoices<T extends string>({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={common.muted}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {values.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${item}`}
            aria-pressed={item === value}
            accessibilityState={{ selected: item === value }}
            onPress={() => onChange(item)}
            style={[s.choice, item === value && s.selected]}
          >
            <Text style={common.text}>{item.charAt(0).toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
export function StoryColorPicker({
  label,
  value,
  onChange,
  colors: palette,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  colors: readonly string[];
}) {
  const [hex, setHex] = React.useState(value);
  React.useEffect(() => setHex(value), [value]);
  return (
    <View style={{ gap: 6 }}>
      <Text style={common.muted}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 2 }}
      >
        {palette.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${color}`}
            accessibilityState={{ selected: value === color }}
            aria-pressed={value === color}
            onPress={() => onChange(color)}
            style={s.swatchHit}
          >
            <View
              style={[
                s.swatch,
                {
                  backgroundColor: color,
                  borderWidth: value === color ? 3 : 1,
                  borderColor: value === color ? '#a855f7' : '#ffffff44',
                },
              ]}
            />
          </Pressable>
        ))}
      </ScrollView>
      <StoryField
        label={tr('Custom {name} (hex)', { name: label.toLowerCase() })}
        value={hex}
        onChange={(next) => {
          setHex(next);
          if (/^#[\da-f]{6}$/i.test(next)) onChange(next);
        }}
        maxLength={7}
      />
    </View>
  );
}
export function StoryRange({
  label,
  value,
  min = 0,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <View>
      <Text style={common.muted}>
        {label} · {Number(value.toFixed(1))}
      </Text>
      <Slider
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#a855f7"
        maximumTrackTintColor="#44444f"
        thumbTintColor="#fff"
        style={{ width: '100%', height: 44 }}
      />
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '78%',
    zIndex: 100,
    backgroundColor: '#15151dfc',
    borderWidth: 1,
    borderColor: '#ffffff26',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  input: {
    backgroundColor: '#ffffff08',
    borderWidth: 1,
    borderColor: '#ffffff20',
    borderRadius: 14,
    color: '#fff',
    padding: 12,
    minHeight: 48,
    fontSize: 15,
  },
  choice: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff20',
    justifyContent: 'center',
  },
  selected: { backgroundColor: '#a855f733', borderColor: '#a855f7' },
  swatchHit: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
});
