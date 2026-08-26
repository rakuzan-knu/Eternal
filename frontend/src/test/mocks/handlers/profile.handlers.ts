import { http, HttpResponse } from 'msw';

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
  themeProposals: 'EVERYBODY',
  isPrivate: false,
  autoDeletePeriod: 'OFF',
};

export const profileHandlers = [
  http.get('*/auth/check-username', ({ request }) => {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    if (username && username.includes('taken')) {
      return HttpResponse.json({ isAvailable: false });
    }
    return HttpResponse.json({ isAvailable: true });
  }),

  http.get('*/users/me/privacy', () => HttpResponse.json(privacy)),

  http.get('*/users/me/privacy/exceptions', () => HttpResponse.json({ allow: [], deny: [] })),

  http.post('*/users/me/privacy/exceptions', () =>
    HttpResponse.json({ id: 'exc-1', targetId: 'usr-2', mode: 'ALLOW' }),
  ),

  http.delete('*/users/me/privacy/exceptions/:dimension/:targetId', () =>
    HttpResponse.json({ success: true }),
  ),

  http.get('*/users/me/follow-requests/count', () => HttpResponse.json({ count: 0 })),

  http.get('*/users/me/follow-requests', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/me/friends', () => HttpResponse.json([])),

  http.get('*/users/me/saved-posts', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/:id/saved-posts', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/:id/followers', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/:id/following', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/by-username/:username', ({ params }) => {
    const username = params.username as string;
    return HttpResponse.json({
      ...profile,
      username,
      displayName: username === 'kolya_dev' ? 'Kolya' : profile.displayName,
    });
  }),

  http.get('*/users/:id', () => HttpResponse.json(profile)),

  http.patch('*/users/:id', () => HttpResponse.json(profile)),

  http.delete('*/users/:id', () => HttpResponse.json({ success: true })),

  http.get('https://api.github.com/repos/rakuzan-knu/social-network/pulls', () =>
    HttpResponse.json([]),
  ),
];
