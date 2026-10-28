import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQueryClient } from '@tanstack/react-query';
import type { AttachmentView } from '@social-network/shared-contracts';
import {
  ArrowLeft,
  Hash,
  ImagePlus,
  Lock,
  Pencil,
  Reply,
  Search,
  SearchX,
  Send,
  ShieldAlert,
  X,
} from 'lucide-react-native';
import { Button, Input } from '@/shared/ui';
import { haptics } from '@/shared/lib/haptics';
import { copyText } from '@/shared/lib/clipboard';
import { acceptPeerKeyChanges } from '@/shared/lib/e2ee/messageE2ee';
import { Avatar, colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { conversationDisplay, dayLabel, flattenMessages, type ChatMessage } from '../model/chat';
import {
  EditNotEncryptedError,
  SendBlockedError,
  chatKeys,
  newClientMessageId,
  useConversation,
  useDecryptedBody,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  useMessageSearch,
  useMessages,
  useReactToMessage,
  useSendMessage,
  useTypingEmitter,
  type SendInput,
} from '../model/queries';
import { activeTypers, useOpenConversation, useTypingStore } from '../model/socket';
import { setVisibleConversation } from '@/shared/lib/push';
import { ImageViewer } from './ImageViewer';
import { MessageActions } from './MessageActions';
import { MessageBubble, type DecodedBody } from './MessageBubble';
import { formatDate, plural, tr } from '@/shared/lib/i18n';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

type Row =
  | { kind: 'message'; message: ChatMessage; firstInRun: boolean }
  | { kind: 'day'; id: string; label: string };

function buildRows(messages: ChatMessage[]): Row[] {
  const rows: Row[] = [];
  messages.forEach((message, index) => {
    const older = messages[index + 1];
    const newDay = !older || dayLabel(older.createdAt) !== dayLabel(message.createdAt);
    rows.push({
      kind: 'message',
      message,
      firstInRun: newDay || older?.sender.id !== message.sender.id,
    });
    if (newDay)
      rows.push({ kind: 'day', id: `day-${message.id}`, label: dayLabel(message.createdAt) });
  });
  return rows;
}

type Mode =
  | { kind: 'reply'; message: ChatMessage; preview: string }
  | { kind: 'edit'; message: ChatMessage }
  | null;

export function ChatThreadScreen({
  userId,
  conversationId,
  isOnline,
  active,
  onBack,
  onOpenProfile,
  onOpenGroupInfo,
}: {
  userId: string;
  conversationId: string;
  isOnline: boolean;
  active: boolean;
  onBack: () => void;
  onOpenProfile: (username: string) => void;
  onOpenGroupInfo: (id: string) => void;
}) {
  const client = useQueryClient();
  const conversation = useConversation(userId, conversationId);
  const messagesQuery = useMessages(userId, conversationId);
  const display = conversation.data ? conversationDisplay(conversation.data, userId) : null;
  const peerUserId = conversation.data?.type === 'DIRECT' ? (display?.peerUserId ?? null) : null;
  const send = useSendMessage(userId, conversation.data, peerUserId);
  const edit = useEditMessage(userId, conversation.data, peerUserId);
  const remove = useDeleteMessage(userId, conversationId);
  const react = useReactToMessage(userId, conversationId);
  const markRead = useMarkRead(userId, conversationId);
  const typingEmitter = useTypingEmitter(userId, conversationId);
  const setOpen = useOpenConversation((state) => state.setId);
  const typers = activeTypers(useTypingStore((state) => state.typing[conversationId]));
  const [text, setText] = React.useState('');
  const [mode, setMode] = React.useState<Mode>(null);
  const [images, setImages] = React.useState<ImagePicker.ImagePickerAsset[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [keyChanged, setKeyChanged] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);
  const [actionsFor, setActionsFor] = React.useState<{
    message: ChatMessage;
    decoded: DecodedBody;
  } | null>(null);
  const [viewer, setViewer] = React.useState<{ images: AttachmentView[]; index: number } | null>(
    null,
  );
  const [searching, setSearching] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [highlight, setHighlight] = React.useState<string | null>(null);
  const search = useMessageSearch(userId, conversationId, searching ? searchText : '');
  const list = React.useRef<FlatList<Row>>(null);
  const input = React.useRef<TextInput>(null);
  const pendingSends = React.useRef(new Map<string, SendInput>());
  const messages = React.useMemo(() => flattenMessages(messagesQuery.data), [messagesQuery.data]);
  const rows = React.useMemo(() => buildRows(messages), [messages]);
  const newestIncoming = messages.find(
    (message) => message.sender.id !== userId && !message.localStatus,
  )?.id;
  const blocked = send.error instanceof SendBlockedError || !!keyChanged;
  const isDirect = conversation.data?.type === 'DIRECT';
  const isChannel = !!conversation.data?.communityId;
  const isGroup = conversation.data?.type === 'GROUP' && !isChannel;
  const archived = !!conversation.data?.communityChannelArchivedAt;
  const canSend = isOnline && !blocked && !archived && !!conversation.data;
  const title = display ? (isChannel ? `#${display.title}` : display.title) : tr('Chat');

  React.useEffect(() => {
    if (!active) return;
    setOpen(conversationId);
    setVisibleConversation(conversationId);
    return () => {
      setOpen(null);
      setVisibleConversation(null);
    };
  }, [active, conversationId, setOpen]);

  React.useEffect(() => {
    if (active && isOnline && newestIncoming) markRead.mutate();
  }, [active, isOnline, newestIncoming]);

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined' && display)
      document.title = `${display.title} • Eternal`;
  }, [active, display?.title]);

  React.useEffect(() => {
    if (!highlight) return;
    const timer = setTimeout(() => setHighlight(null), 2000);
    return () => clearTimeout(timer);
  }, [highlight]);

  const dispatch = (input: SendInput) => {
    pendingSends.current.set(input.clientMessageId, input);
    send.mutate(input, {
      onSuccess: () => pendingSends.current.delete(input.clientMessageId),
      onError: (error) => {
        if (error instanceof SendBlockedError) {
          pendingSends.current.delete(input.clientMessageId);
          setKeyChanged(error.peerUserId);
          setText(input.text);
          setImages(input.images ?? []);
        }
      },
    });
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!conversation.data) return;
    typingEmitter.stop();
    if (mode?.kind === 'edit') {
      if (!trimmed) return;
      const target = mode.message;
      setMode(null);
      setText('');
      edit.mutate(
        { message: target, text: trimmed },
        {
          onError: (error) => {
            setText(trimmed);
            setMode({ kind: 'edit', message: target });
            if (error instanceof SendBlockedError) setKeyChanged(error.peerUserId);
            setNotice(
              error instanceof EditNotEncryptedError
                ? tr(
                    'This message is end-to-end encrypted, so the edit was not saved unencrypted. Try again when the contact’s key is available.',
                  )
                : tr('Your edit wasn’t saved. Try again.'),
            );
          },
        },
      );
      return;
    }
    if (!trimmed && !images.length) return;
    haptics.light();
    setText('');
    setImages([]);
    const replyTo = mode?.kind === 'reply' ? mode.message : null;
    setMode(null);
    dispatch({ text: trimmed, clientMessageId: newClientMessageId(), replyTo, images });
  };

  const retry = React.useCallback((message: ChatMessage) => {
    const pending = message.clientMessageId
      ? pendingSends.current.get(message.clientMessageId)
      : undefined;
    dispatchRef.current(
      pending ?? {
        text: message.body ?? '',
        clientMessageId: message.clientMessageId ?? newClientMessageId(),
      },
    );
  }, []);
  const dispatchRef = React.useRef(dispatch);
  dispatchRef.current = dispatch;

  const acceptKey = async () => {
    const target =
      keyChanged ?? (send.error instanceof SendBlockedError ? send.error.peerUserId : null);
    if (!target) return;
    setAccepting(true);
    try {
      await acceptPeerKeyChanges(target);
      setKeyChanged(null);
      send.reset();
      await client.invalidateQueries({ queryKey: [...chatKeys.all(userId), 'decrypted'] });
    } finally {
      setAccepting(false);
    }
  };

  async function pickImages() {
    setNotice(null);
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice(tr('Allow photo library access in Settings to send photos.'));
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.85,
    });
    if (result.canceled) return;
    const picked = result.assets.slice(0, MAX_IMAGES - images.length);
    if (picked.some((asset) => (asset.fileSize ?? 0) > MAX_IMAGE_BYTES)) {
      setNotice(tr('Choose photos smaller than 20 MB.'));
      return;
    }
    setImages((current) => [...current, ...picked]);
  }

  const scrollTo = React.useCallback(
    async (messageId: string) => {
      setSearching(false);
      let index = rowsRef.current.findIndex(
        (row) => row.kind === 'message' && row.message.id === messageId,
      );
      for (let page = 0; index < 0 && page < 5 && messagesQuery.hasNextPage; page++) {
        await messagesQuery.fetchNextPage();
        await new Promise((resolve) => setTimeout(resolve, 50));
        index = rowsRef.current.findIndex(
          (row) => row.kind === 'message' && row.message.id === messageId,
        );
      }
      if (index < 0) {
        setNotice(tr('That message is further back than the history loaded on this device.'));
        return;
      }
      setHighlight(messageId);
      setTimeout(
        () => list.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true }),
        60,
      );
    },
    [messagesQuery],
  );
  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  const onLongPress = React.useCallback((message: ChatMessage, decoded: DecodedBody) => {
    haptics.medium();
    setActionsFor({ message, decoded });
  }, []);
  const onOpenImages = React.useCallback(
    (items: AttachmentView[], index: number) => setViewer({ images: items, index }),
    [],
  );
  const onToggleReaction = React.useCallback(
    (message: ChatMessage, emoji: string) => react.mutate({ message, emoji }),
    [react.mutate],
  );
  const onShowReply = React.useCallback((id: string) => void scrollTo(id), [scrollTo]);

  const header = searching ? (
    <View style={s.topBar}>
      <IconButton label={tr('Close search')} onPress={() => setSearching(false)}>
        <ArrowLeft size={22} color={colors.text} />
      </IconButton>
      <View style={common.flex}>
        <Input
          value={searchText}
          onChangeText={setSearchText}
          placeholder={tr('Search in this chat')}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          showClearButton
          onClear={() => setSearchText('')}
          accessibilityLabel={tr('Search in this chat')}
        />
      </View>
    </View>
  ) : (
    <View style={s.topBar}>
      <IconButton label={tr('Back')} onPress={onBack}>
        <ArrowLeft size={22} color={colors.text} />
      </IconButton>
      <Pressable
        accessibilityRole={display?.peerUsername || isGroup ? 'link' : 'header'}
        accessibilityLabel={
          display?.peerUsername
            ? tr('{title}, open profile', { title })
            : isGroup
              ? tr('{title}, group info', { title })
              : title
        }
        disabled={!display?.peerUsername && !isGroup}
        onPress={() =>
          display?.peerUsername
            ? onOpenProfile(display.peerUsername)
            : isGroup && onOpenGroupInfo(conversationId)
        }
        style={({ pressed }) => [s.identity, pressed && common.pressed]}
      >
        {isChannel ? (
          <View style={s.channelIcon}>
            <Hash size={18} color={colors.text} />
          </View>
        ) : (
          <Avatar name={title} uri={display?.avatar} size={36} />
        )}
        <View style={common.flex}>
          <Text style={s.name} numberOfLines={1}>
            {title}
          </Text>
          <View style={s.subRow}>
            {typers.length ? (
              <Text style={s.typing}>{tr('typing…')}</Text>
            ) : isDirect ? (
              <>
                <Lock size={11} color={colors.muted} />
                <Text style={common.muted}>{tr('End-to-end encrypted')}</Text>
              </>
            ) : isChannel ? (
              <Text style={common.muted}>
                {archived ? tr('Archived channel · read only') : tr('Community channel')}
              </Text>
            ) : conversation.data ? (
              <Text style={common.muted}>
                {plural(conversation.data.participants.length, {
                  one: '{count} member',
                  other: '{count} members',
                })}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      <IconButton
        label={tr('Search in this chat')}
        onPress={() => {
          setSearchText('');
          setSearching(true);
        }}
      >
        <Search size={21} color={colors.text} />
      </IconButton>
    </View>
  );

  if (conversation.isError && !conversation.data)
    return (
      <View style={s.screen} testID="mobile-chat-thread">
        {header}
        <View style={s.padded}>
          <ErrorNotice
            message={tr("This chat couldn't be opened.")}
            onRetry={() => {
              void conversation.refetch();
            }}
          />
        </View>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="mobile-chat-thread"
    >
      {header}
      {searching ? (
        <SearchResults
          userId={userId}
          conversationId={conversationId}
          peerUserId={peerUserId}
          search={search}
          isDirect={isDirect}
          onOpen={(id) => void scrollTo(id)}
        />
      ) : (
        <>
          {blocked && (
            <View style={s.keyBanner} accessibilityRole="alert">
              <ShieldAlert size={20} color="#fbbf24" />
              <View style={[common.flex, s.keyBannerBody]}>
                <Text style={common.title}>
                  {tr('{name}’s security key changed', {
                    name: display?.title ?? tr('This contact'),
                  })}
                </Text>
                <Text style={common.muted}>
                  {tr(
                    'This happens when they sign in on a new device or reinstall the app. Sending is paused until you accept the new key. If you didn’t expect this, check with them another way first.',
                  )}
                </Text>
                <Button
                  title={tr('Accept new key')}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  loading={accepting}
                  disabled={!isOnline}
                  onPress={() => {
                    void acceptKey();
                  }}
                />
              </View>
            </View>
          )}
          <FlatList
            ref={list}
            inverted
            data={rows}
            keyExtractor={(row) =>
              row.kind === 'day' ? row.id : (row.message.clientMessageId ?? row.message.id)
            }
            contentContainerStyle={s.list}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={({ index, averageItemLength }) => {
              list.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
              setTimeout(() => list.current?.scrollToIndex({ index, viewPosition: 0.5 }), 150);
            }}
            renderItem={({ item }) =>
              item.kind === 'day' ? (
                <Text style={s.day} accessibilityRole="header">
                  {item.label}
                </Text>
              ) : (
                <MessageBubble
                  message={item.message}
                  userId={userId}
                  conversationId={conversationId}
                  peerUserId={peerUserId}
                  showSender={!isDirect && item.firstInRun && item.message.sender.id !== userId}
                  highlighted={highlight === item.message.id}
                  onRetry={retry}
                  onKeyChanged={setKeyChanged}
                  onLongPress={onLongPress}
                  onOpenImages={onOpenImages}
                  onToggleReaction={onToggleReaction}
                  onShowReply={onShowReply}
                />
              )
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (
                messagesQuery.hasNextPage &&
                !messagesQuery.isFetching &&
                !messagesQuery.isError &&
                isOnline
              )
                void messagesQuery.fetchNextPage();
            }}
            ListFooterComponent={
              messagesQuery.isFetchingNextPage ? (
                <ActivityIndicator
                  color={colors.purple}
                  style={s.loader}
                  accessibilityLabel={tr('Loading earlier messages')}
                />
              ) : messagesQuery.isFetchNextPageError ? (
                <ErrorNotice
                  message={tr("Earlier messages couldn't be loaded.")}
                  onRetry={() => {
                    void messagesQuery.fetchNextPage();
                  }}
                />
              ) : null
            }
            ListEmptyComponent={
              messagesQuery.isPending ? (
                <ActivityIndicator
                  color={colors.purple}
                  style={s.loader}
                  accessibilityLabel={tr('Loading messages')}
                />
              ) : messagesQuery.isError ? (
                <ErrorNotice
                  message={tr("Messages couldn't be loaded.")}
                  onRetry={() => {
                    void messagesQuery.refetch();
                  }}
                />
              ) : (
                <View style={s.empty}>
                  <View style={s.emptyIcon}>
                    <Lock size={22} color={colors.purple} />
                  </View>
                  <Text style={[common.title, s.center]}>
                    {isDirect ? tr('Messages here are end-to-end encrypted') : tr('Say hello')}
                  </Text>
                  <Text style={s.emptyText}>
                    {isDirect
                      ? tr(
                          'Only you and the people you message can read them — not even Eternal. Photos are not end-to-end encrypted.',
                        )
                      : tr('Be the first to start the conversation.')}
                  </Text>
                </View>
              )
            }
          />
          {notice && (
            <View style={s.notice} accessibilityRole="alert">
              <Text style={[common.muted, common.flex]}>{notice}</Text>
              <IconButton label={tr('Dismiss')} onPress={() => setNotice(null)}>
                <X size={16} color={colors.muted} />
              </IconButton>
            </View>
          )}
          {mode && (
            <View style={s.modeBar}>
              {mode.kind === 'reply' ? (
                <Reply size={18} color={colors.purple} />
              ) : (
                <Pencil size={18} color={colors.purple} />
              )}
              <View style={common.flex}>
                <Text style={s.modeTitle}>
                  {mode.kind === 'reply'
                    ? tr('Replying to {name}', {
                        name:
                          mode.message.sender.id === userId
                            ? tr('yourself')
                            : mode.message.sender.displayName || mode.message.sender.username,
                      })
                    : tr('Editing message')}
                </Text>
                {mode.kind === 'reply' && (
                  <Text style={common.muted} numberOfLines={1}>
                    {mode.preview}
                  </Text>
                )}
              </View>
              <IconButton
                label={mode.kind === 'reply' ? tr('Cancel reply') : tr('Cancel editing')}
                onPress={() => {
                  if (mode.kind === 'edit') setText('');
                  setMode(null);
                }}
              >
                <X size={18} color={colors.muted} />
              </IconButton>
            </View>
          )}
          {images.length > 0 && (
            <View
              style={s.attachments}
              accessibilityLabel={`${images.length} photos ready to send`}
            >
              {images.map((image, index) => (
                <View key={image.uri} style={s.thumb}>
                  <Image
                    source={{ uri: image.uri }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tr('Remove photo {index}', { index: index + 1 })}
                    onPress={() => setImages((current) => current.filter((item) => item !== image))}
                    style={s.thumbRemove}
                    hitSlop={8}
                  >
                    <X size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={s.composer}>
            {mode?.kind !== 'edit' && (
              <IconButton
                label={tr('Add photos')}
                disabled={!canSend || images.length >= MAX_IMAGES}
                onPress={() => {
                  void pickImages();
                }}
              >
                <ImagePlus size={22} color={colors.muted} />
              </IconButton>
            )}
            <TextInput
              ref={input}
              value={text}
              onChangeText={(value) => {
                setText(value);
                if (value && mode?.kind !== 'edit') typingEmitter.ping();
                else typingEmitter.stop();
              }}
              placeholder={
                !isOnline
                  ? tr('Connect to the internet to send')
                  : archived
                    ? tr('This channel is archived')
                    : blocked
                      ? tr('Accept the new key to send')
                      : images.length
                        ? tr('Add a caption')
                        : tr('Message')
              }
              placeholderTextColor={colors.muted}
              editable={canSend}
              multiline
              maxLength={4000}
              style={s.input}
              accessibilityLabel={
                mode?.kind === 'edit' ? tr('Edited message text') : tr('Message text')
              }
            />
            <IconButton
              label={mode?.kind === 'edit' ? tr('Save edit') : tr('Send message')}
              disabled={
                !canSend ||
                (!text.trim() && !images.length) ||
                (send.isPending && images.length > 0)
              }
              onPress={submit}
              style={[
                s.sendButton,
                (!canSend || (!text.trim() && !images.length)) && s.sendDisabled,
              ]}
            >
              {mode?.kind === 'edit' ? (
                <Pencil size={18} color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </IconButton>
          </View>
        </>
      )}
      {actionsFor && (
        <MessageActions
          message={actionsFor.message}
          decoded={actionsFor.decoded}
          userId={userId}
          isOnline={isOnline}
          onClose={() => setActionsFor(null)}
          onReply={() => {
            setMode({
              kind: 'reply',
              message: actionsFor.message,
              preview: actionsFor.decoded.locked
                ? tr('Encrypted message')
                : actionsFor.decoded.text ||
                  (actionsFor.message.attachments.length ? tr('Photo') : tr('Message')),
            });
            setActionsFor(null);
            input.current?.focus();
          }}
          onEdit={() => {
            setMode({ kind: 'edit', message: actionsFor.message });
            setText(actionsFor.decoded.text);
            setImages([]);
            setActionsFor(null);
            input.current?.focus();
          }}
          onCopy={() => {
            copyText(actionsFor.decoded.text)
              .then(() => setNotice(tr('Copied to clipboard')))
              .catch(() => setNotice(tr('The text couldn’t be copied.')));
            setActionsFor(null);
          }}
          onReact={(emoji) => {
            react.mutate({ message: actionsFor.message, emoji });
            setActionsFor(null);
          }}
          onDelete={(forAll) => {
            remove.mutate(
              { message: actionsFor.message, forAll },
              { onError: () => setNotice(tr('The message wasn’t deleted. Try again.')) },
            );
            setActionsFor(null);
          }}
        />
      )}
      {viewer && (
        <ImageViewer
          images={viewer.images}
          initialIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function SearchResults({
  userId,
  conversationId,
  peerUserId,
  search,
  isDirect,
  onOpen,
}: {
  userId: string;
  conversationId: string;
  peerUserId: string | null;
  search: ReturnType<typeof useMessageSearch>;
  isDirect: boolean;
  onOpen: (id: string) => void;
}) {
  if (search.term.length < 2)
    return (
      <View style={s.searchHint}>
        <Search size={22} color={colors.muted} />
        <Text style={s.emptyText}>
          {isDirect
            ? tr(
                'Type at least 2 characters. Encrypted messages are searched on this device only, among messages it has opened.',
              )
            : tr('Type at least 2 characters to search this chat.')}
        </Text>
      </View>
    );
  return (
    <FlatList
      data={search.results}
      keyExtractor={(message) => message.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.results}
      ItemSeparatorComponent={() => <View style={s.divider} />}
      ListHeaderComponent={
        search.isError ? (
          <ErrorNotice
            message={tr('Server search is unavailable. Showing matches from this device only.')}
          />
        ) : null
      }
      ListEmptyComponent={
        search.isSearching || search.pending ? (
          <ActivityIndicator
            color={colors.purple}
            style={s.loader}
            accessibilityLabel={tr('Searching')}
          />
        ) : (
          <View style={s.searchHint}>
            <SearchX size={22} color={colors.muted} />
            <Text style={[common.title, s.center]}>
              {tr('No messages match “{term}”', { term: search.term })}
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <SearchResult
          message={item}
          term={search.term}
          userId={userId}
          conversationId={conversationId}
          peerUserId={peerUserId}
          onOpen={onOpen}
        />
      )}
    />
  );
}

function SearchResult({
  message,
  term,
  userId,
  conversationId,
  peerUserId,
  onOpen,
}: {
  message: ChatMessage;
  term: string;
  userId: string;
  conversationId: string;
  peerUserId: string | null;
  onOpen: (id: string) => void;
}) {
  const decoded = useDecryptedBody(userId, message, conversationId, peerUserId).data;
  const body =
    decoded && (decoded.status === 'plain' || decoded.status === 'decrypted') ? decoded.text : '';
  const at = body.toLowerCase().indexOf(term.toLowerCase());
  const start = Math.max(0, at - 30);
  const snippet = `${start > 0 ? '…' : ''}${body.slice(start, start + 120)}`;
  const name =
    message.sender.id === userId
      ? tr('You')
      : message.sender.displayName || message.sender.username;
  const when = formatDate(message.createdAt, { month: 'short', day: 'numeric' });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${when}: ${snippet}. Show in chat`}
      onPress={() => onOpen(message.id)}
      style={({ pressed }) => [s.result, pressed && s.pressed]}
    >
      <View style={s.resultTop}>
        <Text style={s.resultName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={common.muted}>{when}</Text>
      </View>
      <Text style={s.resultText} numberOfLines={2}>
        {snippet}
      </Text>
    </Pressable>
  );
}

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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    borderRadius: 12,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  typing: { color: '#d8b4fe', fontSize: 12, fontStyle: 'italic' },
  padded: { padding: 16 },
  keyBanner: {
    flexDirection: 'row',
    gap: 12,
    margin: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fbbf2414',
    borderWidth: 1,
    borderColor: '#fbbf2440',
  },
  keyBannerBody: { gap: 8, alignItems: 'flex-start' },
  list: { paddingHorizontal: 12, paddingVertical: 12, flexGrow: 1 },
  day: {
    alignSelf: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#ffffff0a',
    overflow: 'hidden',
  },
  loader: { padding: 24 },
  empty: { alignItems: 'center', gap: 10, padding: 32, transform: [{ scaleY: -1 }] },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f71a',
  },
  center: { textAlign: 'center' },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 300,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingLeft: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#111114',
  },
  modeTitle: { color: '#d8b4fe', fontSize: 13, fontWeight: '700' },
  attachments: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#26262c',
  },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000b3',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
  sendButton: { backgroundColor: colors.purple, borderRadius: 22 },
  sendDisabled: { opacity: 0.4 },
  channelIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2e1065',
  },
  searchHint: { alignItems: 'center', gap: 10, padding: 32 },
  results: { paddingBottom: 24, flexGrow: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 16 },
  result: { paddingHorizontal: 16, paddingVertical: 12, gap: 4, minHeight: 64 },
  resultTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  resultName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  resultText: { color: colors.text, fontSize: 14, lineHeight: 20, opacity: 0.88 },
  pressed: { backgroundColor: '#ffffff08' },
});
