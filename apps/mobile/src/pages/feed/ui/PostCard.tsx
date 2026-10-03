import * as React from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  BadgeCheck,
  Bookmark,
  Check,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Repeat2,
  Share2,
  Pin,
  EyeOff,
} from 'lucide-react-native';
import { useMutation, useQueryClient, useQuery, useIsMutating } from '@tanstack/react-query';
import type { PostResponseDto } from '@social-network/shared-contracts';
import { useAuthStore } from '@social-network/shared-stores';
import { Button } from '@/shared/ui';
import { assertSession, webOrigin } from '@/shared/api/client';
import { feedApi } from '../api/feedApi';
import { relativeTime, type FeedData, type PostAction } from '../model/feed';
import { feedKeys, usePostActions, usePollVote } from '../model/queries';
import { Avatar, colors, common, ErrorNotice, IconButton, Sheet } from './primitives';
import { MediaGallery } from './MediaGallery';
import { CommentsSheet } from './CommentsSheet';
import { shareLink } from './shareLink';

function compactCount(count: number) {
  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K` : String(count);
}

export const PostCard = React.memo(function PostCard({
  post,
  userId,
  active,
  onHide,
  initialCommentsOpen = false,
}: {
  post: PostResponseDto;
  userId: string;
  active: boolean;
  onHide: (id: string) => void;
  initialCommentsOpen?: boolean;
}) {
  const { width, fontScale } = useWindowDimensions();
  const compactHeader = width < 360 || fontScale > 1.2;
  const [expanded, setExpanded] = React.useState(false);
  const [comments, setComments] = React.useState(initialCommentsOpen);
  const [menu, setMenu] = React.useState(false);
  const [shareError, setShareError] = React.useState(false);
  const [shareBusy, setShareBusy] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const client = useQueryClient();
  const action = usePostActions(userId, post.id);
  const authorKey = ['mobile', userId, 'author-follow', post.authorId];
  const pendingRequest = useQuery({
    queryKey: authorKey,
    queryFn: async () => false,
    initialData: false,
    enabled: false,
  });
  const following = post.isFollowing;
  const requested = !following && pendingRequest.data;
  const follow = useMutation({
    mutationKey: authorKey,
    onMutate: () => client.cancelQueries({ queryKey: feedKeys.posts(userId) }),
    mutationFn: async () => {
      if (following || requested) {
        await feedApi.unfollow(post.authorId);
        return { following: false, requested: false };
      }
      const response = await feedApi.follow(post.authorId);
      return {
        following: response.status === 'ACCEPTED',
        requested: response.status === 'PENDING',
      };
    },
    onSuccess: (result) => {
      client.setQueriesData<FeedData>(
        { queryKey: feedKeys.feeds(userId) },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              data: page.data.map((item) =>
                item.authorId === post.authorId ? { ...item, isFollowing: result.following } : item,
              ),
            })),
          },
      );
      client.setQueryData(authorKey, result.requested);
      void client.invalidateQueries({ queryKey: feedKeys.stories(userId) });
      void client.invalidateQueries({ queryKey: feedKeys.suggestions(userId) });
    },
    onSettled: () => client.invalidateQueries({ queryKey: feedKeys.posts(userId) }),
  });
  const followingBusy = useIsMutating({ mutationKey: authorKey }) > 0;
  const vote = usePollVote(userId, post.id);
  const text = post.text || post.content;

  async function sharePost() {
    if (shareBusy) return;
    setShareError(false);
    setLinkCopied(false);
    setShareBusy(true);
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      const url = `${webOrigin}/profile/${encodeURIComponent(post.handle)}#post-${encodeURIComponent(post.id)}`;
      const result = await shareLink(`${post.author} on Eternal`, url);
      setLinkCopied(result === 'copied');
      if (result !== 'dismissed') {
        try {
          assertSession(userId, refreshToken);
          await feedApi.share(post.id);
          void client.invalidateQueries({ queryKey: feedKeys.posts(userId) });
        } catch {
          // Sharing succeeded; a tracking failure must not report the share as failed.
          void client.invalidateQueries({ queryKey: feedKeys.posts(userId) });
        }
      }
    } catch {
      setShareError(true);
    } finally {
      setShareBusy(false);
    }
  }

  function toggle(kind: PostAction, current: boolean) {
    action.mutate({ action: kind, active: !current });
  }
  function openProfile() {
    void Linking.openURL(`${webOrigin}/profile/${encodeURIComponent(post.handle)}`).catch(() =>
      setShareError(true),
    );
  }
  const poll = post.poll;

  const followControl =
    post.authorId !== userId ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          requested
            ? 'Cancel follow request'
            : following
              ? `Unfollow ${post.author}`
              : `Follow ${post.author}`
        }
        accessibilityState={{ disabled: followingBusy, busy: followingBusy }}
        disabled={followingBusy}
        onPress={() => follow.mutate()}
        style={s.follow}
      >
        <Text style={s.followText}>
          {followingBusy ? '...' : requested ? 'Requested' : following ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
    ) : null;
  return (
    <View style={[common.card, s.card]}>
      {post.isPinned && (
        <View style={common.row}>
          <Pin size={13} color={colors.purple} />
          <Text style={s.pinned}>Pinned post</Text>
        </View>
      )}
      <View style={s.header}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${post.author}'s profile`}
          style={s.avatarLink}
          onPress={openProfile}
        >
          <Avatar name={post.author} uri={post.avatar} size={40} />
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${post.author}${post.isVerified ? ', verified account' : ''}, @${post.handle}`}
          onPress={openProfile}
          style={[common.flex, s.authorLink]}
        >
          <View style={s.name}>
            <Text style={s.author} numberOfLines={1}>
              {post.author}
            </Text>
            {post.isVerified && (
              <BadgeCheck size={16} color="white" fill="#0ea5e9" accessible={false} aria-hidden />
            )}
          </View>
          <Text style={common.muted} numberOfLines={1}>
            @{post.handle} · {relativeTime(post.createdAt)}
            {post.editedAt ? ' · edited' : ''}
          </Text>
        </Pressable>
        {!compactHeader && followControl}
        <IconButton label="Post options" onPress={() => setMenu(true)}>
          <MoreHorizontal size={22} color={colors.muted} />
        </IconButton>
      </View>
      <View style={[s.body, (width < 480 || fontScale > 1.2) && s.mobileBody]}>
        {compactHeader && followControl}
        {!!text && (
          <View>
            <Text style={common.text} selectable>
              {!expanded && text.length > 280 ? `${text.slice(0, 280)}…` : text}
            </Text>
            {text.length > 280 && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                aria-expanded={expanded}
                onPress={() => setExpanded((current) => !current)}
                style={s.readMore}
              >
                <Text style={s.accent}>{expanded ? 'Show less' : 'Read more'}</Text>
              </Pressable>
            )}
          </View>
        )}
        <MediaGallery media={post.media || []} active={active && !comments && !menu} />
        {poll && (
          <View style={s.poll}>
            {!!poll.title && <Text style={common.title}>{poll.title}</Text>}
            {poll.options.map((option) => {
              const results = !!poll.myVoteOptionId || !poll.isActive;
              const percentage =
                poll.totalVotes > 0 ? Math.round((option.votesCount / poll.totalVotes) * 100) : 0;
              const selected = poll.myVoteOptionId === option.id;
              return (
                <Pressable
                  key={option.id}
                  disabled={!poll.isActive || vote.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.text}${results ? `, ${percentage}%` : ''}${selected ? ', your vote' : ''}`}
                  accessibilityState={{ selected, disabled: !poll.isActive || vote.isPending }}
                  onPress={() => vote.mutate(option.id)}
                  style={[s.option, selected && s.selectedOption]}
                >
                  {results && <View style={[s.resultFill, { width: `${percentage}%` }]} />}
                  <Text style={[common.text, common.flex]}>{option.text}</Text>
                  {selected && <Check size={16} color={colors.purple} />}
                  {results && <Text style={common.muted}>{percentage}%</Text>}
                </Pressable>
              );
            })}
            <Text style={common.muted}>
              {poll.totalVotes.toLocaleString()} votes ·{' '}
              {poll.isActive ? 'Select an option to vote' : 'Poll closed'}
            </Text>
            {vote.isPending && <ActivityIndicator color={colors.purple} />}
            {vote.isError && (
              <ErrorNotice message="Your vote couldn't be saved. Please try again." />
            )}
          </View>
        )}
      </View>
      {follow.isError && (
        <ErrorNotice message="Follow status could not be updated. Please try again." />
      )}
      {action.isError && (
        <ErrorNotice
          message="This action couldn't be saved."
          onRetry={() => {
            if (action.variables) action.mutate(action.variables);
          }}
        />
      )}
      {shareError && (
        <ErrorNotice message="The link couldn't be opened or shared. Please try again." />
      )}
      {linkCopied && (
        <Text accessibilityLiveRegion="polite" aria-live="polite" style={s.accent}>
          Link copied
        </Text>
      )}
      <View style={s.actions}>
        <IconButton
          style={s.action}
          label={`${post.isLiked ? 'Unlike' : 'Like'} post, ${post.likesCount} likes`}
          selected={post.isLiked}
          disabled={action.isPending}
          onPress={() => toggle('like', post.isLiked)}
        >
          <Heart
            size={16}
            color={post.isLiked ? '#f472b6' : colors.muted}
            fill={post.isLiked ? '#f472b6' : 'transparent'}
          />
          <Text style={[s.count, post.isLiked && s.liked]}>{compactCount(post.likesCount)}</Text>
        </IconButton>
        <IconButton
          style={s.action}
          label={`Comments, ${post.commentsCount}`}
          onPress={() => setComments(true)}
        >
          <MessageSquare size={16} color={colors.muted} />
          <Text style={s.count}>{compactCount(post.commentsCount)}</Text>
        </IconButton>
        <IconButton
          style={s.action}
          label={`${post.isReposted ? 'Undo repost' : 'Repost'}, ${post.repostsCount} reposts`}
          selected={post.isReposted}
          disabled={action.isPending}
          onPress={() => toggle('repost', post.isReposted)}
        >
          <Repeat2 size={16} color={post.isReposted ? colors.green : colors.muted} />
          <Text style={s.count}>{compactCount(post.repostsCount)}</Text>
        </IconButton>
        <IconButton
          style={s.action}
          label="Share post"
          disabled={shareBusy}
          onPress={() => {
            void sharePost();
          }}
        >
          <Share2 size={16} color={colors.muted} />
          <Text style={s.count}>{compactCount(post.sharesCount ?? 0)}</Text>
        </IconButton>
        <IconButton
          label={post.isSaved ? 'Unsave post' : 'Save post'}
          selected={post.isSaved}
          disabled={action.isPending}
          onPress={() => toggle('save', post.isSaved)}
        >
          <Bookmark
            size={16}
            color={post.isSaved ? colors.text : colors.muted}
            fill={post.isSaved ? colors.text : 'transparent'}
          />
        </IconButton>
      </View>
      {action.isPending && (
        <ActivityIndicator size="small" color={colors.purple} accessibilityLabel="Saving action" />
      )}
      {comments && <CommentsSheet userId={userId} post={post} onClose={() => setComments(false)} />}
      {menu && (
        <Sheet title="Post options" onClose={() => setMenu(false)}>
          <ScrollView contentContainerStyle={s.menu}>
            <Button
              variant="secondary"
              title={post.isSaved ? 'Remove from saved' : 'Save for later'}
              leftIcon={<Bookmark size={18} color={colors.purple} />}
              disabled={action.isPending}
              onPress={() => {
                toggle('save', post.isSaved);
                setMenu(false);
              }}
            />
            <Button
              variant="secondary"
              title="Share post"
              disabled={shareBusy}
              leftIcon={<Share2 size={18} color={colors.purple} />}
              onPress={() => {
                setMenu(false);
                void sharePost();
              }}
            />
            <Button
              variant="secondary"
              title="Hide from this feed"
              leftIcon={<EyeOff size={18} color={colors.muted} />}
              onPress={() => {
                setMenu(false);
                onHide(post.id);
              }}
            />
          </ScrollView>
        </Sheet>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  card: { gap: 12, backgroundColor: '#ffffff05' },
  body: { marginLeft: 56, gap: 12 },
  mobileBody: { marginLeft: 0 },
  avatarLink: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  authorLink: { minHeight: 44, justifyContent: 'center' },
  follow: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: { color: '#d1d5db', fontSize: 11, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  author: { flexShrink: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  pinned: { color: colors.purple, fontSize: 12, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 2,
  },
  action: { flexDirection: 'row', gap: 4, paddingHorizontal: 0 },
  count: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  liked: { color: '#f472b6' },
  readMore: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  accent: { color: '#c084fc', fontSize: 13, fontWeight: '600' },
  poll: { gap: 8 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedOption: { borderColor: colors.purple },
  resultFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#a855f724' },
  menu: { padding: 20, gap: 12 },
});
