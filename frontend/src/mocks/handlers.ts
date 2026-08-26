// src/mocks/handlers.ts – MSW v2 API
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock stories feed
  http.get('*/stories/feed', () => {
    return HttpResponse.json([]);
  }),
  http.get('*/stories/user/:userId', () => {
    return HttpResponse.json(null);
  }),
  // Mock user profile fetch
  http.get('/api/profile/:userId', ({ params }) => {
    const { userId } = params;
    return HttpResponse.json({
      id: userId,
      username: 'mockuser',
      displayName: 'Mock User',
      avatar: null,
    });
  }),
];
