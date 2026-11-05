import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNavigationQueue, parseDeepLink } from './deepLinks';
import { badgeArgumentsSchema, notificationArgumentsSchema } from '../shared/ipcContract';

afterEach(() => vi.useRealTimers());

describe('desktop navigation boundary', () => {
  it('converts only supported app destinations to relative paths', () => {
    expect(parseDeepLink('eternal://messages/conversation?messageId=message')).toBe(
      '/messages/conversation?messageId=message',
    );
    expect(parseDeepLink('eternal://notifications')).toBe('/notifications');
  });

  it.each([
    'https://messages/1',
    'eternal://user:secret@messages/1',
    'eternal://messages:42/1',
    'eternal://evil.example/1',
    'eternal://api/auth/callback?code=secret',
    'eternal://messages/%2f%2fevil.example',
    'eternal://messages/%5cfoo',
    'eternal://messages/../api',
    'eternal://messages/\n1',
    'eternal://messages/\\evil',
  ])('rejects unsafe/unsupported deep link %s', (value) => {
    expect(parseDeepLink(value)).toBeNull();
  });

  it('retains only the latest startup link and bounds/replaces pending invokes', async () => {
    vi.useFakeTimers();
    const queue = createNavigationQueue();
    queue.push('/messages/old');
    queue.push('/messages/new');
    expect(await queue.wait()).toBe('/messages/new');
    const first = queue.wait();
    const second = queue.wait();
    expect(await first).toBeNull();
    queue.push('/notifications');
    expect(await second).toBe('/notifications');
    const timeout = queue.wait();
    await vi.advanceTimersByTimeAsync(15000);
    expect(await timeout).toBeNull();
    const cancelled = queue.wait();
    queue.cancel();
    expect(await cancelled).toBeNull();
    queue.push('/messages/stale');
    queue.reset();
    const empty = queue.wait();
    queue.cancel();
    expect(await empty).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('validates entire native notification/badge tuples independently of sender authorization', () => {
    for (const path of [
      '//evil.example',
      'https://evil.example',
      'javascript:alert(1)',
      '/\\evil.example',
      '/messages/%0afoo',
    ]) {
      expect(
        notificationArgumentsSchema.safeParse([{ title: 'Test', body: '', path }]).success,
      ).toBe(false);
    }
    expect(
      notificationArgumentsSchema.safeParse([{ title: '', body: '', path: '/messages' }]).success,
    ).toBe(false);
    expect(
      notificationArgumentsSchema.safeParse([
        { title: 'Test', body: '', path: '/messages' },
        'extra',
      ]).success,
    ).toBe(false);
    expect(badgeArgumentsSchema.safeParse([-1]).success).toBe(false);
    expect(badgeArgumentsSchema.safeParse([1.5]).success).toBe(false);
    expect(badgeArgumentsSchema.safeParse([1000000]).success).toBe(false);
    expect(badgeArgumentsSchema.safeParse([1, 'extra']).success).toBe(false);
  });
});
