import { test, expect, mockApi } from './fixtures';

const ME = { id: 'usr-me', username: 'mockme', displayName: 'Mock Me', avatar: null };
const BOB = { id: 'usr-bob', username: 'bob', displayName: 'Bob Mock', avatar: null };

const MOCK_MESSAGE = (id: string, body: string) => ({
  id,
  conversationId: 'conv-1',
  sender: BOB,
  body,
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt: new Date().toISOString(),
  editedAt: null,
});

const MOCK_CONVERSATION = {
  id: 'conv-1',
  type: 'DIRECT',
  name: null,
  avatar: null,
  description: null,
  createdById: null,
  participants: [
    {
      userId: ME.id,
      user: ME,
      nickname: null,
      role: 'MEMBER',
      theme: 'default',
      muteLevel: 'NONE',
      mutedUntil: null,
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      userId: BOB.id,
      user: BOB,
      nickname: null,
      role: 'MEMBER',
      theme: 'default',
      muteLevel: 'NONE',
      mutedUntil: null,
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
  lastMessage: MOCK_MESSAGE('msg-1', 'Hey there from the mocked chat!'),
  unreadCount: 1,
  myTheme: 'default',
  myMuteLevel: 'NONE',
  myNickname: null,
  isArchived: false,
  isPinned: false,
  blockedByMe: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  pinnedMessages: [],
};

test.describe('Chat (authenticated, mocked API)', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockApi(authenticatedPage, '/conversations', { json: [MOCK_CONVERSATION] });
    await mockApi(authenticatedPage, '/conversations/conv-1', { json: MOCK_CONVERSATION });
    await mockApi(authenticatedPage, '/conversations/conv-1/messages?**', {
      json: {
        data: [MOCK_MESSAGE('msg-1', 'Hey there from the mocked chat!')],
        hasMore: false,
        nextCursor: null,
      },
    });
  });

  test('renders the conversation list with mocked chat and last message preview', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/messages');

    await expect(page.getByText('Bob Mock').first()).toBeVisible();
    await expect(page.getByText('Hey there from the mocked chat!').first()).toBeVisible();
  });

  test('opens a conversation and renders its mocked messages', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/messages');

    await page.getByText('Bob Mock').first().click();

    await expect(page).toHaveURL(/\/messages\/conv-1$/);
    await expect(page.getByText('Hey there from the mocked chat!').first()).toBeVisible();
  });
});
