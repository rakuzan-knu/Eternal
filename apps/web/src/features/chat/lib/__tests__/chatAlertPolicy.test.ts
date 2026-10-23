import { describe, expect, it } from 'vitest';
import { allowsChatAlert } from '../chatAlertPolicy';

const defaults = {
  myMuteLevel: 'NONE',
  blockedByMe: false,
  blockingMe: false,
  isBlocked: false,
} as const;
const now = Date.parse('2026-10-22T12:00:00Z');
const expired = '2026-10-22T11:59:59Z';
const future = '2026-10-22T12:01:00Z';

describe('chat alert policy', () => {
  it('defaults legacy conversations to ALL and fails closed for unknown or blocked conversations', () => {
    expect(allowsChatAlert(defaults, 'me', undefined)).toBe(true);
    expect(allowsChatAlert(undefined, 'me', ['me'])).toBe(false);
    for (const flag of ['blockedByMe', 'blockingMe', 'isBlocked']) {
      expect(allowsChatAlert({ ...defaults, [flag]: true }, 'me', ['me'])).toBe(false);
    }
  });

  it('uses the effective inherited mode and requires explicit mention metadata', () => {
    const inherited = {
      ...defaults,
      myNotificationMode: null,
      myEffectiveNotificationMode: 'MENTIONS',
    } as const;
    expect(allowsChatAlert(inherited, 'me', ['other'])).toBe(false);
    expect(allowsChatAlert(inherited, 'me', ['me'])).toBe(true);
    expect(allowsChatAlert(inherited, 'me', ['me'], 'reaction')).toBe(false);
    expect(
      allowsChatAlert({ ...inherited, myEffectiveNotificationMode: 'NONE' }, 'me', ['me']),
    ).toBe(false);
    expect(
      allowsChatAlert(
        { ...inherited, myNotificationMode: 'NONE', myEffectiveNotificationMode: 'ALL' },
        'me',
        [],
      ),
    ).toBe(true);
  });

  it('expires both independent server mute and legacy message mute', () => {
    expect(
      allowsChatAlert(
        { ...defaults, myNotificationMutedUntil: future },
        'me',
        ['me'],
        'message',
        now,
      ),
    ).toBe(false);
    expect(
      allowsChatAlert({ ...defaults, myNotificationMutedUntil: expired }, 'me', [], 'message', now),
    ).toBe(true);
    for (const myMuteLevel of ['MESSAGES', 'MESSAGES_AND_CALLS'] as const) {
      expect(
        allowsChatAlert(
          { ...defaults, myMuteLevel, myMutedUntil: future },
          'me',
          [],
          'message',
          now,
        ),
      ).toBe(false);
      expect(
        allowsChatAlert(
          { ...defaults, myMuteLevel, myMutedUntil: expired },
          'me',
          [],
          'message',
          now,
        ),
      ).toBe(true);
      expect(
        allowsChatAlert({ ...defaults, myMuteLevel, myMutedUntil: null }, 'me', [], 'message', now),
      ).toBe(false);
    }
    expect(
      allowsChatAlert(
        {
          ...defaults,
          myMuteLevel: 'MESSAGES',
          myMutedUntil: expired,
          myNotificationMutedUntil: future,
        },
        'me',
        [],
        'message',
        now,
      ),
    ).toBe(false);
    expect(allowsChatAlert({ ...defaults, myMuteLevel: 'CALLS' }, 'me', [], 'message', now)).toBe(
      true,
    );
  });
});
