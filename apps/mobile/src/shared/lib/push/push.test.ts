import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  post: vi.fn(async () => ({ data: {} })),
  remove: vi.fn(async () => ({ data: {} })),
  permission: { granted: true, canAskAgain: true },
  handler: null as null | { handleNotification: (n: unknown) => Promise<Record<string, boolean>> },
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => mocks.storage.get(key) ?? null,
    setItem: async (key: string, value: string) => void mocks.storage.set(key, value),
    removeItem: async (key: string) => void mocks.storage.delete(key),
  },
}));
vi.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { eas: { projectId: 'p' } } } },
}));
vi.mock('expo-device', () => ({ isDevice: true }));
vi.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  setNotificationHandler: (handler: typeof mocks.handler) => {
    mocks.handler = handler;
  },
  setNotificationChannelAsync: async () => null,
  getPermissionsAsync: async () => mocks.permission,
  requestPermissionsAsync: async () => mocks.permission,
  getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[abc]' }),
}));
vi.mock('@/shared/api/client', () => ({
  getMobileApi: () => ({ post: mocks.post, delete: mocks.remove }),
}));

const push = await import('./push');

beforeEach(() => {
  mocks.storage.clear();
  mocks.post.mockClear();
  mocks.remove.mockClear();
  mocks.permission = { granted: true, canAskAgain: true };
});

it('accepts only known push payloads', () => {
  expect(push.pushData({ kind: 'message', conversationId: 'c1' })).toEqual({
    kind: 'message',
    conversationId: 'c1',
  });
  expect(push.pushData({ kind: 'message' })).toBeNull();
  expect(
    push.pushData({ kind: 'notification', notificationType: 'FOLLOW', actorUsername: 'mia' }),
  ).toEqual({
    kind: 'notification',
    notificationType: 'FOLLOW',
    actorUsername: 'mia',
  });
  expect(push.pushData('nope')).toBeNull();
});

it('registers the token with the app language and respects opting out', async () => {
  expect(await push.enablePush(true)).toBe('enabled');
  expect(mocks.post).toHaveBeenCalledWith('/notifications/push-devices', {
    token: 'ExponentPushToken[abc]',
    platform: 'ios',
    locale: 'en',
  });
  await push.disablePush(true);
  expect(mocks.remove).toHaveBeenCalledWith(
    '/notifications/push-devices/ExponentPushToken%5Babc%5D',
  );
  mocks.post.mockClear();
  await push.refreshPush();
  expect(mocks.post).not.toHaveBeenCalled();
  expect(await push.pushStatus()).toBe('off');
});

it('reports blocked permissions without asking again', async () => {
  mocks.permission = { granted: false, canAskAgain: false };
  expect(await push.enablePush(true)).toBe('blocked');
  expect(mocks.post).not.toHaveBeenCalled();
});

it('hides banners for the chat that is already open', async () => {
  push.configurePushPresentation();
  push.setVisibleConversation('c1');
  const open = await mocks.handler?.handleNotification({
    request: { content: { data: { kind: 'message', conversationId: 'c1' } } },
  });
  const other = await mocks.handler?.handleNotification({
    request: { content: { data: { kind: 'message', conversationId: 'c2' } } },
  });
  expect(open?.shouldShowBanner).toBe(false);
  expect(other?.shouldShowBanner).toBe(true);
  push.setVisibleConversation(null);
});
