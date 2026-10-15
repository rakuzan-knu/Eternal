import { type Page } from '@playwright/test';
import { mockApi } from '../fixtures';

export type Screen = 'feed' | 'profile' | 'chat';
export type ScreenState = 'content' | 'empty' | 'error';
export const authorName = 'Олександра Коваленко — long display name';
export const postText =
  'A real feed post: Українська, русский, English 👩🏽‍💻 🌍. Long names and text should remain readable across layouts.';
export const messageText =
  'A real chat message: Привіт! Let’s review the profile and keep our conversation readable at every text size. 👋';
const createdAt = '2026-10-03T10:00:00.000Z';
const me = { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null };
const author = {
  id: 'usr-alexandra',
  username: 'alexandra',
  displayName: authorName,
  avatar: null,
};
export const post = {
  id: 'design-post',
  authorId: author.id,
  author: authorName,
  handle: author.username,
  text: postText,
  createdAt,
  likes: 12,
  comments: 3,
  reposts: 1,
};
export const message = {
  id: 'design-message',
  conversationId: 'design-conversation',
  sender: author,
  body: messageText,
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt,
  editedAt: null,
};
const conversation = {
  id: 'design-conversation',
  type: 'DIRECT',
  name: null,
  avatar: null,
  description: null,
  createdById: null,
  participants: [me, author].map((user) => ({
    userId: user.id,
    user,
    nickname: null,
    role: 'MEMBER',
    theme: 'default',
    muteLevel: 'NONE',
    mutedUntil: null,
    joinedAt: createdAt,
  })),
  lastMessage: message,
  unreadCount: 0,
  myTheme: 'default',
  myMuteLevel: 'NONE',
  myNickname: null,
  isArchived: false,
  isPinned: false,
  blockedByMe: false,
  createdAt,
  updatedAt: createdAt,
  pinnedMessages: [],
};

export async function prepareScreen(page: Page, screen: Screen, state: ScreenState = 'content') {
  await page.clock.setFixedTime(new Date('2026-10-03T12:00:00Z'));
  // Route WebSockets too: no socket, media or font traffic reaches a live service.
  await page.routeWebSocket('**/*', (socket) => socket.close());
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' && url.port === '6007') return route.continue();
    if (['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '3000')
      return route.fallback();
    return route.abort();
  });
  await mockApi(page, '/stories/feed', { json: [] });
  await mockApi(page, '/users/suggested?**', { json: [] });
  await mockApi(page, '/users/me/friends', { json: [] });
  await mockApi(page, '/users/online?**', { json: [] });
  await mockApi(page, '/conversations', { json: [conversation] });
  await mockApi(page, '/conversations/folders', { json: [] });
  await mockApi(page, '/posts?**', { json: { posts: [post], nextCursor: null } });
  if (screen === 'feed') {
    await mockApi(
      page,
      '/posts?**',
      state === 'error'
        ? { status: 503, json: { message: 'Offline fixture' } }
        : { json: { posts: state === 'empty' ? [] : [post], nextCursor: null } },
    );
    return '/';
  }
  if (screen === 'profile') {
    await mockApi(
      page,
      '/users/by-username/alexandra',
      state === 'error'
        ? { status: 404, json: {} }
        : {
            json: {
              ...author,
              bio: 'Designing for everyone: кириллица, emoji 👩🏽‍💻 and a deliberately long biography that wraps without covering profile actions.',
              banner: null,
              followersCount: 42,
              followingCount: 17,
              createdAt,
            },
          },
    );
    await mockApi(page, '/users/alexandra/showcase', { json: null });
    await mockApi(page, `/users/${author.id}/posts?**`, {
      json: { posts: state === 'empty' ? [] : [post], nextCursor: null },
    });
    await mockApi(page, `/users/${author.id}/reposts?**`, {
      json: { posts: [], nextCursor: null },
    });
    return '/profile/alexandra';
  }
  await mockApi(page, '/conversations', { json: [conversation] });
  await mockApi(page, '/conversations/design-conversation', { json: conversation });
  await mockApi(page, '/conversations/design-conversation/messages/read', { json: {} });
  await mockApi(
    page,
    '/conversations/design-conversation/messages?**',
    state === 'error'
      ? { status: 503, json: { message: 'Offline fixture' } }
      : { json: { data: state === 'empty' ? [] : [message], hasMore: false, nextCursor: null } },
  );
  return '/messages/design-conversation';
}

export async function recoverScreen(page: Page, screen: 'feed' | 'chat') {
  await mockApi(
    page,
    screen === 'feed' ? '/posts?**' : '/conversations/design-conversation/messages?**',
    {
      json:
        screen === 'feed'
          ? { posts: [post], nextCursor: null }
          : { data: [message], hasMore: false, nextCursor: null },
    },
  );
}
