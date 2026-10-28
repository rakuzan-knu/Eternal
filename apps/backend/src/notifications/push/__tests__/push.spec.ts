import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationType } from '@prisma/client';
import type { ConfigService } from '@nestjs/config';
import { ExpoPushClient } from '../expo-push.client';
import { messagePushCopy, notificationPushCopy } from '../push-copy';
import { allowsCategory, messageAllowed, quiet } from '../push-dispatch.service';
import { PushDevicesService } from '../push-devices.service';

const visible = { showName: true, showText: true };
const settings = {
  enableNotifications: true,
  dndUntil: null,
  mutedActorIds: [] as string[],
  ...visible,
  privateChats: true,
  groups: true,
  likes: false,
  comments: true,
  reposts: true,
  followers: true,
  mentions: true,
  system: true,
};

describe('push copy', () => {
  it('localizes activity and hides the actor when names are private', () => {
    expect(notificationPushCopy(NotificationType.FOLLOW, 'uk', visible, 'Mia', null).body).toBe(
      'Mia тепер стежить за вами',
    );
    expect(
      notificationPushCopy(
        NotificationType.COMMENT,
        'en',
        { showName: false, showText: true },
        'Mia',
        null,
      ).body,
    ).toBe('You have a new notification');
  });

  it('never previews end-to-end encrypted direct messages', () => {
    const copy = messagePushCopy({
      locale: 'en',
      privacy: visible,
      senderName: 'Mia',
      conversationName: null,
      isGroup: false,
      encrypted: true,
      text: '{"v":3,"ct":"secret"}',
      attachmentKind: null,
    });
    expect(copy).toEqual({ title: 'Mia', body: 'New message' });
  });

  it('previews group text only when allowed', () => {
    const base = {
      locale: 'uk' as const,
      senderName: 'Mia',
      conversationName: 'Design crit',
      isGroup: true,
      encrypted: false,
      text: 'Ship it',
      attachmentKind: null,
    };
    expect(messagePushCopy({ ...base, privacy: visible }).body).toBe('Mia: Ship it');
    expect(messagePushCopy({ ...base, privacy: { showName: true, showText: false } }).body).toBe(
      'Нове повідомлення від Mia',
    );
  });
});

describe('push filters', () => {
  it('respects categories, pauses and muted authors', () => {
    expect(allowsCategory(settings, NotificationType.LIKE_POST)).toBe(false);
    expect(allowsCategory(settings, NotificationType.COMMENT)).toBe(true);
    expect(quiet({ ...settings, dndUntil: new Date(Date.now() + 60_000) }, null)).toBe(true);
    expect(quiet({ ...settings, mutedActorIds: ['a'] }, 'a')).toBe(true);
    expect(quiet(settings, 'a')).toBe(false);
  });

  it('honours chat mutes and mention-only modes', () => {
    const prefs = {
      muteLevel: 'NONE',
      mutedUntil: null,
      notificationMode: null,
      communityMode: null,
      communityMutedUntil: null,
    };
    expect(messageAllowed(prefs, false)).toBe(true);
    expect(messageAllowed({ ...prefs, muteLevel: 'MESSAGES' }, false)).toBe(false);
    expect(
      messageAllowed(
        { ...prefs, muteLevel: 'MESSAGES', mutedUntil: new Date(Date.now() - 1) },
        false,
      ),
    ).toBe(true);
    expect(messageAllowed({ ...prefs, communityMode: 'MENTIONS' }, false)).toBe(false);
    expect(messageAllowed({ ...prefs, communityMode: 'MENTIONS' }, true)).toBe(true);
    expect(
      messageAllowed({ ...prefs, notificationMode: 'ALL', communityMode: 'NONE' }, false),
    ).toBe(true);
  });
});

describe('ExpoPushClient', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
    vi.restoreAllMocks();
  });

  it('reports unregistered devices for cleanup', async () => {
    process.env.NODE_ENV = 'production';
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }],
        }),
        { status: 200 },
      ),
    );
    const client = new ExpoPushClient({ get: () => undefined } as unknown as ConfigService);
    const result = await client.send([
      {
        to: 'ExponentPushToken[a]',
        title: 't',
        body: 'b',
        data: { kind: 'message', conversationId: 'c' },
      },
      {
        to: 'ExponentPushToken[b]',
        title: 't',
        body: 'b',
        data: { kind: 'message', conversationId: 'c' },
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ invalidTokens: ['ExponentPushToken[b]'], failed: 1 });
  });

  it('stays silent in tests and when disabled', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');
    const client = new ExpoPushClient({ get: () => undefined } as unknown as ConfigService);
    await client.send([
      {
        to: 'ExponentPushToken[a]',
        title: 't',
        body: 'b',
        data: { kind: 'message', conversationId: 'c' },
      },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('PushDevicesService', () => {
  it('links the device to the caller’s own session only', async () => {
    const upsert = vi.fn(async ({ create }: { create: Record<string, unknown> }) => create);
    const prisma = {
      session: { findUnique: vi.fn().mockResolvedValue({ userId: 'other' }) },
      pushDevice: { upsert },
    };
    const service = new PushDevicesService(prisma as never);
    await service.register('me', 'jti-1', {
      token: 'ExponentPushToken[x]',
      platform: 'ios',
      locale: 'uk',
    });
    expect(upsert.mock.calls[0]?.[0].create).toMatchObject({
      userId: 'me',
      sessionJti: null,
      locale: 'uk',
    });
  });
});
