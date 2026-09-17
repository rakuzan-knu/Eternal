import {
  LastSeenGranularity,
  FollowStatusView,
  updateUserSchema,
  privacySettingsSchema,
  updatePrivacySchema,
  addPrivacyExceptionSchema,
} from '../users';
import { AutoDeletePeriod, ExceptionMode, PrivacyDimension, Visibility } from '@prisma/client';

describe('users.contract', () => {
  describe('enums and constants', () => {
    it('defines LastSeenGranularity values', () => {
      expect(LastSeenGranularity.RECENTLY).toBe('RECENTLY');
      expect(LastSeenGranularity.WITHIN_WEEK).toBe('WITHIN_WEEK');
      expect(LastSeenGranularity.WITHIN_MONTH).toBe('WITHIN_MONTH');
      expect(LastSeenGranularity.LONG_AGO).toBe('LONG_AGO');
    });

    it('defines FollowStatusView values', () => {
      expect(FollowStatusView.NONE).toBe('none');
      expect(FollowStatusView.PENDING).toBe('pending');
      expect(FollowStatusView.FOLLOWING).toBe('following');
    });
  });

  describe('updateUserSchema and sanitization', () => {
    it('sanitizes HTML in displayName and bio and normalizes username/email', () => {
      const parsed = updateUserSchema.parse({
        email: 'alice@example.com',
        username: 'alice_w',
        displayName: 'Alice <script>alert(1)</script>',
        bio: 'Hello <b>world</b> <img src=x onerror=alert(1)>',
      });

      expect(parsed.email).toBe('alice@example.com');
      expect(parsed.username).toBe('alice_w');
      expect(parsed.displayName).toBe('Alice');
      expect(parsed.bio).toBe('Hello world');
    });

    it('rejects reserved usernames in updateUserSchema', () => {
      expect(() =>
        updateUserSchema.parse({
          username: 'admin',
        }),
      ).toThrow();
    });

    it('rejects invalid username formats', () => {
      expect(() =>
        updateUserSchema.parse({
          username: '.invalid.',
        }),
      ).toThrow();
    });
  });

  describe('privacy & settings schemas', () => {
    it('validates privacySettingsSchema fields', () => {
      const parsed = privacySettingsSchema.parse({
        lastSeen: Visibility.EVERYBODY,
        avatar: Visibility.CONTACTS,
        banner: Visibility.NOBODY,
        forwardLink: Visibility.EVERYBODY,
        calls: Visibility.CONTACTS,
        voiceMessages: Visibility.NOBODY,
        messages: Visibility.EVERYBODY,
        birthday: Visibility.CONTACTS,
        bio: Visibility.EVERYBODY,
        groupInvites: Visibility.CONTACTS,
        isPrivate: true,
        autoDeletePeriod: AutoDeletePeriod.MONTH,
        allowNearbyRecommendations: true,
      });

      expect(parsed.isPrivate).toBe(true);
      expect(parsed.messages).toBe(Visibility.EVERYBODY);
      expect(parsed.autoDeletePeriod).toBe(AutoDeletePeriod.MONTH);
    });

    it('validates updatePrivacySchema partial updates', () => {
      const parsed = updatePrivacySchema.parse({
        messages: Visibility.NOBODY,
        isPrivate: false,
      });

      expect(parsed.messages).toBe(Visibility.NOBODY);
      expect(parsed.isPrivate).toBe(false);
    });

    it('validates addPrivacyExceptionSchema', () => {
      const parsed = addPrivacyExceptionSchema.parse({
        dimension: PrivacyDimension.MESSAGES,
        targetId: 'target-usr-1',
        mode: ExceptionMode.ALLOW,
      });

      expect(parsed.dimension).toBe(PrivacyDimension.MESSAGES);
      expect(parsed.mode).toBe(ExceptionMode.ALLOW);
    });
  });
});
