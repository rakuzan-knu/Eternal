import { NotificationsRepository } from '../notifications.repository';
import type { PrismaService } from '@common/prisma';
import { NotificationType } from '@common/contracts';

describe('NotificationsRepository', () => {
  let repository: NotificationsRepository;
  let prisma: {
    notification: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      delete: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
    };
    userNotificationSettings: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  const mockDate = new Date();
  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    actorId: 'actor-1',
    type: NotificationType.LIKE_POST,
    postId: 'post-1',
    commentId: null,
    text: null,
    extraCount: 0,
    isRead: false,
    createdAt: mockDate,
    actor: {
      id: 'actor-1',
      username: 'johndoe',
      displayName: 'John Doe',
      avatar: 'avatar.jpg',
      isVerified: true,
      primaryBadge: 'star',
    },
    post: {
      id: 'post-1',
      content: 'Hello world',
      media: [{ url: 'media.jpg', type: 'image' }],
    },
    comment: null,
  };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue(mockNotification),
        findFirst: jest.fn().mockResolvedValue(mockNotification),
        findUnique: jest.fn().mockResolvedValue(mockNotification),
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        update: jest.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        count: jest.fn().mockResolvedValue(5),
        groupBy: jest.fn().mockResolvedValue([
          { type: NotificationType.LIKE_POST, _count: { _all: 2 } },
          { type: NotificationType.LIKE_COMMENT, _count: { _all: 1 } },
          { type: NotificationType.COMMENT, _count: { _all: 3 } },
          { type: NotificationType.FOLLOW, _count: { _all: 4 } },
          { type: NotificationType.MENTION, _count: { _all: 1 } },
          { type: NotificationType.REPOST, _count: { _all: 2 } },
          { type: NotificationType.SYSTEM_VERIFIED, _count: { _all: 1 } },
          { type: NotificationType.SYSTEM_VIEW, _count: { _all: 1 } },
          { type: NotificationType.SYSTEM, _count: { _all: 1 } },
        ]),
        delete: jest.fn().mockResolvedValue(mockNotification),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'actor-1',
            username: 'johndoe',
            displayName: 'John Doe',
            avatar: 'avatar.jpg',
            isVerified: true,
            primaryBadge: 'star',
          },
        ]),
      },
      userNotificationSettings: {
        findUnique: jest.fn().mockResolvedValue({ userId: 'user-1', enableNotifications: true }),
        upsert: jest.fn().mockResolvedValue({ userId: 'user-1', enableNotifications: false }),
      },
    };

    repository = new NotificationsRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates notification with relations', async () => {
      const res = await repository.create({
        userId: 'user-1',
        actorId: 'actor-1',
        type: NotificationType.LIKE_POST,
        postId: 'post-1',
      });
      expect(res).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            actorId: 'actor-1',
            type: NotificationType.LIKE_POST,
            extraCount: 0,
          }) as unknown,
        }),
      );
    });

    it('creates notification with explicit extraCount and text', async () => {
      await repository.create({
        userId: 'user-1',
        actorId: 'actor-1',
        type: NotificationType.COMMENT,
        commentId: 'comment-1',
        text: 'test comment',
        extraCount: 5,
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            extraCount: 5,
            text: 'test comment',
          }) as unknown,
        }),
      );
    });
  });

  describe('findRecentMatching', () => {
    it('finds recent matching notification with custom withinSeconds', async () => {
      const res = await repository.findRecentMatching({
        userId: 'user-1',
        type: NotificationType.LIKE_POST,
        postId: 'post-1',
        commentId: 'c-1',
        withinSeconds: 3600,
      });
      expect(res).toEqual(mockNotification);
      expect(prisma.notification.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            type: NotificationType.LIKE_POST,
            postId: 'post-1',
            commentId: 'c-1',
          }) as unknown,
        }),
      );
    });

    it('finds recent matching with default withinSeconds', async () => {
      await repository.findRecentMatching({
        userId: 'user-1',
        type: NotificationType.FOLLOW,
      });
      expect(prisma.notification.findFirst).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates notification', async () => {
      const res = await repository.update('notif-1', { isRead: true });
      expect(res.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'notif-1' }, data: { isRead: true } }),
      );
    });
  });

  describe('findById', () => {
    it('finds unique notification by id', async () => {
      const res = await repository.findById('notif-1');
      expect(res).toEqual(mockNotification);
      expect(prisma.notification.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'notif-1' } }),
      );
    });
  });

  describe('findMany', () => {
    it('finds many notifications with filtering, limit and cursor', async () => {
      const res = await repository.findMany({
        userId: 'user-1',
        types: [NotificationType.LIKE_POST],
        limit: 10,
        cursor: 'notif-0',
      });
      expect(res).toEqual([mockNotification]);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', type: { in: [NotificationType.LIKE_POST] } },
          take: 11,
          skip: 1,
          cursor: { id: 'notif-0' },
        }),
      );
    });

    it('returns empty array when findMany throws', async () => {
      prisma.notification.findMany.mockRejectedValueOnce(new Error('DB Error'));
      const res = await repository.findMany({ userId: 'user-1', limit: 10 });
      expect(res).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read when owned by user', async () => {
      const res = await repository.markAsRead('notif-1', 'user-1');
      expect(res?.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalled();
    });

    it('returns null if notification not found or belongs to another user', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce(null);
      const res = await repository.markAsRead('notif-1', 'user-1');
      expect(res).toBeNull();

      prisma.notification.findUnique.mockResolvedValueOnce({ id: 'notif-1', userId: 'other-user' });
      const res2 = await repository.markAsRead('notif-1', 'user-1');
      expect(res2).toBeNull();
    });

    it('returns null on db error', async () => {
      prisma.notification.findUnique.mockRejectedValueOnce(new Error('DB error'));
      const res = await repository.markAsRead('notif-1', 'user-1');
      expect(res).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all as read and returns count', async () => {
      const count = await repository.markAllAsRead('user-1', [NotificationType.LIKE_POST]);
      expect(count).toBe(3);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            isRead: false,
            type: { in: [NotificationType.LIKE_POST] },
          }) as unknown,
        }),
      );
    });

    it('returns 0 on db error', async () => {
      prisma.notification.updateMany.mockRejectedValueOnce(new Error('DB error'));
      const count = await repository.markAllAsRead('user-1');
      expect(count).toBe(0);
    });
  });

  describe('countUnread', () => {
    it('counts unread notifications', async () => {
      const count = await repository.countUnread('user-1');
      expect(count).toBe(5);
    });

    it('returns 0 on db error', async () => {
      prisma.notification.count.mockRejectedValueOnce(new Error('DB error'));
      const count = await repository.countUnread('user-1');
      expect(count).toBe(0);
    });
  });

  describe('countUnreadByCategory', () => {
    it('groups and tallies unread categories accurately', async () => {
      const res = await repository.countUnreadByCategory('user-1');
      expect(res).toEqual({
        likes: 3,
        comments: 3,
        follows: 4,
        mentions: 1,
        reposts: 2,
        system: 3,
      });
    });

    it('returns 0-filled object on error', async () => {
      prisma.notification.groupBy.mockRejectedValueOnce(new Error('DB error'));
      const res = await repository.countUnreadByCategory('user-1');
      expect(res).toEqual({
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      });
    });
  });

  describe('delete', () => {
    it('deletes notification when owner matches', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce({ id: 'notif-1', userId: 'user-1' });
      const ok = await repository.delete('notif-1', 'user-1');
      expect(ok).toBe(true);
      expect(prisma.notification.delete).toHaveBeenCalledWith({ where: { id: 'notif-1' } });
    });

    it('returns false if not found or userId mismatch', async () => {
      prisma.notification.findUnique.mockResolvedValueOnce(null);
      expect(await repository.delete('notif-1')).toBe(false);

      prisma.notification.findUnique.mockResolvedValueOnce({ id: 'notif-1', userId: 'other' });
      expect(await repository.delete('notif-1', 'user-1')).toBe(false);
    });

    it('returns false on db error', async () => {
      prisma.notification.findUnique.mockRejectedValueOnce(new Error('DB error'));
      expect(await repository.delete('notif-1')).toBe(false);
    });
  });

  describe('getUsersByIds', () => {
    it('returns empty array when ids is empty', async () => {
      const res = await repository.getUsersByIds([]);
      expect(res).toEqual([]);
    });

    it('fetches users by ids', async () => {
      const res = await repository.getUsersByIds(['actor-1']);
      expect(res).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['actor-1'] } },
        select: expect.any(Object) as unknown,
      });
    });
  });

  describe('getSettings and upsertSettings', () => {
    it('fetches user notification settings', async () => {
      const settings = await repository.getSettings('user-1');
      expect(settings?.userId).toBe('user-1');
      expect(prisma.userNotificationSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('upserts notification settings with provided values and defaults', async () => {
      const res = await repository.upsertSettings('user-1', {
        enableNotifications: false,
        volume: 50,
        toastPosition: 'top-right',
        dndUntil: mockDate,
        mutedActorIds: ['actor-2'],
      });
      expect(res.userId).toBe('user-1');
      expect(prisma.userNotificationSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          create: expect.objectContaining({
            enableNotifications: false,
            volume: 50,
            toastPosition: 'top-right',
            dndUntil: mockDate,
            mutedActorIds: ['actor-2'],
          }) as unknown,
        }),
      );

      await repository.upsertSettings('user-1', {});
      expect(prisma.userNotificationSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            enableNotifications: true,
            volume: 100,
            toastPosition: 'bottom-right',
            maxToasts: 3,
            dndUntil: null,
            mutedActorIds: [],
          }) as unknown,
        }),
      );
    });
  });
});
