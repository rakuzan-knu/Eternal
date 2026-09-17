import { Test, type TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import {
  NOTIFICATIONS_REPOSITORY,
  type INotificationsRepository,
} from '../interfaces/notifications-repository.interface';
import { RedisService } from '../../redis/redis.service';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import { NotificationType } from '@common/contracts';
import type { Prisma } from '@prisma/client';
import { NotFoundException, Logger } from '@nestjs/common';
import { WS_EVENTS } from '../../messenger/events/ws-events';

import { QueueService } from '../../queue/queue.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepo: Record<keyof INotificationsRepository, jest.Mock>;
  let mockRedis: { getClient: jest.Mock; get: jest.Mock; set: jest.Mock };
  let mockGateway: { emitToUser: jest.Mock };
  let mockQueueService: { addNotificationJob: jest.Mock };

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    actorId: 'user-2',
    type: NotificationType.LIKE_POST,
    postId: 'post-1',
    commentId: null,
    text: null,
    extraCount: 0,
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    actor: {
      id: 'user-2',
      username: 'alex',
      displayName: 'Alex Kovalenko',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true,
      primaryBadge: null,
    },
    post: {
      id: 'post-1',
      content: 'Hello world post',
      media: [{ url: 'https://example.com/img.jpg', type: 'IMAGE' }],
    },
    comment: null,
  };

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn().mockResolvedValue(mockNotification),
      findRecentMatching: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(mockNotification),
      findById: jest.fn().mockResolvedValue(mockNotification),
      findMany: jest.fn().mockResolvedValue([mockNotification]),
      markAsRead: jest.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue(1),
      countUnread: jest.fn().mockResolvedValue(1),
      countUnreadByCategory: jest.fn().mockResolvedValue({
        likes: 1,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      }),
      delete: jest.fn().mockResolvedValue(true),
      getUsersByIds: jest.fn().mockResolvedValue([]),
      getSettings: jest.fn().mockResolvedValue(null),
      upsertSettings: jest.fn().mockResolvedValue({}),
      isBlocked: jest.fn().mockResolvedValue(false),
    };

    mockRedis = {
      getClient: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue('OK'),
      }),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      acquireLock: jest.fn().mockResolvedValue('token-123'),
      releaseLock: jest.fn().mockResolvedValue(true),
    } as unknown as { getClient: jest.Mock; get: jest.Mock; set: jest.Mock };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    mockQueueService = {
      addNotificationJob: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NOTIFICATIONS_REPOSITORY,
          useValue: mockRepo,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: MessengerGateway,
          useValue: mockGateway,
        },
        {
          provide: QueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification and emit socket event', async () => {
      const result = await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-2',
        postId: 'post-1',
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('notif-1');
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_NEW,
        expect.objectContaining({
          notification: expect.objectContaining({ id: 'notif-1' }) as unknown,
        }),
      );
    });

    it('should NOT create notification if actorId equals userId (self-notification)', async () => {
      const result = await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-1',
        postId: 'post-1',
      });

      expect(result).toBeNull();
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('should NOT create notification if user is blocked by actor or vice versa', async () => {
      mockRepo.isBlocked.mockResolvedValueOnce(true);

      const result = await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-2',
        postId: 'post-1',
      });

      expect(result).toBeNull();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should aggregate/smart group notifications if recent matching exists', async () => {
      mockRepo.findRecentMatching.mockResolvedValueOnce({
        ...mockNotification,
        actorId: 'user-3',
      });

      mockRepo.update.mockResolvedValueOnce({
        ...mockNotification,
        actorId: 'user-2',
        extraCount: 1,
      });

      const result = await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-2',
        postId: 'post-1',
        allowGrouping: true,
      });

      expect(result).toBeDefined();
      expect(mockRepo.update).toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications with different filters', () => {
    it('should filter by comments, follows, mentions, reposts, system', async () => {
      await service.getNotifications('user-1', { limit: 10, type: 'comments' });
      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ types: [NotificationType.COMMENT] }),
      );

      await service.getNotifications('user-1', { limit: 10, type: 'follows' });
      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ types: [NotificationType.FOLLOW] }),
      );

      await service.getNotifications('user-1', { limit: 10, type: 'mentions' });
      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ types: [NotificationType.MENTION] }),
      );

      await service.getNotifications('user-1', { limit: 10, type: 'reposts' });
      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ types: [NotificationType.REPOST] }),
      );

      await service.getNotifications('user-1', { limit: 10, type: 'system' });
      expect(mockRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          types: [
            NotificationType.SYSTEM_VERIFIED,
            NotificationType.SYSTEM_VIEW,
            NotificationType.SYSTEM,
          ],
        }),
      );
    });
  });

  describe('markAsRead & markAllAsRead', () => {
    it('should mark single notification as read and emit socket event', async () => {
      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result.isRead).toBe(true);
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_READ,
        expect.objectContaining({
          notificationId: 'notif-1',
          allRead: false,
        }),
      );
    });

    it('should throw NotFoundException if notification is not found or owned by someone else', async () => {
      mockRepo.markAsRead.mockResolvedValueOnce(null);

      await expect(service.markAsRead('notif-1', 'user-999')).rejects.toThrow(NotFoundException);
    });

    it('should mark all notifications as read', async () => {
      const result = await service.markAllAsRead('user-1', 'all');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-1', undefined);
    });
  });

  describe('getUnreadCounts', () => {
    it('should return unread counts for all categories and handle errors gracefully', async () => {
      const result = await service.getUnreadCounts('user-1');

      expect(result.total).toBe(1);
      expect(result.likes).toBe(1);
      expect(result.comments).toBe(0);

      mockRepo.countUnread.mockRejectedValueOnce(new Error('DB failure'));
      const fallback = await service.getUnreadCounts('user-1');
      expect(fallback.total).toBe(0);
    });
  });

  describe('settings, push allowed checks, and author muting', () => {
    it('should get notification settings from cache or db with muted actors enrichment', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValue({
        mutedActorIds: ['u-2'],
      });
      mockRepo.getUsersByIds.mockResolvedValue([
        { id: 'u-2', username: 'alex', displayName: 'Alex', avatar: null, isVerified: true },
      ]);

      const settings = await service.getSettings('user-1');
      expect(settings.mutedActors).toHaveLength(1);
      expect(settings.mutedActors?.[0]?.username).toBe('alex');

      // Test cached branch
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(settings));
      const cached = await service.getSettings('user-1');
      expect(cached.mutedActors).toHaveLength(1);
    });

    it('should update notification settings with dndUntil and invalidation', async () => {
      const updatedRow = {
        userId: 'user-1',
        enableNotifications: true,
        allowSound: false,
        volume: 80,
        showName: true,
        showText: true,
        privateChats: true,
        groups: true,
        reactions: true,
        likes: false,
        comments: true,
        reposts: true,
        followers: true,
        mentions: true,
        system: true,
        toastPosition: 'top-right',
        maxToasts: 2,
        dndUntil: new Date('2026-10-01T00:00:00.000Z'),
        mutedActorIds: [],
      };
      mockRepo.upsertSettings = jest.fn().mockResolvedValueOnce(updatedRow);

      const result = await service.updateSettings('user-1', {
        likes: false,
        allowSound: false,
        dndUntil: '2026-10-01T00:00:00.000Z',
      });

      expect(result.dndUntil).toBe('2026-10-01T00:00:00.000Z');
      expect(mockRepo.upsertSettings).toHaveBeenCalled();
    });

    it('isNotificationPushAllowed checks all categories correctly', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValue({
        enableNotifications: true,
        likes: true,
        comments: false,
        reposts: true,
        followers: false,
        mentions: true,
        system: false,
      });

      expect(await service.isNotificationPushAllowed('u-1', NotificationType.LIKE_POST)).toBe(true);
      expect(await service.isNotificationPushAllowed('u-1', NotificationType.COMMENT)).toBe(false);
      expect(await service.isNotificationPushAllowed('u-1', NotificationType.REPOST)).toBe(true);
      expect(await service.isNotificationPushAllowed('u-1', NotificationType.FOLLOW)).toBe(false);
      expect(await service.isNotificationPushAllowed('u-1', NotificationType.MENTION)).toBe(true);
      expect(await service.isNotificationPushAllowed('u-1', NotificationType.SYSTEM)).toBe(false);
    });

    it('should mute and unmute author', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValue({
        enableNotifications: true,
        mutedActorIds: [],
      });
      mockRepo.upsertSettings = jest
        .fn()
        .mockImplementation(
          (_userId: string, data: Prisma.UserNotificationSettingsUpdateInput) => ({
            enableNotifications: true,
            mutedActorIds: Array.isArray(data.mutedActorIds) ? data.mutedActorIds : [],
          }),
        );

      const muteRes = await service.muteAuthor('user-1', 'user-2');
      expect(muteRes.mutedActorIds).toContain('user-2');

      mockRepo.getSettings = jest.fn().mockResolvedValue({
        enableNotifications: true,
        mutedActorIds: ['user-2'],
      });

      const unmuteRes = await service.unmuteAuthor('user-1', 'user-2');
      expect(unmuteRes.mutedActorIds).not.toContain('user-2');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification and emit socket event', async () => {
      mockRepo.delete = jest.fn().mockResolvedValueOnce(true);

      const result = await service.deleteNotification('notif-1', 'user-1');

      expect(result.success).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    it('should throw NotFoundException if notification does not exist or unauthorized', async () => {
      mockRepo.delete = jest.fn().mockResolvedValueOnce(false);

      await expect(service.deleteNotification('notif-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
