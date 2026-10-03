import * as React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PostResponseDto } from '@social-network/shared-contracts';
import { feedApi } from '../api/feedApi';
import { nextCursor, relativeTime } from '../model/feed';
import { feedKeys } from '../model/queries';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';

export function CommentsSheet({
  userId,
  post,
  onClose,
}: {
  userId: string;
  post: PostResponseDto;
  onClose: () => void;
}) {
  const [text, setText] = React.useState('');
  const client = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: feedKeys.comments(userId, post.id),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => feedApi.comments(post.id, pageParam, signal),
    getNextPageParam: nextCursor,
  });
  const create = useMutation({
    mutationFn: () => feedApi.comment(post.id, text.trim()),
    onSuccess: () => {
      setText('');
      void client.invalidateQueries({ queryKey: feedKeys.comments(userId, post.id) });
      void client.invalidateQueries({ queryKey: feedKeys.posts(userId) });
    },
  });
  const comments = query.data?.pages.flatMap((page) => page.data) ?? [];
  const seen = new Set<string>();
  const unique = comments.filter((comment) => {
    if (seen.has(comment.id)) return false;
    seen.add(comment.id);
    return true;
  });
  return (
    <Sheet title="Comments" onClose={onClose}>
      <FlatList
        data={unique}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <View style={s.context}>
            <Text style={common.title}>{post.author}</Text>
            <Text style={common.muted} numberOfLines={3}>
              {post.text || post.content}
            </Text>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator color={colors.purple} style={s.loader} />
          ) : query.isError ? (
            <ErrorNotice
              message="Comments couldn't be loaded."
              onRetry={() => {
                void query.refetch();
              }}
            />
          ) : (
            <Text style={s.empty}>Start the conversation. Leave the first comment.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={s.comment}>
            <Avatar name={item.author} uri={item.avatar} size={34} />
            <View style={common.flex}>
              <View style={common.row}>
                <Text style={[common.title, common.flex]}>{item.author}</Text>
                <Text style={common.muted}>{relativeTime(item.createdAt)}</Text>
              </View>
              <Text style={common.text} selectable>
                {item.isDeleted ? 'Comment deleted' : item.text}
              </Text>
              {item.mediaUrl && !item.isDeleted && (
                <Image
                  source={{ uri: item.mediaUrl }}
                  resizeMode="contain"
                  style={s.commentMedia}
                  accessibilityLabel="Comment attachment"
                />
              )}
            </View>
          </View>
        )}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetching && !query.isFetchNextPageError)
            void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.purple} />
          ) : query.isError && unique.length > 0 ? (
            <ErrorNotice
              message="More comments couldn't be loaded."
              onRetry={() => {
                void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch());
              }}
            />
          ) : null
        }
      />
      {create.isError && <ErrorNotice message="Your comment wasn't sent. Please try again." />}
      <View style={s.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          editable={!create.isPending}
          placeholder="Add a comment…"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Comment text"
          style={s.input}
        />
        <IconButton
          label="Send comment"
          disabled={!text.trim() || create.isPending}
          onPress={() => create.mutate()}
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
  commentMedia: { width: '100%', height: 180, borderRadius: 12, marginTop: 8 },
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
