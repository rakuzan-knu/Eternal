import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

const profile = {
  id: 'user-1',
  username: 'my_profile',
  displayName: 'Ayate',
  bio: 'Rozroblyayu Eternal.',
  avatar: null,
  banner: null,
  bannerPosition: 50,
  isPrivate: false,
  followStatus: 'none',
};

const privacy = {
  lastSeen: 'EVERYBODY',
  avatar: 'EVERYBODY',
  banner: 'EVERYBODY',
  forwardLink: 'EVERYBODY',
  calls: 'EVERYBODY',
  voiceMessages: 'EVERYBODY',
  messages: 'EVERYBODY',
  birthday: 'NOBODY',
  bio: 'EVERYBODY',
  groupInvites: 'EVERYBODY',
  isPrivate: false,
  autoDeletePeriod: 'OFF',
};

export const profileHandlers = [
  http.get(`${API_URL}/auth/check-username`, () => HttpResponse.json({ isAvailable: true })),

  http.get(`${API_URL}/users/me/privacy`, () => HttpResponse.json(privacy)),

  http.get(`${API_URL}/users/me/follow-requests/count`, () => HttpResponse.json({ count: 0 })),

  http.get(`${API_URL}/users/me/follow-requests`, () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get(`${API_URL}/auth/sessions`, () => HttpResponse.json([])),

  http.get(`${API_URL}/users/:id`, () => HttpResponse.json(profile)),

  http.patch('/api/users/:id', () => HttpResponse.json(profile)),
  http.patch(`${API_URL}/users/:id`, () => HttpResponse.json(profile)),

  http.delete('/api/users/:id', () => HttpResponse.json({ success: true })),
  http.delete(`${API_URL}/users/:id`, () => HttpResponse.json({ success: true })),
];
