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

const mockSuggestedUsers = [
  {
    id: 'user-suggested-1',
    username: 'sophie_dev',
    displayName: 'Sophie Dev',
    avatar: null,
    bio: 'Fullstack Engineer',
    isFollowing: false,
    followsYou: false,
    isFriend: false,
    isVerified: true,
    primaryBadge: null,
    recommendationReason: { text: 'Suggested for you', type: 'GENERAL' },
  },
  {
    id: 'user-suggested-2',
    username: 'alex_creator',
    displayName: 'Alex Creator',
    avatar: null,
    bio: 'Digital artist',
    isFollowing: false,
    followsYou: false,
    isFriend: false,
    isVerified: false,
    primaryBadge: null,
    recommendationReason: { text: 'Suggested for you', type: 'GENERAL' },
  },
];

const mockShowcase = {
  id: 'showcase-1',
  userId: 'user-1',
  hasVisibleWidgets: true,
  relationship: 'SELF',
  privacyMeta: 'PUBLIC',
  privacyActivity: 'PUBLIC',
  privacyShowcase: 'PUBLIC',
  privacyLinks: 'PUBLIC',
  accentColor: '#6366f1',
  showAge: true,
  showBirthdate: true,
  showGender: true,
  showTimezone: true,
  pronouns: 'he/him',
  timezone: 'UTC',
  birthDate: '2000-08-15',
  age: 26,
  gender: 'Male',
  zodiacSign: '♌ Leo',
  localTime: '18:30 (UTC)',
  connectedAccounts: {
    github: 'ayatedev',
    steam: 'ayate_steam',
    spotify: 'ayate_spotify',
    discord: 'ayate#0001',
    twitch: 'ayate_live',
  },
  activityStatus: null,
  spotlightMedia: null,
  anthemTrack: null,
  socialLinks: [],
  wishlist: [],
  mediaItems: [],
  badges: [],
  pinnedAchievements: [],
  customWidgets: [],
};

export const profileHandlers = [
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

  http.post(
    '*/users/me/follow-requests/:followerId/accept',
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.post(
    '*/users/me/follow-requests/:followerId/reject',
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.get('*/users/me/friends', () => HttpResponse.json([])),

  http.delete('*/users/me/followers/:followerId', () => new HttpResponse(null, { status: 204 })),

  http.get('*/users/me/saved-posts', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/suggested', () => HttpResponse.json(mockSuggestedUsers)),

  http.post('*/users/suggested/:targetId/dismiss', () => HttpResponse.json({ success: true })),

  http.get('*/users/top', () => HttpResponse.json([profile])),

  http.get('*/users/trending-hashtags', () =>
    HttpResponse.json([
      { tag: 'nature', count: 12 },
      { tag: 'tech', count: 8 },
    ]),
  ),

  http.get('*/users/hashtags', () => HttpResponse.json([{ tag: 'nature', count: 12 }])),

  http.get('*/users/search', () => HttpResponse.json([profile])),

  http.get('*/users/mention-suggestions', () => HttpResponse.json([profile])),

  http.get('*/users/showcase/search-media', () => HttpResponse.json([])),

  http.get('*/users/showcase/search-tracks', () => HttpResponse.json([])),

  http.get('*/users/:username/showcase', ({ params }) => {
    const username = params.username as string;
    return HttpResponse.json({
      ...mockShowcase,
      id: `showcase-${username}`,
    });
  }),

  http.patch('*/users/me/showcase', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    return HttpResponse.json({
      ...mockShowcase,
      ...body,
    });
  }),

  http.get('*/users/by-username/:username', ({ params }) => {
    const username = params.username as string;
    return HttpResponse.json({
      ...profile,
      username,
      displayName: username === 'kolya_dev' ? 'Kolya' : profile.displayName,
    });
  }),

  http.post('*/users/:id/avatar', () => HttpResponse.json({ avatar: 'blob:mock-url' })),

  http.post('*/users/:id/banner', () => HttpResponse.json({ banner: 'blob:mock-url' })),

  http.post('*/users/:id/follow', () => HttpResponse.json({ success: true, isFollowing: true })),

  http.delete('*/users/:id/follow', () => new HttpResponse(null, { status: 204 })),

  http.post('*/users/:id/block', () => HttpResponse.json({ success: true })),

  http.delete('*/users/:id/block', () => HttpResponse.json({ success: true })),

  http.post('*/users/:id/alias', () => HttpResponse.json({ success: true })),

  http.delete('*/users/:id/alias', () => HttpResponse.json({ success: true })),

  http.patch('*/users/primary-badge', () => HttpResponse.json(profile)),

  http.patch('*/users/profile/primary-badge', () => HttpResponse.json(profile)),

  http.get('*/users/:id/saved-posts', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/:id/followers', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/:id/following', () =>
    HttpResponse.json({ data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/users/me', () =>
    HttpResponse.json({
      ...profile,
      id: 'user-1',
      email: 'test@example.com',
    }),
  ),

  http.get('*/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      ...profile,
      id: id as string,
      email: 'test@example.com',
    });
  }),

  http.patch('*/users/:id', () => HttpResponse.json(profile)),

  http.delete('*/users/:id', () => HttpResponse.json({ success: true })),

  http.get('*/users/:username/showcase', () =>
    HttpResponse.json({
      id: 'mock-showcase-id',
      userId: 'user-1',
      hasVisibleWidgets: false,
      relationship: 'SELF',
      accentColor: '#6366f1',
      mediaItems: [],
      spotlightMedia: null,
      anthemTrack: null,
      activityStatus: null,
      connectedAccounts: null,
      privacyMeta: 'PUBLIC',
      privacyActivity: 'PUBLIC',
      privacyShowcase: 'PUBLIC',
      privacyLinks: 'PUBLIC',
      showAge: false,
      showBirthdate: false,
      showGender: false,
      showTimezone: false,
      birthDate: null,
      age: null,
      gender: null,
      pronouns: null,
      timezone: null,
      zodiacSign: null,
      widgetOrder: ['spotlight', 'media', 'meta'],
    }),
  ),

  http.get('*/showcase/*', () =>
    HttpResponse.json({
      id: 'mock-showcase-id',
      userId: 'user-1',
      hasVisibleWidgets: false,
      relationship: 'SELF',
      accentColor: '#6366f1',
      mediaItems: [],
      spotlightMedia: null,
      anthemTrack: null,
      activityStatus: null,
      connectedAccounts: null,
      privacyMeta: 'PUBLIC',
      privacyActivity: 'PUBLIC',
      privacyShowcase: 'PUBLIC',
      privacyLinks: 'PUBLIC',
      showAge: false,
      showBirthdate: false,
      showGender: false,
      showTimezone: false,
      birthDate: null,
      age: null,
      gender: null,
      pronouns: null,
      timezone: null,
      zodiacSign: null,
      widgetOrder: ['spotlight', 'media', 'meta'],
    }),
  ),

  http.get('https://api.github.com/repos/rakuzan-knu/social-network/pulls', () =>
    HttpResponse.json([]),
  ),
];
