import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

const mockPosts = [
  {
    id: 1,
    authorId: 'user-1',
    author: 'Ayate',
    handle: 'my_profile',
    avatar: null,
    text: 'Thats fire!',
    createdAt: new Date().toISOString(),
    commentList: [
      { id: 10, author: 'Bob', handle: 'bob', text: 'Nice!', time: '1h' },
      { id: 11, author: 'Alice', handle: 'alice', text: 'Great!', time: '2h' },
    ],
    commentsCount: 2,
    comments: 2,
    likesCount: 5,
    likes: 5,
    isLiked: false,
    repostsCount: 1,
    reposts: 1,
    isReposted: false,
  },
  {
    id: 2,
    authorId: 'user-1',
    author: 'Ayate',
    handle: 'my_profile',
    avatar: null,
    text: 'Eternal CEO is here!',
    createdAt: new Date().toISOString(),
    commentList: [],
    commentsCount: 0,
    likesCount: 10,
    isLiked: false,
    repostsCount: 0,
    isReposted: false,
  },
];

const mockReposts = [
  {
    id: 3,
    authorId: 'other-user',
    author: 'Kolya',
    handle: 'kolya_dev',
    avatar: null,
    text: 'New update available!',
    createdAt: new Date().toISOString(),
    commentList: [],
    commentsCount: 0,
    likesCount: 2,
    isLiked: false,
    repostsCount: 3,
    isReposted: true,
  },
];

export const postsHandlers = [
  http.get(`${API_URL}/posts`, () =>
    HttpResponse.json({
      posts: mockPosts,
      nextCursor: null,
    }),
  ),

  http.post(`${API_URL}/posts`, () =>
    HttpResponse.json({
      id: 999,
      authorId: 'user-1',
      author: 'Ayate',
      handle: 'my_profile',
      avatar: null,
      text: 'New post',
      createdAt: new Date().toISOString(),
      commentList: [],
      commentsCount: 0,
      likesCount: 0,
      isLiked: false,
      repostsCount: 0,
      isReposted: false,
    }),
  ),

  http.get(`${API_URL}/users/:userId/posts`, () =>
    HttpResponse.json({
      posts: mockPosts,
      nextCursor: null,
    }),
  ),

  http.get(`${API_URL}/users/:userId/reposts`, () =>
    HttpResponse.json({
      posts: mockReposts,
      nextCursor: null,
    }),
  ),

  http.post(`${API_URL}/posts/:id/like`, () => HttpResponse.json({ success: true })),
  http.delete(`${API_URL}/posts/:id/like`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/posts/:id/repost`, () => HttpResponse.json({ success: true })),
  http.post(`${API_URL}/posts/:id/poll/vote`, () => HttpResponse.json({ success: true })),
  http.get(`${API_URL}/posts/:id/poll/voters`, () => HttpResponse.json([])),
];
