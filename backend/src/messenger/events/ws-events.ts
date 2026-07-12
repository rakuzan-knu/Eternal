export const WS_EVENTS = {
  JOIN_CONVERSATION: 'joinConversation',
  LEAVE_CONVERSATION: 'leaveConversation',
  TYPING_START: 'typingStart',
  TYPING_STOP: 'typingStop',
  MARK_READ: 'markRead',

  SEND_MESSAGE: 'sendMessage',
  RATE_LIMIT_EXCEEDED: 'rateLimitExceeded',

  NEW_MESSAGE: 'newMessage',
  MESSAGE_EDITED: 'messageEdited',
  MESSAGE_DELETED: 'messageDeleted',
  MESSAGE_REACTION_ADDED: 'messageReactionAdded',
  MESSAGE_REACTION_REMOVED: 'messageReactionRemoved',
  MESSAGE_READ: 'messageRead',
  MESSAGE_PINNED: 'messagePinned',
  MESSAGE_UNPINNED: 'messageUnpinned',
  TYPING: 'typing',
  CONVERSATION_UPDATED: 'conversationUpdated',
  PARTICIPANT_ADDED: 'participantAdded',
  PARTICIPANT_LEFT: 'participantLeft',
  // PARTICIPANT_PROMOTED: 'participantPromoted',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
} as const;

export type WsEventKey = keyof typeof WS_EVENTS;
export type WsEventValue = (typeof WS_EVENTS)[WsEventKey];
