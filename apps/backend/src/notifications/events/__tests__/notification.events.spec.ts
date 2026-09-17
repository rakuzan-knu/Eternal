import { CreateNotificationEvent, NOTIFICATION_EVENTS } from '../notification.events';
import { NotificationType } from '@common/contracts';

describe('NotificationEvents', () => {
  it('instantiates CreateNotificationEvent with default payload', () => {
    const event = new CreateNotificationEvent('user-1', NotificationType.FOLLOW);
    expect(event.userId).toBe('user-1');
    expect(event.type).toBe(NotificationType.FOLLOW);
    expect(event.payload).toEqual({});
  });

  it('instantiates CreateNotificationEvent with custom payload', () => {
    const event = new CreateNotificationEvent('user-1', NotificationType.LIKE_POST, {
      actorId: 'actor-1',
      postId: 'post-1',
      allowGrouping: true,
    });
    expect(event.payload.actorId).toBe('actor-1');
    expect(event.payload.postId).toBe('post-1');
    expect(event.payload.allowGrouping).toBe(true);
  });

  it('exports valid event constants', () => {
    expect(NOTIFICATION_EVENTS.CREATE).toBe('notification.create');
  });
});
