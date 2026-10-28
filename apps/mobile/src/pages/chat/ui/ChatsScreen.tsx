import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Lock,
  MessageSquare,
  Search,
  SearchX,
  SquarePen,
  Users,
  WifiOff,
} from 'lucide-react-native';
import type { ConversationPage } from '@social-network/shared-contracts';
import { isEncryptedEnvelope } from '@social-network/shared-crypto';
import { Button, Input } from '@/shared/ui';
import { Avatar, colors, common, ErrorNotice, IconButton } from '../../feed/ui/primitives';
import { conversationDisplay, conversationTime, previewText } from '../model/chat';
import { useConversations } from '../model/queries';
import { activeTypers, useTypingStore } from '../model/socket';
import { tr } from '@/shared/lib/i18n';

type Conversation = ConversationPage['data'][number];

export function ChatsScreen({
  userId,
  isOnline,
  active,
  onOpenConversation,
  onNewChat,
  onFindPeople,
}: {
  userId: string;
  isOnline: boolean;
  active: boolean;
  onOpenConversation: (id: string) => void;
  onNewChat: () => void;
  onFindPeople: () => void;
}) {
  const query = useConversations(userId);
  const [search, setSearch] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  const typing = useTypingStore((state) => state.typing);
  const conversations = React.useMemo(() => {
    const seen = new Set<string>();
    const all = (query.data?.pages.flatMap((page) => page.data) ?? []).filter(
      (conversation) =>
        !conversation.communityId && !seen.has(conversation.id) && !!seen.add(conversation.id),
    );
    const term = search.trim().toLowerCase();
    return term
      ? all.filter((conversation) =>
          conversationDisplay(conversation, userId).title.toLowerCase().includes(term),
        )
      : all;
  }, [query.data, search, userId]);

  React.useEffect(() => {
    if (active && Platform.OS === 'web' && typeof document !== 'undefined')
      document.title = `${tr('Chats')} • Eternal`;
  }, [active]);

  async function refresh() {
    if (refreshing || !isOnline) return;
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  const empty = (() => {
    if (query.isPending)
      return query.fetchStatus === 'paused' ? (
        <Placeholder
          Icon={WifiOff}
          title={tr("You're offline")}
          text={tr('Connect to the internet to load your chats.')}
        />
      ) : (
        <View accessibilityLabel={tr('Loading chats')} aria-busy style={s.skeletons}>
          {[0, 1, 2, 3, 4].map((item) => (
            <View key={item} style={s.skeletonRow}>
              <View style={s.skeletonAvatar} />
              <View style={[common.flex, s.skeletonLines]}>
                <View style={s.skeletonTitle} />
                <View style={s.skeletonLine} />
              </View>
            </View>
          ))}
        </View>
      );
    if (query.isError)
      return (
        <View style={s.padded}>
          <ErrorNotice
            message={tr("Your chats couldn't be loaded.")}
            onRetry={() => {
              void query.refetch();
            }}
          />
        </View>
      );
    if (search.trim())
      return (
        <Placeholder
          Icon={SearchX}
          title={tr('No chats match “{term}”', { term: search.trim() })}
          text={tr('Search looks at names of people and groups.')}
          action={
            <Button
              title={tr('Clear search')}
              variant="ghost"
              fullWidth={false}
              onPress={() => setSearch('')}
            />
          }
        />
      );
    return (
      <Placeholder
        Icon={MessageSquare}
        title={tr('No conversations yet')}
        text={tr(
          "Open someone's profile and tap Message to start a private, end-to-end encrypted chat.",
        )}
        action={
          <Button
            title={tr('Find people')}
            variant="purple"
            fullWidth={false}
            onPress={onFindPeople}
          />
        }
      />
    );
  })();

  return (
    <View style={s.screen} testID="mobile-chats">
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text accessibilityRole="header" style={s.title}>
            Chats
          </Text>
          <IconButton label={tr('New chat')} onPress={onNewChat}>
            <SquarePen size={21} color={colors.text} />
          </IconButton>
        </View>
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder={tr('Search chats')}
          autoCorrect={false}
          returnKeyType="search"
          showClearButton
          onClear={() => setSearch('')}
          leftElement={<Search size={18} color={colors.muted} />}
          accessibilityLabel={tr('Search chats')}
        />
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void refresh();
            }}
            enabled={isOnline}
            tintColor={colors.purple}
            colors={[colors.purple]}
            progressBackgroundColor={colors.card}
          />
        }
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            userId={userId}
            typing={activeTypers(typing[item.id]).length > 0}
            onPress={onOpenConversation}
          />
        )}
        ItemSeparatorComponent={() => <View style={s.divider} />}
        ListEmptyComponent={empty}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetching && !query.isError && isOnline)
            void query.fetchNextPage();
        }}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.purple}
              style={s.loader}
              accessibilityLabel={tr('Loading more chats')}
            />
          ) : query.isFetchNextPageError ? (
            <View style={s.padded}>
              <ErrorNotice
                message={tr("More chats couldn't be loaded.")}
                onRetry={() => {
                  void query.fetchNextPage();
                }}
              />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const ConversationRow = React.memo(function ConversationRow({
  conversation,
  userId,
  typing,
  onPress,
}: {
  conversation: Conversation;
  userId: string;
  typing: boolean;
  onPress: (id: string) => void;
}) {
  const display = conversationDisplay(conversation, userId);
  const unread = conversation.unreadCount;
  const last = conversation.lastMessage;
  const encrypted = isEncryptedEnvelope(last?.body);
  const own = last?.sender.id === userId;
  const preview = typing
    ? tr('typing…')
    : own
      ? tr('You: {text}', { text: previewText(last) })
      : previewText(last);
  const when = conversationTime(last?.createdAt ?? conversation.updatedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${display.title}${display.isGroup ? ', group' : ''}. ${preview}. ${when}${unread ? `. ${unread} unread` : ''}`}
      onPress={() => onPress(conversation.id)}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <View>
        <Avatar name={display.title} uri={display.avatar} size={52} />
        {display.isGroup && (
          <View style={s.groupBadge}>
            <Users size={11} color={colors.text} />
          </View>
        )}
      </View>
      <View style={common.flex}>
        <View style={s.rowTop}>
          <Text style={[s.name, unread > 0 && s.strong]} numberOfLines={1}>
            {display.title}
          </Text>
          <Text style={[s.time, unread > 0 && s.timeUnread]}>{when}</Text>
        </View>
        <View style={s.rowBottom}>
          {encrypted && !typing && <Lock size={13} color={colors.muted} />}
          <Text
            style={[s.preview, unread > 0 && s.previewUnread, typing && s.typing]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {unread > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

function Placeholder({
  Icon,
  title,
  text,
  action,
}: {
  Icon: typeof Lock;
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

const s = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: -10,
  },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  content: { paddingBottom: 24, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 72,
  },
  pressed: { backgroundColor: '#ffffff08' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 82 },
  groupBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26262c',
    borderWidth: 2,
    borderColor: colors.background,
  },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  strong: { fontWeight: '700' },
  time: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  timeUnread: { color: '#d8b4fe', fontWeight: '600' },
  preview: { flex: 1, color: colors.muted, fontSize: 14 },
  previewUnread: { color: colors.text },
  typing: { color: '#d8b4fe', fontStyle: 'italic' },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.purple,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  padded: { padding: 16 },
  loader: { padding: 16 },
  skeletons: { paddingTop: 4 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  skeletonAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#26262c' },
  skeletonLines: { gap: 8 },
  skeletonTitle: { width: '45%', height: 12, borderRadius: 6, backgroundColor: '#26262c' },
  skeletonLine: { width: '75%', height: 10, borderRadius: 5, backgroundColor: '#1c1c21' },
  placeholder: { alignItems: 'center', gap: 10, paddingVertical: 56, paddingHorizontal: 32 },
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
});
