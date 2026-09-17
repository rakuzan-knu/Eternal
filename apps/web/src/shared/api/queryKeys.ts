/**
 * Enterprise TanStack Query key factory (v5).
 *
 * Boundary: Server State ONLY. All REST data fetched via TanStack Query MUST
 * use these keys — never inline string literals. This guarantees:
 * - no key duplication / typos across features,
 * - precise invalidation (e.g. messages(convId) without nuking the list),
 * - stable referential shape for `setQueryData` realtime sync.
 *
 * Backwards compatibility: legacy flat string constants are kept as aliases
 * to the factory roots so existing imports/tests keep working. New code MUST
 * use the `queryKeys` factory.
 *
 * Convention: every key is a readonly tuple, first segment is the collection,
 * subsequent segments narrow the scope: [collection, ...params].
 */

// ─── Legacy flat constants (deprecated, kept for compat) ─────────────────────
export const USER_KEY = 'user';
export const USER_BY_USERNAME_KEY = 'by-username';
export const CHECK_USERNAME_KEY = 'checkUsername';
export const FOLLOW_LIST_KEY = 'followList';
export const FEED_KEY = 'feed';
export const USER_POSTS_KEY = 'userPosts';
export const USER_REPOSTS_KEY = 'userReposts';
export const POLL_VOTERS_KEY = 'poll-voters';
export const CONVERSATIONS_KEY = 'conversations';
export const CONVERSATION_MESSAGES_KEY = 'conversation-messages';
export const BLOCKED_USERS_KEY = 'blocked-users';
export const SESSIONS_KEY = 'sessions';
export const PRIVACY_KEY = 'privacy';
export const PRIVACY_EXCEPTIONS_KEY = 'privacy-exceptions';
export const FOLLOW_REQUESTS_KEY = 'follow-requests';
export const SAVED_POSTS_KEY = 'saved-posts';
export const FRIENDS_KEY = 'friends';
export const COMMENTS_KEY = 'comments';
export const COMMENT_REPLIES_KEY = 'comment-replies';
export const NOTIFICATIONS_KEY = 'notifications';
export const UNREAD_NOTIFICATIONS_COUNT_KEY = 'unread-notifications-count';
export const STORIES_FEED_KEY = 'stories-feed';
export const USER_STORIES_KEY = 'user-stories';
export const CLOSE_FRIENDS_KEY = 'close-friends';
export const REELS_FEED_KEY = 'reels-feed';
export const USER_REELS_KEY = 'user-reels';
export const REEL_COMMENTS_KEY = 'reel-comments';

// ─── Factory ─────────────────────────────────────────────────────────────────
const user = {
  root: [USER_KEY] as const,
  /** Current authenticated profile. */
  current: (userId: string | null) => [USER_KEY, userId] as const,
  byUsername: (username: string) => [USER_KEY, USER_BY_USERNAME_KEY, username] as const,
  checkUsername: (username: string) => [CHECK_USERNAME_KEY, username] as const,
  suggested: (limit: number) => ['suggestedUsers', limit] as const,
  search: (query: string) => ['user-search', query] as const,
} as const;

const feed = {
  root: [FEED_KEY] as const,
  list: (filter?: string) => [FEED_KEY, filter ?? 'all'] as const,
  userPosts: (userId: string) => [USER_POSTS_KEY, userId] as const,
  userReposts: (userId: string) => [USER_REPOSTS_KEY, userId] as const,
  saved: [SAVED_POSTS_KEY] as const,
  compact: (algorithm?: string) => [FEED_KEY, 'compact', algorithm ?? 'latest'] as const,
  pollVoters: (postId: string, optionIndex?: number) =>
    [POLL_VOTERS_KEY, postId, optionIndex ?? 'all'] as const,
} as const;

const comments = {
  root: [COMMENTS_KEY] as const,
  list: (postId: string | number) => [COMMENTS_KEY, String(postId)] as const,
  replies: (commentId: string) => [COMMENT_REPLIES_KEY, commentId] as const,
} as const;

const conversations = {
  root: [CONVERSATIONS_KEY] as const,
  detail: (conversationId: string) => [CONVERSATIONS_KEY, conversationId] as const,
  /** Alias kept because some code uses ['conversation', id] literally. */
  detailAlias: (conversationId: string) => ['conversation', conversationId] as const,
  messages: (conversationId: string) => [CONVERSATION_MESSAGES_KEY, conversationId] as const,
  around: (conversationId: string, messageId: string) =>
    [CONVERSATION_MESSAGES_KEY, conversationId, 'around', messageId] as const,
  activity: (conversationId: string, year: number, month: number, timezone: string) =>
    ['chat-activity-map', conversationId, year, month, timezone] as const,
  search: (conversationId: string, query: string) =>
    ['message-search', conversationId, query] as const,
  globalSearch: (query: string, type: string, conversationId?: string) =>
    ['conversations-search', query, type, conversationId ?? 'all'] as const,
  folders: ['chat-folders'] as const,
  blocked: [BLOCKED_USERS_KEY] as const,
} as const;

const notifications = {
  root: [NOTIFICATIONS_KEY] as const,
  list: (filter: string) => [NOTIFICATIONS_KEY, filter] as const,
  unreadCount: [UNREAD_NOTIFICATIONS_COUNT_KEY] as const,
} as const;

const stories = {
  feed: [STORIES_FEED_KEY] as const,
  user: (authorId: string) => [USER_STORIES_KEY, authorId] as const,
  closeFriends: [CLOSE_FRIENDS_KEY] as const,
} as const;

const reels = {
  feed: (filter?: string) => [REELS_FEED_KEY, filter ?? 'all'] as const,
  user: (userId: string) => [USER_REELS_KEY, userId] as const,
  detail: (reelId: string) => [REELS_FEED_KEY, 'detail', reelId] as const,
  comments: (reelId: string) => [REEL_COMMENTS_KEY, reelId] as const,
} as const;

const profile = {
  sessions: [SESSIONS_KEY] as const,
  privacy: [PRIVACY_KEY] as const,
  privacyExceptions: (dimension: string) => [PRIVACY_EXCEPTIONS_KEY, dimension] as const,
  followRequests: {
    root: [FOLLOW_REQUESTS_KEY] as const,
    count: [FOLLOW_REQUESTS_KEY, 'count'] as const,
    list: [FOLLOW_REQUESTS_KEY, 'list'] as const,
  },
  friends: [FRIENDS_KEY] as const,
  followList: (userId: string, type: string) => [FOLLOW_LIST_KEY, userId, type] as const,
  showcase: (username: string) => ['showcase', username] as const,
} as const;

const featureFlags = {
  all: ['feature-flags'] as const,
  single: (key: string) => ['feature-flags', key] as const,
} as const;

export const queryKeys = {
  user,
  feed,
  comments,
  conversations,
  notifications,
  stories,
  reels,
  profile,
  featureFlags,
} as const;

export type QueryKeys = typeof queryKeys;

/** Union of every key tuple the factory can produce (for typed helpers). */
export type AppQueryKey =
  | ReturnType<typeof user.current>
  | ReturnType<typeof user.byUsername>
  | ReturnType<typeof user.checkUsername>
  | ReturnType<typeof user.suggested>
  | ReturnType<typeof user.search>
  | typeof user.root
  | ReturnType<typeof feed.list>
  | ReturnType<typeof feed.userPosts>
  | ReturnType<typeof feed.userReposts>
  | typeof feed.saved
  | ReturnType<typeof feed.pollVoters>
  | ReturnType<typeof comments.list>
  | ReturnType<typeof comments.replies>
  | typeof comments.root
  | typeof conversations.root
  | ReturnType<typeof conversations.detail>
  | ReturnType<typeof conversations.detailAlias>
  | ReturnType<typeof conversations.messages>
  | ReturnType<typeof conversations.around>
  | ReturnType<typeof conversations.activity>
  | ReturnType<typeof conversations.search>
  | ReturnType<typeof conversations.globalSearch>
  | typeof conversations.folders
  | typeof conversations.blocked
  | ReturnType<typeof notifications.list>
  | typeof notifications.root
  | typeof notifications.unreadCount
  | typeof stories.feed
  | ReturnType<typeof stories.user>
  | typeof stories.closeFriends
  | ReturnType<typeof reels.feed>
  | ReturnType<typeof reels.user>
  | ReturnType<typeof reels.detail>
  | ReturnType<typeof reels.comments>
  | typeof profile.sessions
  | typeof profile.privacy
  | ReturnType<typeof profile.privacyExceptions>
  | typeof profile.followRequests.root
  | typeof profile.followRequests.count
  | typeof profile.followRequests.list
  | typeof profile.friends
  | ReturnType<typeof profile.followList>
  | ReturnType<typeof profile.showcase>
  | typeof featureFlags.all
  | ReturnType<typeof featureFlags.single>;
