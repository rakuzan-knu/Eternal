import {
  NotificationResponseDto,
  NotificationType,
  getNotificationsQuerySchema,
  notificationSettingsSchema,
  updateNotificationSettingsSchema,
  type NotificationWithRelations,
} from '../notifications';

describe('Notifications Contract', () => {
  const baseNotification: NotificationWithRelations = {
    id: 'n-1',
    userId: 'u-1',
    actorId: 'a-1',
    type: NotificationType.LIKE_POST,
    postId: 'p-1',
    commentId: null,
    text: null,
    extraCount: 0,
    isRead: false,
    createdAt: new Date('2026-08-28T12:00:00.000Z'),
    actor: {
      id: 'a-1',
      username: 'johndoe',
      displayName: 'John Doe',
      avatar: 'avatar.jpg',
      isVerified: true,
      primaryBadge: 'gold',
    },
    post: {
      id: 'p-1',
      content: 'Post content',
      media: [{ url: 'img.jpg', type: 'image' }],
    },
    comment: null,
  };

  it('maps LIKE_POST notification correctly with single actor', () => {
    const dto = NotificationResponseDto.fromPrisma(baseNotification);
    expect(dto.id).toBe('n-1');
    expect(dto.actionText).toBe('John Doe liked your post');
    expect(dto.deepLink).toBe('/post/p-1');
    expect(dto.post?.mediaUrl).toBe('img.jpg');
    expect(dto.actor?.displayName).toBe('John Doe');
  });

  it('maps LIKE_POST with extra count', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      extraCount: 4,
    });
    expect(dto.actionText).toBe('John Doe and 4 others liked your post');
  });

  it('maps LIKE_COMMENT notification with and without commentId/postId', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.LIKE_COMMENT,
      commentId: 'c-1',
    });
    expect(dto.actionText).toBe('John Doe liked your comment');
    expect(dto.deepLink).toBe('/post/p-1?commentId=c-1');

    const dtoNoComment = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.LIKE_COMMENT,
      commentId: null,
    });
    expect(dtoNoComment.deepLink).toBe('/post/p-1');

    const dtoNoPost = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.LIKE_COMMENT,
      postId: null,
    });
    expect(dtoNoPost.deepLink).toBe('/notifications');
  });

  it('maps COMMENT notification', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.COMMENT,
      commentId: 'c-1',
    });
    expect(dto.actionText).toBe('John Doe commented on your post');
    expect(dto.deepLink).toBe('/post/p-1?commentId=c-1');
  });

  it('maps FOLLOW notification', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.FOLLOW,
    });
    expect(dto.actionText).toBe('John Doe started following you');
    expect(dto.deepLink).toBe('/johndoe');

    const dtoNoActor = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.FOLLOW,
      actor: null,
    });
    expect(dtoNoActor.deepLink).toBe('/notifications');
  });

  it('maps REPOST notification', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.REPOST,
    });
    expect(dto.actionText).toBe('John Doe reposted your post');
    expect(dto.deepLink).toBe('/post/p-1');
  });

  it('maps MENTION notification in comment vs post', () => {
    const dtoComment = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.MENTION,
      commentId: 'c-1',
    });
    expect(dtoComment.actionText).toBe('John Doe mentioned you in a comment');
    expect(dtoComment.deepLink).toBe('/post/p-1?commentId=c-1');

    const dtoPost = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.MENTION,
      commentId: null,
    });
    expect(dtoPost.actionText).toBe('John Doe mentioned you in a post');
  });

  it('maps SYSTEM_VERIFIED notification', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.SYSTEM_VERIFIED,
    });
    expect(dto.actionText).toBe('Your account has been verified');
    expect(dto.deepLink).toBe('/profile');
  });

  it('maps SYSTEM_VIEW notification', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.SYSTEM_VIEW,
      text: 'Milestone 1000 views',
    });
    expect(dto.actionText).toBe('Milestone 1000 views');
    expect(dto.deepLink).toBe('/post/p-1');

    const dtoDefault = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.SYSTEM_VIEW,
      text: null,
      postId: null,
    });
    expect(dtoDefault.actionText).toBe('Your post reached new milestone');
    expect(dtoDefault.deepLink).toBe('/notifications');
  });

  it('maps SYSTEM / default notification', () => {
    const dto = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: NotificationType.SYSTEM,
      text: 'Server maintenance',
    });
    expect(dto.actionText).toBe('Server maintenance');
    expect(dto.deepLink).toBe('/notifications');

    const dtoDefault = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      type: 'UNKNOWN' as unknown as NotificationType,
      text: null,
    });
    expect(dtoDefault.actionText).toBe('System notification');
  });

  it('handles safe ISO string parsing with various value formats', () => {
    const d1 = NotificationResponseDto.fromPrisma({ ...baseNotification, createdAt: '' });
    expect(typeof d1.createdAt).toBe('string');

    const d2 = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      createdAt: '2026-08-28T12:00:00.000Z',
    });
    expect(d2.createdAt).toBe('2026-08-28T12:00:00.000Z');

    const customObj = { toISOString: () => '2026-01-01T00:00:00.000Z' };
    const d3 = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      createdAt: customObj as unknown as Date,
    });
    expect(d3.createdAt).toBe('2026-01-01T00:00:00.000Z');

    const d4 = NotificationResponseDto.fromPrisma({
      ...baseNotification,
      createdAt: 'invalid-date',
    });
    expect(typeof d4.createdAt).toBe('string');
  });

  it('validates schemas with default and custom values', () => {
    const q = getNotificationsQuerySchema.parse({});
    expect(q.limit).toBe(20);
    expect(q.type).toBe('all');

    const settings = notificationSettingsSchema.parse({});
    expect(settings.enableNotifications).toBe(true);
    expect(settings.volume).toBe(100);
    expect(settings.toastPosition).toBe('bottom-right');

    const partial = updateNotificationSettingsSchema.parse({ volume: 75 });
    expect(partial.volume).toBe(75);
  });
});
