import * as React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Check, CheckCheck, Clock, Lock, RotateCcw } from 'lucide-react-native';
import type { AttachmentView, MessageView } from '@social-network/shared-contracts';
import { colors, common } from '../../feed/ui/primitives';
import { messageStatus, type ChatMessage } from '../model/chat';
import { useDecryptedBody } from '../model/queries';
import { formatDate, plural, tr } from '@/shared/lib/i18n';

export interface DecodedBody {
  text: string;
  locked: boolean;
}

function useDecodedText(
  userId: string,
  message: Pick<MessageView, 'id' | 'body' | 'sender' | 'isDeleted' | 'attachments'>,
  conversationId: string,
  peerUserId: string | null,
) {
  const decrypted = useDecryptedBody(userId, message, conversationId, peerUserId);
  const result = decrypted.data;
  const locked = !!result && result.status !== 'plain' && result.status !== 'decrypted';
  const text = message.isDeleted
    ? tr('Message deleted')
    : decrypted.isPending
      ? tr('Decrypting…')
      : locked
        ? result?.status === 'replay'
          ? tr('Duplicate encrypted message hidden')
          : tr('Can’t decrypt on this device')
        : (result?.text ?? '');
  return { text, locked, keyChangedUserId: result?.keyChangedUserId, pending: decrypted.isPending };
}

function ReplyQuote({
  reply,
  userId,
  conversationId,
  peerUserId,
  own,
  onPress,
  onLongPress,
}: {
  reply: MessageView;
  userId: string;
  conversationId: string;
  peerUserId: string | null;
  own: boolean;
  onPress: (id: string) => void;
  onLongPress: () => void;
}) {
  const decoded = useDecodedText(userId, reply, conversationId, peerUserId);
  const name =
    reply.sender.id === userId ? 'You' : reply.sender.displayName || reply.sender.username;
  const snippet = decoded.text || (reply.attachments.length ? tr('Photo') : tr('Message'));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr('Reply to {name}: {text}. Show original', { name, text: snippet })}
      onPress={() => onPress(reply.id)}
      onLongPress={onLongPress}
      delayLongPress={300}
      style={[s.quote, own ? s.quoteOwn : s.quoteTheirs]}
    >
      <Text style={s.quoteName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[s.quoteText, decoded.locked && s.italic]} numberOfLines={2}>
        {snippet}
      </Text>
    </Pressable>
  );
}

function Images({
  images,
  onOpen,
  onLongPress,
}: {
  images: AttachmentView[];
  onOpen: (images: AttachmentView[], index: number) => void;
  onLongPress: () => void;
}) {
  const many = images.length > 1;
  return (
    <View style={[s.images, many && s.imagesGrid]}>
      {images.slice(0, 4).map((image, index) => {
        const ratio = image.width && image.height ? image.width / image.height : 1;
        return (
          <Pressable
            key={image.id}
            accessibilityRole="imagebutton"
            accessibilityLabel={tr('Photo {index} of {count}. Open full screen', {
              index: index + 1,
              count: images.length,
            })}
            onPress={() => onOpen(images, index)}
            onLongPress={onLongPress}
            delayLongPress={300}
            style={[
              s.imageCell,
              many ? s.imageHalf : { aspectRatio: Math.min(Math.max(ratio, 0.6), 1.8) },
            ]}
          >
            <Image
              source={{ uri: image.thumbnailUrl || image.url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            {index === 3 && images.length > 4 && (
              <View style={s.more}>
                <Text style={s.moreText}>+{images.length - 4}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  userId,
  conversationId,
  peerUserId,
  showSender,
  highlighted,
  onRetry,
  onKeyChanged,
  onLongPress,
  onOpenImages,
  onToggleReaction,
  onShowReply,
}: {
  message: ChatMessage;
  userId: string;
  conversationId: string;
  peerUserId: string | null;
  showSender: boolean;
  highlighted: boolean;
  onRetry: (message: ChatMessage) => void;
  onKeyChanged: (userId: string) => void;
  onLongPress: (message: ChatMessage, decoded: DecodedBody) => void;
  onOpenImages: (images: AttachmentView[], index: number) => void;
  onToggleReaction: (message: ChatMessage, emoji: string) => void;
  onShowReply: (messageId: string) => void;
}) {
  const own = message.sender.id === userId;
  const decoded = useDecodedText(userId, message, conversationId, peerUserId);
  React.useEffect(() => {
    if (decoded.keyChangedUserId) onKeyChanged(decoded.keyChangedUserId);
  }, [decoded.keyChangedUserId, onKeyChanged]);
  const images = message.isDeleted
    ? []
    : message.attachments.filter(
        (attachment) =>
          attachment.type === 'IMAGE' || attachment.mimeType?.startsWith('image/') === true,
      );
  const otherFiles = message.isDeleted ? 0 : message.attachments.length - images.length;
  const status = own ? messageStatus(message, userId) : null;
  const time = formatDate(message.createdAt, { hour: 'numeric', minute: '2-digit' });
  const muted = decoded.locked || message.isDeleted;
  const statusLabel =
    status === 'sending'
      ? tr('Sending')
      : status === 'failed'
        ? tr('Not sent')
        : status === 'read'
          ? tr('Read')
          : status === 'sent'
            ? tr('Sent')
            : '';
  const sender = own ? tr('You') : message.sender.displayName || message.sender.username;
  const body = decoded.text;
  const openActions = () => {
    if (!message.isDeleted && !message.localStatus)
      onLongPress(message, { text: body, locked: decoded.locked });
  };

  return (
    <View style={[s.row, own ? s.ownRow : s.theirRow]}>
      {showSender && (
        <Text style={s.sender} numberOfLines={1}>
          {sender}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[
          `${sender}: ${body || (images.length ? plural(images.length, { one: '{count} photo', other: '{count} photos' }) : '')}`,
          time,
          message.isEdited ? tr('edited') : '',
          statusLabel,
        ]
          .filter(Boolean)
          .join('. ')}
        accessibilityHint={tr('Long press for reply, reactions and more')}
        disabled={message.isDeleted || !!message.localStatus}
        delayLongPress={300}
        onLongPress={openActions}
        style={[
          s.bubble,
          own ? s.ownBubble : s.theirBubble,
          muted && s.mutedBubble,
          images.length > 0 && s.mediaBubble,
          highlighted && s.highlighted,
        ]}
      >
        {message.replyTo && !message.isDeleted && (
          <ReplyQuote
            reply={message.replyTo}
            userId={userId}
            conversationId={conversationId}
            peerUserId={peerUserId}
            own={own}
            onPress={onShowReply}
            onLongPress={openActions}
          />
        )}
        {images.length > 0 && (
          <Images images={images} onOpen={onOpenImages} onLongPress={openActions} />
        )}
        {decoded.locked && <Lock size={13} color={colors.muted} />}
        {(!!body || (!images.length && !otherFiles)) && (
          <Text
            style={[s.text, muted && s.mutedText, images.length > 0 && s.caption]}
            selectable={!muted}
          >
            {body || tr('Message')}
          </Text>
        )}
        {otherFiles > 0 && (
          <Text style={[s.text, s.mutedText]}>
            {otherFiles === 1 ? 'File' : `${otherFiles} files`} · open on the web
          </Text>
        )}
        <View style={[s.meta, images.length > 0 && !body && s.metaOverlay]}>
          {message.isEdited && !message.isDeleted && <Text style={s.metaText}>{tr('edited')}</Text>}
          <Text style={s.metaText}>{time}</Text>
          {status === 'sending' && <Clock size={12} color="#e9d5ffb3" />}
          {status === 'sent' && <Check size={13} color="#e9d5ffb3" />}
          {status === 'read' && <CheckCheck size={13} color="#e9d5ff" />}
          {status === 'failed' && <AlertTriangle size={13} color={colors.danger} />}
        </View>
      </Pressable>
      {message.reactions.length > 0 && !message.isDeleted && (
        <View style={[s.reactions, own && s.reactionsOwn]}>
          {message.reactions.map((reaction) => (
            <Pressable
              key={reaction.emoji}
              accessibilityRole="button"
              accessibilityState={{ selected: reaction.selfReacted }}
              accessibilityLabel={
                reaction.selfReacted
                  ? tr('{emoji} {count}, you reacted. Remove', {
                      emoji: reaction.emoji,
                      count: reaction.count,
                    })
                  : tr('{emoji} {count}. React', { emoji: reaction.emoji, count: reaction.count })
              }
              onPress={() => onToggleReaction(message, reaction.emoji)}
              style={({ pressed }) => [
                s.reaction,
                reaction.selfReacted && s.reactionSelf,
                pressed && common.pressed,
              ]}
            >
              <Text style={s.reactionEmoji}>{reaction.emoji}</Text>
              <Text style={s.reactionCount}>{reaction.count}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {status === 'failed' && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onRetry(message)}
          style={({ pressed }) => [s.retry, pressed && common.pressed]}
        >
          <RotateCcw size={13} color={colors.danger} />
          <Text style={s.retryText}>{tr('Not sent. Tap to retry')}</Text>
        </Pressable>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  row: { marginTop: 4, maxWidth: '82%' },
  ownRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirRow: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: {
    color: '#d8b4fe',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 12,
    marginBottom: 2,
    marginTop: 6,
  },
  bubble: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6, borderRadius: 20, gap: 4 },
  ownBubble: { backgroundColor: '#7c3aed', borderBottomRightRadius: 6 },
  theirBubble: { backgroundColor: '#1c1c21', borderBottomLeftRadius: 6 },
  mutedBubble: { backgroundColor: '#16161a', borderWidth: 1, borderColor: colors.border },
  mediaBubble: { paddingHorizontal: 4, paddingTop: 4, minWidth: 220 },
  highlighted: { borderWidth: 2, borderColor: '#fbbf24' },
  text: { color: '#fff', fontSize: 15, lineHeight: 21 },
  caption: { paddingHorizontal: 10 },
  mutedText: { color: colors.muted, fontStyle: 'italic' },
  italic: { fontStyle: 'italic' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  metaOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#00000080',
  },
  metaText: { color: '#e9d5ffb3', fontSize: 11, fontVariant: ['tabular-nums'] },
  quote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    paddingRight: 6,
    borderRadius: 8,
    minWidth: 120,
  },
  quoteOwn: { borderLeftColor: '#e9d5ff', backgroundColor: '#ffffff1f' },
  quoteTheirs: { borderLeftColor: colors.purple, backgroundColor: '#ffffff0d' },
  quoteName: { color: '#e9d5ff', fontSize: 12, fontWeight: '700' },
  quoteText: { color: '#ffffffcc', fontSize: 13, lineHeight: 18 },
  images: { borderRadius: 16, overflow: 'hidden' },
  imagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, width: 240 },
  imageCell: { width: 240, backgroundColor: '#26262c', overflow: 'hidden' },
  imageHalf: { width: 119, height: 119 },
  more: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000099',
  },
  moreText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  reactionsOwn: { justifyContent: 'flex-end' },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#1c1c21',
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionSelf: { backgroundColor: '#a855f72e', borderColor: '#a855f780' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  retryText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
});
