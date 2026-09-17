import { typingEventPool, readReceiptPool, gatewayWrapperPool } from '../ws-event-pools';

describe('ws-event-pools', () => {
  it('typingEventPool acquires and resets properly', () => {
    const item = typingEventPool.acquire();
    item.conversationId = 'conv-1';
    item.userId = 'user-1';
    item.isTyping = true;

    typingEventPool.release(item);

    expect(item.conversationId).toBe('');
    expect(item.userId).toBe('');
    expect(item.isTyping).toBe(false);
  });

  it('readReceiptPool acquires and resets properly', () => {
    const item = readReceiptPool.acquire();
    item.conversationId = 'conv-1';
    item.userId = 'user-1';
    item.messageId = 'msg-1';
    item.readAt = '2026-09-01T10:00:00.000Z';

    readReceiptPool.release(item);

    expect(item.conversationId).toBe('');
    expect(item.userId).toBe('');
    expect(item.messageId).toBeNull();
    expect(item.readAt).toBe('');
  });

  it('gatewayWrapperPool acquires and resets properly', () => {
    const item = gatewayWrapperPool.acquire();
    item.seq = 100;
    item.event = 'NEW_MESSAGE';
    item.payload = { test: true };
    item.timestamp = 12345678;

    gatewayWrapperPool.release(item);

    expect(item.seq).toBe(0);
    expect(item.event).toBe('');
    expect(item.payload).toBeNull();
    expect(item.timestamp).toBe(0);
  });
});
