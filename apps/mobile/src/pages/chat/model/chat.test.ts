import { expect, it } from 'vitest';
import type { ConversationPage, MessageView } from '@social-network/shared-contracts';
import {
  applyIncomingToConversations,
  conversationDisplay,
  flattenMessages,
  messageStatus,
  previewText,
  upsertMessage,
  type ChatMessage,
  type ConversationsData,
  type MessagesData,
} from './chat';

const user = (id: string, displayName: string | null = null) => ({
  id,
  username: id,
  displayName,
  avatar: null,
});
const message = (id: string, at: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversationId: 'c1',
  sender: user('bob'),
  body: id,
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt: new Date(at),
  editedAt: null,
  ...extra,
});
const page = (data: ChatMessage[]): MessagesData => ({
  pages: [{ data, hasMore: false, nextCursor: null }],
  pageParams: [undefined],
});

it('names direct chats after the other person and groups after their title', () => {
  const participants = [
    { userId: 'me', user: user('me'), nickname: null },
    { userId: 'bob', user: user('bob', 'Bob Stone'), nickname: null },
  ] as unknown as Parameters<typeof conversationDisplay>[0]['participants'];
  expect(
    conversationDisplay({ type: 'DIRECT', name: null, avatar: null, participants }, 'me'),
  ).toMatchObject({
    title: 'Bob Stone',
    peerUserId: 'bob',
    isGroup: false,
  });
  expect(
    conversationDisplay({ type: 'GROUP', name: ' ', avatar: null, participants }, 'me').title,
  ).toBe('Unnamed group');
});

it('keeps messages newest first and replaces the optimistic row on confirmation', () => {
  const pending = message('local-x', '2026-01-01T10:02:00Z', {
    clientMessageId: 'x',
    localStatus: 'sending',
    sender: user('me'),
  });
  const data = upsertMessage(page([message('m1', '2026-01-01T10:00:00Z')]), pending);
  expect(flattenMessages(data).map((m) => m.id)).toEqual(['local-x', 'm1']);
  const confirmed = message('m2', '2026-01-01T10:02:01Z', { sender: user('me') });
  const after = upsertMessage(data, confirmed, 'x');
  expect(flattenMessages(after).map((m) => m.id)).toEqual(['m2', 'm1']);
  expect(flattenMessages(upsertMessage(after, confirmed)).length).toBe(2);
});

it('derives delivery status from local state and read receipts', () => {
  expect(messageStatus(message('a', '2026-01-01', { localStatus: 'failed' }), 'me')).toBe('failed');
  expect(messageStatus(message('a', '2026-01-01', { readBy: ['me'] }), 'me')).toBe('sent');
  expect(messageStatus(message('a', '2026-01-01', { readBy: ['me', 'bob'] }), 'me')).toBe('read');
});

it('never previews ciphertext', () => {
  const envelope = JSON.stringify({ e2ee: true, v: 1, iv: 'AAAAAAAAAAAAAAAA', ct: 'abcd' });
  expect(previewText(message('a', '2026-01-01', { body: envelope }) as MessageView)).toBe(
    'Encrypted message',
  );
  expect(previewText(message('a', '2026-01-01', { body: 'hi\n  there' }) as MessageView)).toBe(
    'hi there',
  );
  expect(previewText(message('a', '2026-01-01', { isDeleted: true }) as MessageView)).toBe(
    'Message deleted',
  );
  expect(previewText(null)).toBe('No messages yet');
});

it('moves an active chat to the top and only counts unread for others while closed', () => {
  const convo = (id: string, unreadCount = 0) =>
    ({ id, unreadCount, lastMessage: null }) as unknown as ConversationPage['data'][number];
  const data: ConversationsData = {
    pages: [
      { data: [convo('c0'), convo('c1')], nextCursor: null, hasMore: false, order: 'activityAt' },
    ],
    pageParams: [undefined],
  };
  const incoming = message('m', '2026-01-01');
  const closed = applyIncomingToConversations(data, incoming, 'me', null);
  expect(closed?.pages[0]?.data.map((c) => [c.id, c.unreadCount])).toEqual([
    ['c1', 1],
    ['c0', 0],
  ]);
  const open = applyIncomingToConversations(data, incoming, 'me', 'c1');
  expect(open?.pages[0]?.data[0]?.unreadCount).toBe(0);
  const mine = applyIncomingToConversations(data, { ...incoming, sender: user('me') }, 'me', null);
  expect(mine?.pages[0]?.data[0]?.unreadCount).toBe(0);
});
