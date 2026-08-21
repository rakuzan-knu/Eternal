import { http, HttpResponse } from 'msw';

const mockConversation = {
  id: 'c1',
  type: 'DIRECT',
  isArchived: false,
  participants: [
    {
      userId: 'u1',
      role: 'MEMBER',
      user: { id: 'u1', username: 'alice', displayName: 'Alice', avatar: null, isVerified: false },
    },
  ],
};

export const chatHandlers = [
  http.get('*/conversations/users/blocked', () => HttpResponse.json([])),

  http.get('*/conversations/:id/messages/search', () => HttpResponse.json([])),

  http.get('*/conversations/:id/messages/around/:messageId', () =>
    HttpResponse.json({ messages: [], data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/conversations/:id/messages', () =>
    HttpResponse.json({ messages: [], data: [], meta: { nextCursor: null, hasNextPage: false } }),
  ),

  http.get('*/conversations/:id', ({ params }) =>
    HttpResponse.json({
      ...mockConversation,
      id: params.id,
    }),
  ),

  http.get('*/conversations', () => HttpResponse.json([mockConversation])),

  http.post('*/conversations/direct', () => HttpResponse.json(mockConversation)),

  http.post('*/conversations/group', () =>
    HttpResponse.json({ ...mockConversation, type: 'GROUP' }),
  ),

  http.post('*/conversations/:id/messages', () =>
    HttpResponse.json({
      id: 'msg-1',
      conversationId: 'c1',
      senderId: 'u1',
      text: 'hello',
      createdAt: new Date().toISOString(),
    }),
  ),

  http.post('*/conversations/:id/messages/read', () => HttpResponse.json({ success: true })),

  http.post('*/conversations/:id/archive', () => HttpResponse.json({ success: true })),

  http.delete('*/conversations/:id/archive', () => HttpResponse.json({ success: true })),
];
