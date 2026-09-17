export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    feed: (filter?: string) => [...queryKeys.posts.all, 'feed', filter ?? 'default'] as const,
    compact: (limit?: number, after?: string) =>
      [...queryKeys.posts.all, 'compact', { limit, after }] as const,
    detail: (id: string) => [...queryKeys.posts.all, 'detail', id] as const,
    comments: (postId: string) => [...queryKeys.posts.detail(postId), 'comments'] as const,
  },
  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    profile: (userIdOrUsername: string) =>
      [...queryKeys.users.all, 'profile', userIdOrUsername] as const,
  },
  conversations: {
    all: ['conversations'] as const,
    list: () => [...queryKeys.conversations.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.conversations.all, 'detail', id] as const,
    messages: (conversationId: string) =>
      [...queryKeys.conversations.detail(conversationId), 'messages'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },
  featureFlags: {
    all: ['featureFlags'] as const,
    single: (key: string) => [...queryKeys.featureFlags.all, key] as const,
  },
  stories: {
    all: ['stories'] as const,
    feed: () => [...queryKeys.stories.all, 'feed'] as const,
  },
} as const;
