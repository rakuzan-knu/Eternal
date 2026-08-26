import { http, HttpResponse } from 'msw';

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
  http.get('*/posts/explore', () =>
    HttpResponse.json({
      posts: mockPosts,
      nextCursor: null,
    }),
  ),

  http.get('*/posts', () =>
    HttpResponse.json({
      posts: mockPosts,
      nextCursor: null,
    }),
  ),

  http.post('*/posts', () =>
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

  http.get('*/users/:userId/posts', () =>
    HttpResponse.json({
      posts: mockPosts,
      nextCursor: null,
    }),
  ),

  http.get('*/users/:userId/reposts', () =>
    HttpResponse.json({
      posts: mockReposts,
      nextCursor: null,
    }),
  ),

  http.post('*/posts/:id/like', () => HttpResponse.json({ success: true })),
  http.delete('*/posts/:id/like', () => HttpResponse.json({ success: true })),
  http.post('*/posts/:id/repost', () => HttpResponse.json({ success: true })),
  http.post('*/posts/:id/poll/vote', () => HttpResponse.json({ success: true })),
  http.get('*/posts/:id/poll/voters', () => HttpResponse.json([])),
  http.get('*/og-preview', () =>
    HttpResponse.json({
      title: 'Preview',
      description: 'Preview description',
      image: null,
      siteName: 'Example',
    }),
  ),
  http.get('*/messenger/link-preview', () =>
    HttpResponse.json({
      title: 'Preview',
      description: 'Preview description',
      image: null,
      siteName: 'Example',
    }),
  ),
  http.get('*/posts/:id', ({ params }) =>
    HttpResponse.json({
      ...mockPosts[0],
      id: params.id,
    }),
  ),
];
