import { http, HttpResponse } from 'msw';

export const notificationsHandlers = [
  http.get('*/notifications/unread-count', () => {
    return HttpResponse.json({
      total: 0,
      likes: 0,
      comments: 0,
      follows: 0,
      mentions: 0,
      reposts: 0,
      system: 0,
    });
  }),

  http.get('*/notifications', () => {
    return HttpResponse.json({
      items: [],
      nextCursor: null,
      hasMore: false,
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
    });
  }),

  http.patch('*/notifications/:id/read', () => {
    return HttpResponse.json({
      id: 'notif-1',
      isRead: true,
    });
  }),

  http.patch('*/notifications/read-all', () => {
    return HttpResponse.json({
      success: true,
      count: 0,
      unreadCounts: {
        total: 0,
        likes: 0,
        comments: 0,
        follows: 0,
        mentions: 0,
        reposts: 0,
        system: 0,
      },
    });
  }),

  http.get('*/notifications/settings', () => {
    return HttpResponse.json({
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
    });
  }),

  http.patch('*/notifications/settings', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    return HttpResponse.json({
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
      ...body,
    });
  }),

  http.delete('*/notifications/:id', () => {
    return HttpResponse.json({
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
    });
  }),

  http.post('*/notifications/mute-author/:actorId', ({ params }) => {
    return HttpResponse.json({
      enableNotifications: true,
      mutedActorIds: [params.actorId],
    });
  }),

  http.delete('*/notifications/mute-author/:actorId', () => {
    return HttpResponse.json({
      enableNotifications: true,
      mutedActorIds: [],
    });
  }),
];
