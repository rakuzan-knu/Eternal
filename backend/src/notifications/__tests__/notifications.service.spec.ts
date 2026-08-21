import { Test, type TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import {
  NOTIFICATIONS_REPOSITORY,
  type INotificationsRepository,
} from '../interfaces/notifications-repository.interface';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import { NotificationType } from '@common/contracts';
import type { Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';
import { WS_EVENTS } from '../../messenger/events/ws-events';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockRepo: Record<keyof INotificationsRepository, jest.Mock>;
  let mockPrisma: { userBlock: { findFirst: jest.Mock } };
  let mockRedis: { getClient: jest.Mock };
  let mockGateway: { emitToUser: jest.Mock };

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
    };

    mockPrisma = {
      userBlock: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    mockRedis = {
      getClient: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue('OK'),
      }),
    };

    mockGateway = {
      emitToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NOTIFICATIONS_REPOSITORY,
          useValue: mockRepo,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: RedisService,
          useValue: mockRedis,
        },
        {
          provide: MessengerGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
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
      mockPrisma.userBlock.findFirst.mockResolvedValueOnce({
        blockerId: 'user-1',
        blockedId: 'user-2',
      });

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
        actorId: 'user-3', // Previous liker
        extraCount: 0,
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

  describe('getNotifications', () => {
    it('should return paginated notifications with unread counts breakdown', async () => {
      const result = await service.getNotifications('user-1', { limit: 10, type: 'likes' });

      expect(result.items).toHaveLength(1);
      expect(result.unreadCounts.total).toBe(1);
      expect(result.unreadCounts.likes).toBe(1);
      expect(mockRepo.findMany).toHaveBeenCalledWith({
        userId: 'user-1',
        types: [NotificationType.LIKE_POST, NotificationType.LIKE_COMMENT],
        limit: 10,
        cursor: undefined,
      });
    });
  });

  describe('markAsRead', () => {
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
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and emit socket event', async () => {
      const result = await service.markAllAsRead('user-1', 'all');

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-1', undefined);
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_READ,
        expect.objectContaining({
          allRead: true,
        }),
      );
    });
  });

  describe('getUnreadCounts', () => {
    it('should return unread counts for all categories', async () => {
      const result = await service.getUnreadCounts('user-1');

      expect(result.total).toBe(1);
      expect(result.likes).toBe(1);
      expect(result.comments).toBe(0);
    });
  });

  describe('settings and preference guard', () => {
    it('should get notification settings with defaults if not set in db', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValueOnce(null);

      const settings = await service.getSettings('user-1');

      expect(settings.enableNotifications).toBe(true);
      expect(settings.likes).toBe(true);
      expect(settings.mentions).toBe(true);
      expect(settings.system).toBe(true);
    });

    it('should update notification settings and update cache', async () => {
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
      };
      mockRepo.upsertSettings = jest.fn().mockResolvedValueOnce(updatedRow);

      const result = await service.updateSettings('user-1', { likes: false, allowSound: false });

      expect(result.likes).toBe(false);
      expect(result.allowSound).toBe(false);
      expect(mockRepo.upsertSettings).toHaveBeenCalledWith('user-1', {
        likes: false,
        allowSound: false,
      });
    });

    it('should suppress WebSocket push notification when user has disabled that category', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValueOnce({
        enableNotifications: true,
        likes: false, // Likes disabled
        comments: true,
        reposts: true,
        followers: true,
        mentions: true,
        system: true,
      });

      await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-2',
        postId: 'post-1',
      });

      // Notification is still created in database
      expect(mockRepo.create).toHaveBeenCalled();
      // But socket broadcast is suppressed because likes are disabled
      expect(mockGateway.emitToUser).not.toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_NEW,
        expect.anything(),
      );
    });

    it('should suppress WebSocket push notification when Do Not Disturb is active', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValueOnce({
        enableNotifications: true,
        likes: true,
        dndUntil: new Date(Date.now() + 3600 * 1000), // Active DND for 1 hour
      });

      await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-2',
        postId: 'post-1',
      });

      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockGateway.emitToUser).not.toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_NEW,
        expect.anything(),
      );
    });

    it('should suppress WebSocket push notification from muted author', async () => {
      mockRepo.getSettings = jest.fn().mockResolvedValueOnce({
        enableNotifications: true,
        likes: true,
        mutedActorIds: ['user-2'], // user-2 is muted
      });

      await service.createNotification('user-1', NotificationType.LIKE_POST, {
        actorId: 'user-2',
        postId: 'post-1',
      });

      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockGateway.emitToUser).not.toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_NEW,
        expect.anything(),
      );
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
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-1',
        WS_EVENTS.NOTIFICATION_READ,
        expect.objectContaining({
          notificationId: 'notif-1',
          deleted: true,
        }),
      );
    });

    it('should throw NotFoundException if notification does not exist or unauthorized', async () => {
      mockRepo.delete = jest.fn().mockResolvedValueOnce(false);

      await expect(service.deleteNotification('notif-999', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
