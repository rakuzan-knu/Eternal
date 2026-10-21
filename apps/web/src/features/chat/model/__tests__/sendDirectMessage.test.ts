import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendDirectMessage } from '../sendDirectMessage';
import { chatApi } from '@/entities/chat';
import { encryptMessageForPeer, ensureMessageIdentityRegistered } from '../../lib/e2ee/messageE2ee';
import type { MessageView } from '@/entities/chat';

const confirmedMessage: MessageView = {
  id: 'message-1',
  conversationId: 'conversation-1',
  sender: { id: 'sender-1', username: 'sender', displayName: null, avatar: null },
  body: 'ciphertext',
  messageType: 'TEXT',
  replyTo: null,
  forwardedFrom: null,
  attachments: [],
  reactions: [],
  readBy: [],
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  createdAt: '2026-10-17T12:00:00.000Z',
  editedAt: null,
};

vi.mock('@/entities/chat', () => ({ chatApi: { sendMessage: vi.fn() } }));
vi.mock('../../lib/e2ee/messageE2ee', () => ({
  ensureMessageIdentityRegistered: vi.fn().mockResolvedValue(undefined),
  encryptMessageForPeer: vi.fn(),
}));
vi.mock('../../lib/e2ee/replayStore', () => ({ nextMessageSeq: () => 12 }));

describe('sendDirectMessage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends ciphertext over HTTP with the dialog binding and a deduplication id', async () => {
    vi.mocked(encryptMessageForPeer).mockResolvedValue('ciphertext');
    vi.mocked(chatApi.sendMessage).mockResolvedValue(confirmedMessage);
    await sendDirectMessage('conversation-1', 'peer-1', 'sender-1', 'Post link');
    expect(ensureMessageIdentityRegistered).toHaveBeenCalled();
    expect(encryptMessageForPeer).toHaveBeenCalledWith('Post link', 'peer-1', {
      conversationId: 'conversation-1',
      senderId: 'sender-1',
      seq: 12,
    });
    expect(chatApi.sendMessage).toHaveBeenCalledWith('conversation-1', {
      text: 'ciphertext',
      clientMessageId: expect.any(String),
    });
  });

  it('does not send when the encryption policy blocks a changed peer key', async () => {
    vi.mocked(encryptMessageForPeer).mockRejectedValue(new Error('Security key changed'));
    await expect(
      sendDirectMessage('conversation-1', 'peer-1', 'sender-1', 'Post link'),
    ).rejects.toThrow('Security key changed');
    expect(chatApi.sendMessage).not.toHaveBeenCalled();
  });

  it('preserves the messenger policy for peers without message keys', async () => {
    vi.mocked(encryptMessageForPeer).mockResolvedValue(null);
    vi.mocked(chatApi.sendMessage).mockResolvedValue(confirmedMessage);
    await sendDirectMessage('conversation-1', 'peer-1', 'sender-1', 'Post link');
    expect(chatApi.sendMessage).toHaveBeenCalledWith('conversation-1', {
      text: 'Post link',
      clientMessageId: expect.any(String),
    });
  });

  it('rejects failed delivery', async () => {
    vi.mocked(encryptMessageForPeer).mockResolvedValue('ciphertext');
    vi.mocked(chatApi.sendMessage).mockRejectedValue(new Error('Offline'));
    await expect(
      sendDirectMessage('conversation-1', 'peer-1', 'sender-1', 'Post link'),
    ).rejects.toThrow('Offline');
  });

  it('rejects a response without a persisted message id', async () => {
    vi.mocked(encryptMessageForPeer).mockResolvedValue('ciphertext');
    vi.mocked(chatApi.sendMessage).mockResolvedValue({ ...confirmedMessage, id: '' });
    await expect(
      sendDirectMessage('conversation-1', 'peer-1', 'sender-1', 'Post link'),
    ).rejects.toThrow('Message delivery was not confirmed.');
  });

  it('reuses a caller-provided id when retrying an uncertain delivery', async () => {
    vi.mocked(encryptMessageForPeer).mockResolvedValue('ciphertext');
    vi.mocked(chatApi.sendMessage)
      .mockRejectedValueOnce(new Error('Response timed out'))
      .mockResolvedValueOnce(confirmedMessage);
    const send = () =>
      sendDirectMessage('conversation-1', 'peer-1', 'sender-1', 'Post link', 'stable-id');
    await expect(send()).rejects.toThrow('Response timed out');
    await send();
    expect(chatApi.sendMessage).toHaveBeenNthCalledWith(1, 'conversation-1', {
      text: 'ciphertext',
      clientMessageId: 'stable-id',
    });
    expect(chatApi.sendMessage).toHaveBeenNthCalledWith(2, 'conversation-1', {
      text: 'ciphertext',
      clientMessageId: 'stable-id',
    });
  });
});
