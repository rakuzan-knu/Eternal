import * as React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Copy, Pencil, Reply, Trash2 } from 'lucide-react-native';
import { Button } from '@/shared/ui';
import { colors, common } from '../../feed/ui/primitives';
import type { ChatMessage } from '../model/chat';
import type { DecodedBody } from './MessageBubble';
import { tr } from '@/shared/lib/i18n';

export const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'] as const;

type DeleteStep = null | 'confirm';

export function MessageActions({
  message,
  decoded,
  userId,
  isOnline,
  onClose,
  onReply,
  onEdit,
  onCopy,
  onReact,
  onDelete,
}: {
  message: ChatMessage;
  decoded: DecodedBody;
  userId: string;
  isOnline: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  onDelete: (forAll: boolean) => void;
}) {
  const [step, setStep] = React.useState<DeleteStep>(null);
  const own = message.sender.id === userId;
  const hasText = !decoded.locked && !!decoded.text;
  const actions = [
    { label: tr('Reply'), Icon: Reply, onPress: onReply, show: true },
    { label: tr('Copy text'), Icon: Copy, onPress: onCopy, show: hasText },
    { label: tr('Edit'), Icon: Pencil, onPress: onEdit, show: own && hasText && isOnline },
  ].filter((action) => action.show);
  const reacted = new Set(message.reactions.filter((r) => r.selfReacted).map((r) => r.emoji));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={s.backdrop}
        accessibilityRole="button"
        accessibilityLabel={tr('Close message actions')}
        onPress={onClose}
      />
      <SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal>
        <View style={s.handle} />
        {decoded.text ? (
          <Text style={s.preview} numberOfLines={2}>
            {decoded.locked ? tr('Encrypted message') : decoded.text}
          </Text>
        ) : null}
        {step === 'confirm' ? (
          <View style={s.confirm} accessibilityRole="alert">
            <Text style={common.title}>{tr('Delete this message?')}</Text>
            <Text style={common.muted}>
              {own
                ? tr(
                    'Delete for everyone removes it from the chat for all members. Delete for me only hides it on your devices.',
                  )
                : tr('It will be hidden only for you. Other members will still see it.')}
            </Text>
            {own && (
              <Button
                title={tr('Delete for everyone')}
                variant="danger"
                disabled={!isOnline}
                onPress={() => onDelete(true)}
              />
            )}
            <Button
              title={tr('Delete for me')}
              variant={own ? 'secondary' : 'danger'}
              disabled={!isOnline}
              onPress={() => onDelete(false)}
            />
            <Button title={tr('Cancel')} variant="ghost" onPress={() => setStep(null)} />
          </View>
        ) : (
          <>
            <View
              style={s.reactions}
              accessibilityRole="toolbar"
              accessibilityLabel={tr('Reactions')}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={
                    reacted.has(emoji)
                      ? tr('Remove {emoji}', { emoji })
                      : tr('React with {emoji}', { emoji })
                  }
                  accessibilityState={{ selected: reacted.has(emoji), disabled: !isOnline }}
                  disabled={!isOnline}
                  onPress={() => onReact(emoji)}
                  style={({ pressed }) => [
                    s.reaction,
                    reacted.has(emoji) && s.reactionActive,
                    pressed && common.pressed,
                    !isOnline && s.disabled,
                  ]}
                >
                  <Text style={s.emoji}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.list}>
              {actions.map(({ label, Icon, onPress }) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  onPress={onPress}
                  style={({ pressed }) => [s.item, pressed && s.pressed]}
                >
                  <Icon size={20} color={colors.text} />
                  <Text style={common.text}>{label}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityHint={tr('Asks you to confirm')}
                onPress={() => setStep('confirm')}
                style={({ pressed }) => [s.item, pressed && s.pressed]}
              >
                <Trash2 size={20} color={colors.danger} />
                <Text style={[common.text, s.danger]}>{tr('Delete')}</Text>
              </Pressable>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000a6' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: 620,
    alignSelf: 'center',
    width: '100%',
    backgroundColor: '#141417',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff33',
    marginTop: 8,
  },
  preview: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  reactions: { flexDirection: 'row', justifyContent: 'space-between' },
  reaction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f24',
  },
  reactionActive: { backgroundColor: '#a855f740', borderWidth: 1, borderColor: colors.purple },
  disabled: { opacity: 0.4 },
  emoji: { fontSize: 24 },
  list: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#1c1c21' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  pressed: { backgroundColor: '#ffffff0d' },
  danger: { color: colors.danger },
  confirm: { gap: 10, paddingVertical: 4 },
});
