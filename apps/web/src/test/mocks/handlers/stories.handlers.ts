import { http, HttpResponse } from 'msw';

export const storiesHandlers = [
  http.get('*/stories/feed', () => {
    return HttpResponse.json([]);
  }),

  http.get('*/stories/user/:userId', () => {
    return HttpResponse.json(null);
  }),

  http.post('*/stories', () => {
    return HttpResponse.json({
      id: 'mock-story-1',
      authorId: 'u-1',
      mediaUrl: 'https://example.com/story.jpg',
      mediaType: 'IMAGE',
      caption: 'Mock Story',
      overlays: [],
      privacy: 'ALL_FOLLOWERS',
      createdAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
      viewsCount: 0,
      hasViewed: false,
      userReaction: null,
      reactionsCount: {},
      pollResult: null,
      author: {
        id: 'u-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
    });
  }),

  http.post('*/stories/:id/view', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('*/stories/:id/react', () => {
    return HttpResponse.json({ emoji: '🔥' });
  }),

  http.post('*/stories/:id/poll-vote', () => {
    return HttpResponse.json({
      question: 'Poll',
      totalVotes: 1,
      userVotedIndex: 0,
      options: [
        { text: 'Yes', voteCount: 1, percentage: 100 },
        { text: 'No', voteCount: 0, percentage: 0 },
      ],
    });
  }),

  http.post('*/stories/:id/reply', () => {
    return HttpResponse.json({
      conversationId: 'conv-1',
      message: { id: 'msg-1', body: 'Reply' },
    });
  }),

  http.get('*/stories/:id/viewers', () => {
    return HttpResponse.json({
      totalViews: 0,
      viewers: [],
    });
  }),

  http.delete('*/stories/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('*/stories/close-friends/list', () => {
    return HttpResponse.json([]);
  }),

  http.post('*/stories/close-friends/:friendId', () => {
    return HttpResponse.json({ isCloseFriend: true });
  }),
];
