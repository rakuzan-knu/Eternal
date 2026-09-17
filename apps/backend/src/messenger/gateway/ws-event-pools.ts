import { ObjectPool } from '../../common/pool';

export interface TypingEventPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface ReadReceiptPayload {
  conversationId: string;
  userId: string;
  messageId: string | null;
  readAt: string;
}

export interface GatewayEventWrapper {
  seq: number;
  event: string;
  payload: unknown;
  timestamp: number;
}

/**
 * Pre-allocated object pool for high-frequency Typing events.
 */
export const typingEventPool = new ObjectPool<TypingEventPayload>({
  name: 'TypingEventPool',
  initialCapacity: 32,
  maxCapacity: 1024,
  factory: () => ({
    conversationId: '',
    userId: '',
    isTyping: false,
  }),
  resetFn: (item) => {
    item.conversationId = '';
    item.userId = '';
    item.isTyping = false;
  },
});

/**
 * Pre-allocated object pool for high-frequency Read Receipt events.
 */
export const readReceiptPool = new ObjectPool<ReadReceiptPayload>({
  name: 'ReadReceiptPool',
  initialCapacity: 32,
  maxCapacity: 1024,
  factory: () => ({
    conversationId: '',
    userId: '',
    messageId: null,
    readAt: '',
  }),
  resetFn: (item) => {
    item.conversationId = '';
    item.userId = '';
    item.messageId = null;
    item.readAt = '';
  },
});

export interface GatewayEventWrapper {
  seq: number;
  event: string;
  payload: unknown;
  timestamp: number;
}

/**
 * Pre-allocated object pool for Sequence Buffer wrappers in emitToUser.
 */
export const gatewayWrapperPool = new ObjectPool<GatewayEventWrapper>({
  name: 'GatewayWrapperPool',
  initialCapacity: 64,
  maxCapacity: 2048,
  factory: () => ({
    seq: 0,
    event: '',
    payload: null,
    timestamp: 0,
  }),
  resetFn: (item) => {
    item.seq = 0;
    item.event = '';
    item.payload = null;
    item.timestamp = 0;
  },
});
