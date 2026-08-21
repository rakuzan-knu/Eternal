import { Test, type TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';
import { type NotificationResponseDto, NotificationType } from '@common/contracts';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockService: Record<keyof NotificationsService, jest.Mock>;

  const mockUser: RequestUser = { id: 'user-1', email: 'user@example.com', username: 'user1' };

  const mockDto: NotificationResponseDto = {
    id: 'notif-1',
    userId: 'user-1',
    actorId: 'user-2',
    actor: {
      id: 'user-2',
      username: 'alex',
      displayName: 'Alex Kovalenko',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true,
      primaryBadge: null,
    },
    type: NotificationType.LIKE_POST,
    postId: 'post-1',
    commentId: null,
    text: null,
    extraCount: 0,
    isRead: false,
    createdAt: new Date().toISOString(),
    post: {
      id: 'post-1',
      content: 'Post content',
      mediaUrl: 'https://example.com/media.jpg',
      mediaType: 'IMAGE',
    },
    actionText: 'Alex Kovalenko liked your post',
    deepLink: '/post/post-1',
  };

  beforeEach(async () => {
    mockService = {
      getNotifications: jest.fn().mockResolvedValue({
        items: [mockDto],
        nextCursor: null,
        hasMore: false,
        unreadCounts: {
          total: 1,
          likes: 1,
          comments: 0,
          follows: 0,
          mentions: 0,
          reposts: 0,
          system: 0,
        },
      }),
      getUnreadCounts: jest.fn().mockResolvedValue({
        total: 1,
        likes: 1,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      }),
      markAsRead: jest.fn().mockResolvedValue({ ...mockDto, isRead: true }),
      markAllAsRead: jest.fn().mockResolvedValue({
        success: true,
        count: 1,
        unreadCounts: {
          total: 0,
          likes: 0,
          comments: 0,
          follows: 0,
          mentions: 0,
          reposts: 0,
          system: 0,
        },
      }),
      getSettings: jest.fn().mockResolvedValue({
        enableNotifications: true,
        allowSound: true,
        volume: 100,
        showName: true,
        showText: true,
        privateChats: true,
        groups: true,
        reactions: true,
        likes: true,
        comments: true,
        reposts: true,
        followers: true,
        mentions: true,
        system: true,
        toastPosition: 'bottom-right',
        maxToasts: 3,
      }),
      updateSettings: jest.fn().mockResolvedValue({
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
        toastPosition: 'bottom-right',
        maxToasts: 3,
      }),
      muteAuthor: jest.fn().mockResolvedValue({
        enableNotifications: true,
        mutedActorIds: ['user-2'],
      }),
      unmuteAuthor: jest.fn().mockResolvedValue({
        enableNotifications: true,
        mutedActorIds: [],
      }),
      deleteNotification: jest.fn().mockResolvedValue({
        success: true,
        unreadCounts: {
          total: 0,
          likes: 0,
          comments: 0,
          follows: 0,
          mentions: 0,
          reposts: 0,
          system: 0,
        },
      }),
      handleNotificationCreated: jest.fn(),
      createNotification: jest.fn(),
      isNotificationPushAllowed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should get notifications', async () => {
    const result = await controller.getNotifications(mockUser, { limit: 20, type: 'all' });
    expect(result.items).toHaveLength(1);
    expect(mockService.getNotifications).toHaveBeenCalledWith('user-1', {
      limit: 20,
      type: 'all',
    });
  });

  it('should get unread counts', async () => {
    const result = await controller.getUnreadCounts(mockUser);
    expect(result.total).toBe(1);
    expect(mockService.getUnreadCounts).toHaveBeenCalledWith('user-1');
  });

  it('should get notification settings', async () => {
    const result = await controller.getSettings(mockUser);
    expect(result.enableNotifications).toBe(true);
    expect(mockService.getSettings).toHaveBeenCalledWith('user-1');
  });

  it('should update notification settings', async () => {
    const result = await controller.updateSettings(mockUser, { likes: false });
    expect(result.likes).toBe(false);
    expect(mockService.updateSettings).toHaveBeenCalledWith('user-1', { likes: false });
  });

  it('should mute author notifications', async () => {
    const result = await controller.muteAuthor('user-2', mockUser);
    expect(result.mutedActorIds).toContain('user-2');
    expect(mockService.muteAuthor).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('should unmute author notifications', async () => {
    const result = await controller.unmuteAuthor('user-2', mockUser);
    expect(result.mutedActorIds).toEqual([]);
    expect(mockService.unmuteAuthor).toHaveBeenCalledWith('user-1', 'user-2');
  });

  it('should mark single notification as read', async () => {
    const result = await controller.markAsRead('notif-1', mockUser);
    expect(result.isRead).toBe(true);
    expect(mockService.markAsRead).toHaveBeenCalledWith('notif-1', 'user-1');
  });

  it('should mark all notifications as read', async () => {
    const result = await controller.markAllAsRead(mockUser, 'likes');
    expect(result.success).toBe(true);
    expect(mockService.markAllAsRead).toHaveBeenCalledWith('user-1', 'likes');
  });

  it('should delete single notification', async () => {
    const result = await controller.deleteNotification('notif-1', mockUser);
    expect(result.success).toBe(true);
    expect(mockService.deleteNotification).toHaveBeenCalledWith('notif-1', 'user-1');
  });
});
