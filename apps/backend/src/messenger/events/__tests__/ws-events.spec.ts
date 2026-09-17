import { WS_EVENTS, type WsEventKey, type WsEventValue, type WsEventType } from '../ws-events';

describe('ws-events', () => {
  it('defines the expected WebSocket event constants', () => {
    expect(WS_EVENTS.JOIN_CONVERSATION).toBe('joinConversation');
    expect(WS_EVENTS.LEAVE_CONVERSATION).toBe('leaveConversation');
    expect(WS_EVENTS.TYPING_START).toBe('typingStart');
    expect(WS_EVENTS.TYPING_STOP).toBe('typingStop');
    expect(WS_EVENTS.TYPING).toBe('typing');
    expect(WS_EVENTS.MARK_READ).toBe('markRead');
    expect(WS_EVENTS.MESSAGE_READ).toBe('messageRead');
    expect(WS_EVENTS.USER_ONLINE).toBe('userOnline');
    expect(WS_EVENTS.USER_OFFLINE).toBe('userOffline');
    expect(WS_EVENTS.GET_ONLINE_STATUS).toBe('getOnlineStatus');
    expect(WS_EVENTS.RATE_LIMIT_EXCEEDED).toBe('rateLimitExceeded');
    expect(WS_EVENTS.SEND_MESSAGE).toBe('sendMessage');
    expect(WS_EVENTS.NEW_MESSAGE).toBe('newMessage');
    expect(WS_EVENTS.EDIT_MESSAGE).toBe('editMessage');
    expect(WS_EVENTS.MESSAGE_EDITED).toBe('messageEdited');
    expect(WS_EVENTS.DELETE_MESSAGE).toBe('deleteMessage');
    expect(WS_EVENTS.MESSAGE_DELETED).toBe('messageDeleted');
    expect(WS_EVENTS.FORWARD_MESSAGE).toBe('forwardMessage');
    expect(WS_EVENTS.ADD_REACTION).toBe('addReaction');
    expect(WS_EVENTS.MESSAGE_REACTION_ADDED).toBe('messageReactionAdded');
    expect(WS_EVENTS.REMOVE_REACTION).toBe('removeReaction');
    expect(WS_EVENTS.MESSAGE_REACTION_REMOVED).toBe('messageReactionRemoved');
    expect(WS_EVENTS.PIN_MESSAGE).toBe('pinMessage');
    expect(WS_EVENTS.MESSAGE_PINNED).toBe('messagePinned');
    expect(WS_EVENTS.UNPIN_MESSAGE).toBe('unpinMessage');
    expect(WS_EVENTS.MESSAGE_UNPINNED).toBe('messageUnpinned');
    expect(WS_EVENTS.CONVERSATION_UPDATED).toBe('conversationUpdated');
    expect(WS_EVENTS.CONVERSATION_DELETED).toBe('conversationDeleted');
    expect(WS_EVENTS.MESSAGES_CLEARED).toBe('messagesCleared');
    expect(WS_EVENTS.PARTICIPANT_ADDED).toBe('participantAdded');
    expect(WS_EVENTS.PARTICIPANT_LEFT).toBe('participantLeft');
    expect(WS_EVENTS.NEW_FOLLOWER).toBe('newFollower');
    expect(WS_EVENTS.SOCIAL_NOTIFICATION).toBe('socialNotification');
    expect(WS_EVENTS.GATEWAY_READY).toBe('gatewayReady');
    expect(WS_EVENTS.GATEWAY_RESUME).toBe('gatewayResume');
    expect(WS_EVENTS.GATEWAY_RESUMED).toBe('gatewayResumed');
    expect(WS_EVENTS.RESYNC_REQUIRED).toBe('resyncRequired');
    expect(WS_EVENTS.HEARTBEAT).toBe('heartbeat');
  });

  it('validates TypeScript types compile correctly', () => {
    const key: WsEventKey = 'SEND_MESSAGE';
    const val: WsEventValue = WS_EVENTS[key];
    const eventType: WsEventType = 'sendMessage';
    expect(val).toBe(eventType);
  });
});
