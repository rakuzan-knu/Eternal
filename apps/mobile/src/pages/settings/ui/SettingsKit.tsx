import * as React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, Check, ChevronRight, WifiOff, type LucideIcon } from 'lucide-react-native';
import { colors, common, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import { type MessageKey, tr } from '@/shared/lib/i18n';

export function SettingsPage({
  title,
  active,
  onBack,
  children,
  testID,
}: {
  title: string;
  active: boolean;
  onBack: () => void;
  children: React.ReactNode;
  testID?: string;
}) {
  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${title} • Eternal`;
  }, [active, title]);
  return (
    <View style={s.screen} testID={testID}>
      <View style={s.topBar}>
        <IconButton label={tr('Back')} onPress={onBack}>
          <ArrowLeft size={22} color={colors.text} />
        </IconButton>
        <Text accessibilityRole="header" style={s.topTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={s.spacer} />
      </View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function QueryState({
  query,
}: {
  query: { isPending: boolean; isError: boolean; fetchStatus: string; refetch: () => unknown };
}) {
  if (query.isPending && query.fetchStatus === 'paused')
    return (
      <View style={s.state}>
        <WifiOff size={22} color={colors.muted} />
        <Text style={s.stateText}>
          {tr("You're offline. Connect to the internet to load this.")}
        </Text>
      </View>
    );
  if (query.isPending)
    return (
      <ActivityIndicator
        color={colors.purple}
        style={s.loader}
        accessibilityLabel={tr('Loading')}
      />
    );
  return (
    <ErrorNotice
      message={tr("This couldn't be loaded.")}
      onRetry={() => {
        void query.refetch();
      }}
    />
  );
}

export function SettingsGroup({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={s.group}>
      {title && (
        <Text accessibilityRole="header" style={s.groupTitle}>
          {title}
        </Text>
      )}
      <View style={s.surface}>
        {items.map((child, index) => (
          <React.Fragment key={index}>
            {index > 0 && <View style={s.divider} />}
            {child}
          </React.Fragment>
        ))}
      </View>
      {footer && <Text style={s.footer}>{footer}</Text>}
    </View>
  );
}

export function SettingsRow({
  Icon,
  label,
  detail,
  value,
  danger,
  disabled,
  onPress,
  accessory,
}: {
  Icon?: LucideIcon;
  label: string;
  detail?: string | null;
  value?: string | null;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessory?: React.ReactNode;
}) {
  const body = (
    <>
      {Icon && (
        <View style={[s.icon, danger && s.iconDanger]}>
          <Icon size={18} color={danger ? colors.danger : colors.text} />
        </View>
      )}
      <View style={common.flex}>
        <Text style={[s.label, danger && s.labelDanger]}>{label}</Text>
        {!!detail && <Text style={s.detail}>{detail}</Text>}
      </View>
      {!!value && (
        <Text style={s.value} numberOfLines={1}>
          {value}
        </Text>
      )}
      {accessory}
      {onPress && !accessory && <ChevronRight size={18} color={colors.muted} />}
    </>
  );
  if (!onPress) return <View style={s.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={detail ?? undefined}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && s.pressed, disabled && s.disabled]}
    >
      {body}
    </Pressable>
  );
}

export function ToggleRow({
  Icon,
  label,
  detail,
  value,
  disabled,
  onChange,
}: {
  Icon?: LucideIcon;
  label: string;
  detail?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={detail}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [s.row, pressed && s.pressed, disabled && s.disabled]}
    >
      {Icon && (
        <View style={s.icon}>
          <Icon size={18} color={colors.text} />
        </View>
      )}
      <View style={common.flex}>
        <Text style={s.label}>{label}</Text>
        {!!detail && <Text style={s.detail}>{detail}</Text>}
      </View>
      <View style={[s.track, value && s.trackOn]}>
        <View style={[s.thumb, value && s.thumbOn]} />
      </View>
    </Pressable>
  );
}

export type Choice<T extends string> = { value: T; label: MessageKey; detail?: MessageKey };

export function choiceLabel<T extends string>(
  choices: readonly Choice<T>[],
  value: T | null | undefined,
) {
  const choice = choices.find((item) => item.value === value);
  return choice ? tr(choice.label) : null;
}

export function ChoiceSheet<T extends string>({
  title,
  description,
  value,
  choices,
  onPick,
  onClose,
}: {
  title: string;
  description?: string;
  value: T;
  choices: readonly Choice<T>[];
  onPick: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <ScrollView contentContainerStyle={s.content}>
        {description && <Text style={s.lead}>{description}</Text>}
        <View style={s.surface} accessibilityRole="radiogroup">
          {choices.map((choice, index) => {
            const selected = choice.value === value;
            return (
              <React.Fragment key={choice.value}>
                {index > 0 && <View style={s.divider} />}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  onPress={() => {
                    onPick(choice.value);
                    onClose();
                  }}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                >
                  <View style={common.flex}>
                    <Text style={s.label}>{tr(choice.label)}</Text>
                    {!!choice.detail && <Text style={s.detail}>{tr(choice.detail)}</Text>}
                  </View>
                  {selected && <Check size={20} color={colors.purple} />}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </Sheet>
  );
}

export const settingsStyles = StyleSheet.create({
  lead: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  form: { gap: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  confirm: {
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f8717133',
    backgroundColor: '#f871710d',
  },
  success: { color: colors.green, fontSize: 13, lineHeight: 19 },
});

const s = StyleSheet.create({
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
  spacer: { width: 44 },
  topTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 48, gap: 24 },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  state: { alignItems: 'center', gap: 8, padding: 32 },
  stateText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  loader: { padding: 32 },
  group: { gap: 8 },
  groupTitle: { color: colors.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: 4 },
  surface: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pressed: { backgroundColor: '#ffffff08' },
  disabled: { opacity: 0.45 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff0d',
  },
  iconDanger: { backgroundColor: '#f8717114' },
  label: { color: colors.text, fontSize: 15, fontWeight: '500' },
  labelDanger: { color: colors.danger },
  detail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  value: { color: colors.muted, fontSize: 14, maxWidth: 140 },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    backgroundColor: '#47404f',
  },
  trackOn: { backgroundColor: '#9852ee' },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff' },
  thumbOn: { transform: [{ translateX: 18 }] },
});
