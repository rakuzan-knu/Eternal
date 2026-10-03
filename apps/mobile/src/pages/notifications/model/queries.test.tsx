// @vitest-environment jsdom
import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import type {
  NotificationResponseDto,
  NotificationUnreadCountsDto,
} from '@social-network/shared-contracts';
import { notificationsKeys, useNotificationActions } from './queries';
import type { NotificationsData } from './notifications';

const api = vi.hoisted(() => ({
  readAll: vi.fn(),
  read: vi.fn(),
  delete: vi.fn(),
  session: vi.fn(),
}));
vi.mock('../api/notificationsApi', () => ({ notificationsApi: api }));
vi.mock('@/shared/api/client', () => ({ assertSession: api.session }));
vi.mock('@social-network/shared-stores', () => ({
  useAuthStore: { getState: () => ({ refreshToken: 'refresh' }) },
}));

const counts: NotificationUnreadCountsDto = {
  total: 3,
  likes: 2,
  comments: 1,
  follows: 0,
  mentions: 0,
  reposts: 0,
  system: 0,
};
const afterLikes = { ...counts, total: 1, likes: 0 };
const like: NotificationResponseDto = {
  id: 'n1',
  userId: 'viewer',
  actorId: null,
  actor: null,
  type: 'LIKE_POST',
  postId: 'p1',
  commentId: null,
  text: null,
  extraCount: 0,
  isRead: false,
  createdAt: '2026-10-03T12:00:00Z',
  post: null,
  actionText: 'Liked your post',
  deepLink: '/post/p1',
};
const data: NotificationsData = {
  pages: [
    {
      items: [
        like,
        { ...like, id: 'n2', type: 'LIKE_COMMENT' },
        { ...like, id: 'n3', type: 'COMMENT' },
      ],
      nextCursor: null,
      hasMore: false,
      unreadCounts: counts,
    },
  ],
  pageParams: [undefined],
};
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let dispose: (() => Promise<void>) | undefined;
afterEach(async () => {
  await dispose?.();
  vi.resetAllMocks();
});

async function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  for (const user of ['viewer', 'other']) {
    client.setQueryData(notificationsKeys.list(user, 'all'), data);
    client.setQueryData(notificationsKeys.unread(user), counts);
  }
  client.setQueryData(notificationsKeys.list('viewer', 'comments'), {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.type === 'COMMENT'),
    })),
  });
  let actions: ReturnType<typeof useNotificationActions> | undefined;
  function Harness() {
    actions = useNotificationActions('viewer');
    return null;
  }
  const element = document.createElement('div');
  const root = createRoot(element);
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
  dispose = async () => {
    await act(async () => root.unmount());
    client.clear();
  };
  const readLikes = () => {
    if (!actions) throw new Error('Hook not mounted');
    return actions.mutateAsync({ kind: 'readAll', filter: 'likes' });
  };
  return { client, readLikes };
}

it('updates only confirmed likes and current-account caches, preserving comments and other accounts', async () => {
  api.readAll.mockResolvedValue({ success: true, count: 2, unreadCounts: afterLikes });
  const { client, readLikes } = await setup();
  await act(async () => {
    await readLikes();
  });
  expect(api.readAll).toHaveBeenCalledWith('likes');
  const all = client.getQueryData<NotificationsData>(notificationsKeys.list('viewer', 'all'));
  expect(all?.pages[0]?.items.map((item) => item.isRead)).toEqual([true, true, false]);
  expect(all?.pages[0]?.unreadCounts).toEqual(afterLikes);
  const comments = client.getQueryData<NotificationsData>(
    notificationsKeys.list('viewer', 'comments'),
  );
  expect(comments?.pages[0]?.items[0]?.isRead).toBe(false);
  expect(comments?.pages[0]?.unreadCounts).toEqual(afterLikes);
  expect(client.getQueryData(notificationsKeys.unread('viewer'))).toEqual(afterLikes);
  expect(client.getQueryData(notificationsKeys.list('other', 'all'))).toEqual(data);
  expect(client.getQueryData(notificationsKeys.unread('other'))).toEqual(counts);
});

it('preserves unread state and counts when read-all fails', async () => {
  api.readAll.mockRejectedValue(new Error('Unavailable'));
  const { client, readLikes } = await setup();
  await act(async () => {
    await expect(readLikes()).rejects.toThrow('Unavailable');
  });
  expect(client.getQueryData(notificationsKeys.list('viewer', 'all'))).toEqual(data);
  expect(client.getQueryData(notificationsKeys.unread('viewer'))).toEqual(counts);
});

it('rejects a changed session before sending any notification mutation', async () => {
  api.session.mockImplementation(() => {
    throw new Error('The account session changed');
  });
  const { client, readLikes } = await setup();
  await act(async () => {
    await expect(readLikes()).rejects.toThrow('session changed');
  });
  expect(api.session).toHaveBeenCalledWith('viewer', 'refresh');
  expect(api.readAll).not.toHaveBeenCalled();
  expect(api.read).not.toHaveBeenCalled();
  expect(api.delete).not.toHaveBeenCalled();
  expect(client.getQueryData(notificationsKeys.list('viewer', 'all'))).toEqual(data);
});
