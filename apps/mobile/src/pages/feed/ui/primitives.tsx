import * as React from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DefaultAvatar } from './DefaultAvatar';
import { X } from 'lucide-react-native';

export const colors = {
  background: '#070709',
  card: '#111111',
  border: '#ffffff0d',
  text: '#f3f4f6',
  muted: '#9ca3af',
  purple: '#a855f7',
  green: '#34d399',
  danger: '#fca5a5',
};

export function Avatar({
  name,
  uri,
  size = 42,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [uri]);
  return (
    <View
      style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityLabel={`${name}'s avatar`}
      accessibilityRole="image"
    >
      {uri && !failed ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} onError={() => setFailed(true)} />
      ) : (
        <DefaultAvatar size={size} />
      )}
    </View>
  );
}

export function IconButton({
  label,
  children,
  onPress,
  disabled,
  selected,
  style,
}: {
  label: string;
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected }}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, style, pressed && s.pressed, disabled && s.disabled]}
    >
      {children}
    </Pressable>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={s.errorText}>{message}</Text>
      {onRetry && (
        <Pressable accessibilityRole="button" onPress={onRetry} style={s.retry}>
          <Text style={s.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function Sheet({
  title,
  children,
  onClose,
  closeDisabled = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <Modal
      visible
      accessibilityLabel={title}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!closeDisabled) onClose();
      }}
    >
      <SafeAreaView style={s.sheet} testID="feed-sheet" accessibilityViewIsModal>
        <View style={s.sheetHeader}>
          <Text accessibilityRole="header" style={s.sheetTitle}>
            {title}
          </Text>
          <IconButton label={`Close ${title}`} disabled={closeDisabled} onPress={onClose}>
            <X size={22} color={colors.text} />
          </IconButton>
        </View>
        <KeyboardAvoidingView
          style={s.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export const common = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: colors.text, fontSize: 15, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  title: { color: colors.text, fontWeight: '700', fontSize: 16 },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.65 },
});

const s = StyleSheet.create({
  flex: { flex: 1 },
  avatar: {
    backgroundColor: '#09090b',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  initials: { color: '#d8b4fe', fontWeight: '700' },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  pressed: { backgroundColor: '#252529', opacity: 0.8 },
  disabled: { opacity: 0.4 },
  error: {
    backgroundColor: '#2a171c',
    borderWidth: 1,
    borderColor: '#573039',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 20 },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8 },
  retryText: { color: colors.text, fontWeight: '700' },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
});
