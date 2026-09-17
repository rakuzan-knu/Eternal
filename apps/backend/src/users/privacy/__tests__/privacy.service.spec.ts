import { AutoDeletePeriod, ExceptionMode, PrivacyDimension, Visibility } from '@prisma/client';
import { PrivacyService } from '../privacy.service';
import type { RedisService } from '../../../redis/redis.service';

describe('PrivacyService', () => {
  let service: PrivacyService;
  let mockPrivacyRepo: {
    getUserPrivacyAndUser: jest.Mock;
    upsertPrivacyAndUser: jest.Mock;
    listExceptions: jest.Mock;
    upsertException: jest.Mock;
    deleteException: jest.Mock;
    loadVisibilityContextData: jest.Mock;
    loadPresenceAudienceData: jest.Mock;
  };
  let mockRedis: {
    del: jest.Mock;
  };

  beforeEach(() => {
    mockPrivacyRepo = {
      getUserPrivacyAndUser: jest.fn().mockResolvedValue({
        privacy: null,
        user: { isPrivate: false, autoDeletePeriod: AutoDeletePeriod.OFF },
      }),
      upsertPrivacyAndUser: jest.fn().mockResolvedValue({
        privacy: { allowNearbyRecommendations: true },
        user: { isPrivate: false, autoDeletePeriod: AutoDeletePeriod.OFF },
      }),
      listExceptions: jest.fn().mockResolvedValue({ allow: [], deny: [] }),
      upsertException: jest.fn().mockResolvedValue(undefined),
      deleteException: jest.fn().mockResolvedValue(undefined),
      loadVisibilityContextData: jest.fn().mockResolvedValue({
        privacyRows: [],
        exceptionRows: [],
        followRows: [],
        blockRows: [],
      }),
      loadPresenceAudienceData: jest.fn().mockResolvedValue({
        privacyRow: null,
        exceptionRows: [],
        followRows: [],
        blockRows: [],
      }),
    };

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    };

    service = new PrivacyService(mockPrivacyRepo, mockRedis as unknown as RedisService);
  });

  describe('getMyPrivacy', () => {
    it('returns default privacy settings when no custom row exists', async () => {
      mockPrivacyRepo.getUserPrivacyAndUser.mockResolvedValueOnce({
        privacy: null,
        user: {
          isPrivate: false,
          autoDeletePeriod: AutoDeletePeriod.OFF,
        },
      });

      const settings = await service.getMyPrivacy('usr-1');

      expect(settings.lastSeen).toBe(Visibility.EVERYBODY);
      expect(settings.birthday).toBe(Visibility.NOBODY);
      expect(settings.isPrivate).toBe(false);
      expect(settings.autoDeletePeriod).toBe(AutoDeletePeriod.OFF);
      expect(settings.allowNearbyRecommendations).toBe(true);
    });

    it('returns customized privacy settings from database row', async () => {
      mockPrivacyRepo.getUserPrivacyAndUser.mockResolvedValueOnce({
        privacy: {
          userId: 'usr-1',
          lastSeen: Visibility.CONTACTS,
          avatar: Visibility.CONTACTS,
          banner: Visibility.EVERYBODY,
          forwardLink: Visibility.NOBODY,
          calls: Visibility.CONTACTS,
          voiceMessages: Visibility.CONTACTS,
          messages: Visibility.EVERYBODY,
          birthday: Visibility.CONTACTS,
          bio: Visibility.EVERYBODY,
          groupInvites: Visibility.CONTACTS,
          allowNearbyRecommendations: false,
        },
        user: {
          isPrivate: true,
          autoDeletePeriod: AutoDeletePeriod.MONTH,
        },
      });

      const settings = await service.getMyPrivacy('usr-1');

      expect(settings.lastSeen).toBe(Visibility.CONTACTS);
      expect(settings.isPrivate).toBe(true);
      expect(settings.autoDeletePeriod).toBe(AutoDeletePeriod.MONTH);
      expect(settings.allowNearbyRecommendations).toBe(false);
    });
  });

  describe('updateMyPrivacy', () => {
    it('updates visibility and user privacy options via transaction and clears redis', async () => {
      const updatedPrivacyRow = {
        userId: 'usr-1',
        avatar: Visibility.NOBODY,
        lastSeen: Visibility.CONTACTS,
        allowNearbyRecommendations: true,
      };
      const updatedUserRow = {
        isPrivate: true,
        autoDeletePeriod: AutoDeletePeriod.WEEK,
      };

      mockPrivacyRepo.upsertPrivacyAndUser.mockResolvedValueOnce({
        privacy: updatedPrivacyRow,
        user: updatedUserRow,
      });

      const result = await service.updateMyPrivacy('usr-1', {
        avatar: Visibility.NOBODY,
        lastSeen: Visibility.CONTACTS,
        isPrivate: true,
        autoDeletePeriod: AutoDeletePeriod.WEEK,
      });

      expect(mockPrivacyRepo.upsertPrivacyAndUser).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('userusr-1');
      expect(result.avatar).toBe(Visibility.NOBODY);
      expect(result.isPrivate).toBe(true);
    });
  });

  describe('listExceptions, addException, removeException', () => {
    it('listExceptions categorizes exceptions into allow and deny buckets', async () => {
      mockPrivacyRepo.listExceptions.mockResolvedValueOnce({
        allow: [
          {
            id: 'usr-allowed',
            username: 'allowed_user',
            displayName: 'Allowed',
            avatar: null,
          },
        ],
        deny: [
          {
            id: 'usr-denied',
            username: 'denied_user',
            displayName: 'Denied',
            avatar: null,
          },
        ],
      });

      const result = await service.listExceptions('usr-1', PrivacyDimension.AVATAR);

      expect(result.allow).toHaveLength(1);
      expect(result.allow[0].id).toBe('usr-allowed');
      expect(result.deny).toHaveLength(1);
      expect(result.deny[0].id).toBe('usr-denied');
    });

    it('addException upserts exception and invalidates cache', async () => {
      await service.addException(
        'usr-1',
        PrivacyDimension.LAST_SEEN,
        'usr-target',
        ExceptionMode.ALLOW,
      );

      expect(mockPrivacyRepo.upsertException).toHaveBeenCalledWith(
        'usr-1',
        PrivacyDimension.LAST_SEEN,
        'usr-target',
        ExceptionMode.ALLOW,
      );
      expect(mockRedis.del).toHaveBeenCalledWith('userusr-1');
    });

    it('removeException deletes exception and invalidates cache', async () => {
      await service.removeException('usr-1', PrivacyDimension.LAST_SEEN, 'usr-target');

      expect(mockPrivacyRepo.deleteException).toHaveBeenCalledWith(
        'usr-1',
        PrivacyDimension.LAST_SEEN,
        'usr-target',
      );
      expect(mockRedis.del).toHaveBeenCalledWith('userusr-1');
    });
  });
});
