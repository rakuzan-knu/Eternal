import type { NotificationType } from '@common/contracts';

export class CreateNotificationEvent {
  constructor(
    public readonly userId: string,
    public readonly type: NotificationType,
    public readonly payload: {
      actorId?: string | null;
      postId?: string | null;
      commentId?: string | null;
      text?: string | null;
      allowGrouping?: boolean;
    } = {},
  ) {}
}

export const NOTIFICATION_EVENTS = {
  CREATE: 'notification.create',
} as const;
