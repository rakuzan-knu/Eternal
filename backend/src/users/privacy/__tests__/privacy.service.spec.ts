import { AutoDeletePeriod, ExceptionMode, PrivacyDimension, Visibility } from '@prisma/client';
import type { PrismaService } from '@common/prisma';
import { PrivacyService } from '../privacy.service';
import type { RedisService } from '../../../redis/redis.service';

describe('PrivacyService', () => {
  let service: PrivacyService;
  let mockPrisma: {
    userPrivacy: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    privacyException: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let mockRedis: {
    del: jest.Mock;
  };

  beforeEach(() => {
    mockPrisma = {
      userPrivacy: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      privacyException: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockRedis = {
      del: jest.fn().mockResolvedValue(1),
    };

    service = new PrivacyService(
      mockPrisma as unknown as PrismaService,
      mockRedis as unknown as RedisService,
    );
  });

  describe('getMyPrivacy', () => {
    it('returns default privacy settings when no custom row exists', async () => {
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        isPrivate: false,
        autoDeletePeriod: AutoDeletePeriod.OFF,
      });

      const settings = await service.getMyPrivacy('usr-1');

      expect(settings.lastSeen).toBe(Visibility.EVERYBODY);
      expect(settings.birthday).toBe(Visibility.NOBODY);
      expect(settings.isPrivate).toBe(false);
      expect(settings.autoDeletePeriod).toBe(AutoDeletePeriod.OFF);
      expect(settings.allowNearbyRecommendations).toBe(true);
    });

    it('returns customized privacy settings from database row', async () => {
      mockPrisma.userPrivacy.findUnique.mockResolvedValueOnce({
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
      });
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        isPrivate: true,
        autoDeletePeriod: AutoDeletePeriod.MONTH,
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

      mockPrisma.$transaction.mockResolvedValueOnce([updatedPrivacyRow, updatedUserRow]);

      const result = await service.updateMyPrivacy('usr-1', {
        avatar: Visibility.NOBODY,
        lastSeen: Visibility.CONTACTS,
        isPrivate: true,
        autoDeletePeriod: AutoDeletePeriod.WEEK,
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('userusr-1');
      expect(result.avatar).toBe(Visibility.NOBODY);
      expect(result.isPrivate).toBe(true);
    });
  });

  describe('listExceptions, addException, removeException', () => {
    it('listExceptions categorizes exceptions into allow and deny buckets', async () => {
      mockPrisma.privacyException.findMany.mockResolvedValueOnce([
        {
          mode: ExceptionMode.ALLOW,
          target: {
            id: 'usr-allowed',
            username: 'allowed_user',
            displayName: 'Allowed',
            avatar: null,
          },
        },
        {
          mode: ExceptionMode.DENY,
          target: {
            id: 'usr-denied',
            username: 'denied_user',
            displayName: 'Denied',
            avatar: null,
          },
        },
      ]);

      const result = await service.listExceptions('usr-1', PrivacyDimension.AVATAR);

      expect(result.allow).toHaveLength(1);
      expect(result.allow[0].id).toBe('usr-allowed');
      expect(result.deny).toHaveLength(1);
      expect(result.deny[0].id).toBe('usr-denied');
    });

    it('addException upserts exception and invalidates cache', async () => {
      mockPrisma.privacyException.upsert.mockResolvedValueOnce({});

      await service.addException(
        'usr-1',
        PrivacyDimension.LAST_SEEN,
        'usr-target',
        ExceptionMode.ALLOW,
      );

      expect(mockPrisma.privacyException.upsert).toHaveBeenCalledWith({
        where: {
          ownerId_dimension_targetId: {
            ownerId: 'usr-1',
            dimension: PrivacyDimension.LAST_SEEN,
            targetId: 'usr-target',
          },
        },
        create: {
          ownerId: 'usr-1',
          dimension: PrivacyDimension.LAST_SEEN,
          targetId: 'usr-target',
          mode: ExceptionMode.ALLOW,
        },
        update: { mode: ExceptionMode.ALLOW },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('userusr-1');
    });

    it('removeException deletes exception and invalidates cache', async () => {
      mockPrisma.privacyException.deleteMany.mockResolvedValueOnce({ count: 1 });

      await service.removeException('usr-1', PrivacyDimension.LAST_SEEN, 'usr-target');

      expect(mockPrisma.privacyException.deleteMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'usr-1',
          dimension: PrivacyDimension.LAST_SEEN,
          targetId: 'usr-target',
        },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('userusr-1');
    });
  });
});
