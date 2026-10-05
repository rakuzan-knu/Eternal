import type { Page } from '@playwright/test';
import type {
  NotificationItem,
  NotificationUnreadCounts,
} from '../../src/entities/notification/model/types';
import type { UserStoriesGroup } from '../../src/features/stories/model/types';
import type { ReelComment, PaginatedReels } from '../../src/features/reels/api/reelsApi';
import { fulfillApi, mockApi } from '../fixtures';
import { authorName, prepareScreen } from './screen-fixtures';

export type ExtendedState = 'content' | 'loading' | 'empty' | 'error';
export const extendedText =
  'Довгий текст для перевірки перенесення: Українська, English 👩🏽‍💻 🌍. '.repeat(6);
const createdAt = '2026-10-03T10:00:00.000Z';
const author = {
  id: 'usr-alexandra',
  username: 'alexandra',
  displayName: authorName,
  avatar: null,
};
export const unreadCounts: NotificationUnreadCounts = {
  total: 0,
  likes: 0,
  comments: 0,
  follows: 0,
  mentions: 0,
  reposts: 0,
  system: 0,
};
const notification: NotificationItem = {
  id: 'extended-notification',
  userId: 'usr-me',
  actorId: author.id,
  actor: author,
  type: 'COMMENT',
  text: extendedText,
  extraCount: 0,
  isRead: true,
  createdAt,
  actionText: 'commented on your post',
  post: { id: 'design-post', content: extendedText },
  comment: { id: 'extended-comment', text: extendedText },
};
export const notifications = {
  items: [notification],
  nextCursor: null,
  hasMore: false,
  unreadCounts,
};
export const reelComment: ReelComment = {
  id: 'extended-comment',
  reelId: 'reel-profkino-1',
  userId: author.id,
  user: author,
  content: extendedText,
  createdAt,
};
const reels: PaginatedReels = {
  data: [
    {
      id: 'reel-profkino-1',
      authorId: author.id,
      author,
      caption: extendedText,
      videoUrl: '/extended-media/video.mp4',
      thumbnailUrl: '/extended-media/poster.svg',
      hlsUrl: null,
      blurhash: null,
      thumbhash: null,
      duration: 15,
      width: 720,
      height: 1280,
      audioTitle: 'Offline original audio',
      audioArtist: authorName,
      audioUrl: null,
      viewsCount: 12,
      likesCount: 2,
      commentsCount: 1,
      sharesCount: 0,
      createdAt,
    },
  ],
  meta: { nextCursor: null, hasNextPage: false },
};
// Include both existing seed IDs so the hook does not prepend an unrelated seed.
reels.data.push({ ...reels.data[0], id: 'reel-profkino-2' });
const stories: UserStoriesGroup[] = [
  {
    user: author,
    hasUnviewed: true,
    hasCloseFriendsStory: false,
    latestStoryTimestamp: createdAt,
    stories: [
      {
        id: 'extended-story',
        authorId: author.id,
        author,
        caption: extendedText,
        mediaUrl: '/extended-media/poster.svg',
        mediaType: 'IMAGE',
        overlays: [],
        privacy: 'ALL_FOLLOWERS',
        createdAt,
        expiresAt: '2026-10-04T10:00:00.000Z',
        viewsCount: 1,
        hasViewed: false,
        userReaction: null,
        reactionsCount: {},
        pollResult: null,
      },
    ],
  },
];

// Holding the response renders a genuine pending query without racing a timeout.
export async function stateApi(
  page: Page,
  path: string,
  state: ExtendedState,
  content: unknown,
  empty: unknown,
) {
  if (state !== 'loading') {
    await mockApi(
      page,
      path,
      state === 'error'
        ? { status: 503, json: { message: 'Offline fixture' } }
        : { json: state === 'empty' ? empty : content },
    );
    return () => {};
  }
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const pathname = path.replace(/\?\*\*$/, '');
  await page.route(
    (url) =>
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      url.port === '3000' &&
      [pathname, `/v1${pathname}`].includes(url.pathname),
    async (route) => {
      if (route.request().method() !== 'OPTIONS') await gate;
      await fulfillApi(route, { json: content });
    },
  );
  return release;
}

export async function prepareExtended(
  page: Page,
  screen: 'search' | 'notifications' | 'stories' | 'reels' | 'settings',
  state: ExtendedState,
) {
  await prepareScreen(page, 'feed');
  await mockApi(page, '/notifications/unread-count', { json: unreadCounts });
  await page.route('**/extended-media/**', (route) =>
    route.request().url().endsWith('.svg')
      ? route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="720" height="1280" fill="#171726"/><circle cx="360" cy="560" r="180" fill="#433878"/></svg>',
        })
      : route.abort(),
  );
  if (screen === 'search') {
    await mockApi(page, '/users/trending-hashtags?**', { json: [] });
    await mockApi(page, '/users/top?**', { json: [] });
    await mockApi(page, '/users/hashtags?**', { json: [] });
    await mockApi(page, '/posts/search?**', { json: { posts: [], nextCursor: null } });
    const release = await stateApi(
      page,
      '/users/search?**',
      state,
      [{ ...author, bio: extendedText, followersCount: 42 }],
      [],
    );
    return { path: '/search?q=alexandra&tab=People', release };
  }
  if (screen === 'notifications') {
    const release = await stateApi(page, '/notifications?**', state, notifications, {
      ...notifications,
      items: [],
    });
    return { path: '/notifications', release };
  }
  if (screen === 'stories') {
    await mockApi(page, '/stories/extended-story/view', { json: {} });
    const release = await stateApi(page, '/stories/feed', state, stories, []);
    return { path: '/', release };
  }
  if (screen === 'reels') {
    await mockApi(page, '/reels/feed?**', { json: reels });
    await mockApi(page, '/reels/*/view', { json: {} });
    const release = await stateApi(
      page,
      '/reels/reel-profkino-1/comments',
      state,
      [reelComment],
      [],
    );
    return { path: '/reels', release };
  }
  await mockApi(page, '/users/mockme/showcase', { json: null });
  await mockApi(page, '/users/me/integrations', { json: [] });
  const release = await stateApi(
    page,
    '/auth/sessions',
    state,
    [
      {
        id: 'extended-session',
        deviceName: authorName + ' Chrome Windows',
        city: 'Київ',
        country: 'Україна',
        ip: '192.0.2.1',
        isCurrent: true,
        createdAt,
        lastActiveAt: createdAt,
      },
    ],
    [],
  );
  return { path: '/', release };
}
