// src/mocks/handlers.ts – MSW v2 API
import { http, HttpResponse } from 'msw';

export const handlers = [
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

  // Fallback: return empty 200 for any unmatched request
  http.all('*', () => HttpResponse.json({})),
];
