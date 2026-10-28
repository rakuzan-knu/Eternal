import * as React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';
import type { ReelResponseDto } from '@social-network/shared-contracts';
import { relativeTime } from '../../feed/model/feed';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from '../../feed/ui/primitives';
import { useAddReelComment, useReelComments } from '../model/queries';
import { tr } from '@/shared/lib/i18n';

export function ReelCommentsSheet({
  userId,
  reel,
  isOnline,
  onClose,
}: {
  userId: string;
  reel: ReelResponseDto;
  isOnline: boolean;
  onClose: () => void;
}) {
  const [text, setText] = React.useState('');
  const query = useReelComments(userId, reel.id);
  const create = useAddReelComment(userId, reel.id);
  const author = reel.author.displayName || reel.author.username;
  const send = () =>
    create.mutate(text.trim(), {
      onSuccess: () => setText(''),
    });

  return (
    <Sheet title={tr('Comments')} onClose={onClose}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListHeaderComponent={
          reel.caption ? (
            <View style={s.context}>
              <Text style={common.title}>{author}</Text>
              <Text style={common.muted} numberOfLines={3}>
                {reel.caption}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator
              color={colors.purple}
              style={s.loader}
              accessibilityLabel={tr('Loading comments')}
            />
          ) : query.isError ? (
            <ErrorNotice
              message={tr("Comments couldn't be loaded.")}
              onRetry={() => {
                void query.refetch();
              }}
            />
          ) : (
            <Text style={s.empty}>{tr('No comments yet. Start the conversation.')}</Text>
          )
        }
        renderItem={({ item }) => {
          const name = item.user.displayName || item.user.username;
          return (
            <View style={s.comment}>
              <Avatar name={name} uri={item.user.avatar} size={34} />
              <View style={common.flex}>
                <View style={common.row}>
                  <Text style={[common.title, common.flex]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={common.muted}>{relativeTime(item.createdAt)}</Text>
                </View>
                <Text style={common.text} selectable>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />
      {create.isError && <ErrorNotice message={tr("Your comment wasn't sent. Try again.")} />}
      <View style={s.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!create.isPending && isOnline}
          placeholder={isOnline ? tr('Add a comment…') : tr('Connect to the internet to comment')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={tr('Comment text')}
          style={s.input}
        />
        <IconButton
          label={tr('Send comment')}
          disabled={!text.trim() || create.isPending || !isOnline}
          onPress={send}
        >
          {create.isPending ? (
            <ActivityIndicator color={colors.purple} />
          ) : (
            <Send size={20} color={colors.purple} />
          )}
        </IconButton>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  list: { padding: 20, gap: 20, flexGrow: 1 },
  context: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 5 },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  empty: { textAlign: 'center', color: colors.muted, paddingVertical: 40, lineHeight: 22 },
  loader: { padding: 40 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    padding: 12,
    backgroundColor: colors.card,
    color: colors.text,
    fontSize: 15,
  },
});
